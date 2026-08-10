import React, {useEffect, useRef, useState} from 'react';
import {fmtMoney} from '../../utils/currency';
import {driverApi} from '../../api/driverApi';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {colors, radius, spacing, shadow} from '../../theme';

function DeliverByPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const [step, setStep] = useState<'idle' | 'date' | 'time'>('idle');
  // pendingDate holds the date chosen in step 1 so step 2 can use it without stale closure
  const pendingDateRef = React.useRef<Date>(new Date());

  const parsed = value ? new Date(value) : null;

  const displayLabel = parsed
    ? parsed.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) +
      '  ' +
      parsed.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: true})
    : 'Set deliver by date & time';

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setStep('idle');
    if (!selected) {return;}
    // Store the picked date; carry over existing time if already set
    const base = parsed ? new Date(parsed) : new Date();
    base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    pendingDateRef.current = base;
    // Delay opening time picker so Android can fully dismiss the date dialog first
    setTimeout(() => setStep('time'), 50);
  };

  const onTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    setStep('idle');
    if (!selected) {return;}
    const base = new Date(pendingDateRef.current);
    base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    // Send full UTC ISO (e.g. "2026-06-10T08:30:00.000Z") so backend stores correct UTC
    onChange(base.toISOString());
  };

  const pickerValue = step === 'time' ? pendingDateRef.current : (parsed ?? new Date());

  return (
    <View>
      <Pressable
        onPress={() => {
          pendingDateRef.current = parsed ?? new Date();
          setStep('date');
        }}
        style={styles.deliverByBtn}>
        <Text style={[styles.deliverByBtnText, !parsed && {color: '#94A3B8'}]}>
          📅  {displayLabel}
        </Text>
      </Pressable>
      {step === 'date' && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={Platform.OS === 'android' ? 'default' : 'spinner'}
          minimumDate={new Date()}
          onChange={onDateChange}
          themeVariant="light"
          textColor="#0F172A"
          accentColor="#1066B1"
          style={Platform.OS === 'ios' ? styles.iosSpinner : undefined}
        />
      )}
      {step === 'time' && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          display={Platform.OS === 'android' ? 'default' : 'spinner'}
          is24Hour={false}
          onChange={onTimeChange}
          themeVariant="light"
          textColor="#0F172A"
          accentColor="#1066B1"
          style={Platform.OS === 'ios' ? styles.iosSpinner : undefined}
        />
      )}
    </View>
  );
}

interface MyQuotesScreenProps {
  quotes: any[];
  refreshing: boolean;
  onRefresh: () => void;
  onProceedToCompliance: (jobId: string, jobReference?: string, quoteAmount?: number, currency?: string) => void;
  onWithdrawQuote: (quoteId: string) => Promise<void>;
  onEditQuote?: (quoteId: string, newAmount: number, notes: string, deliverBy: string) => Promise<void>;
  onResubmitQuote?: (jobId: string, newAmount: number, notes: string, deliverBy: string) => Promise<void>;
  onViewQuoteStatus?: (quote: Record<string, unknown>) => void;
  highlightedJobId?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:    'Pending',
  PENDING:   'Pending',
  ACCEPTED:  'Accepted',
  BOOKED:    'Accepted',
  DECLINED:  'Declined',
  WITHDRAWN: 'Withdrawn',
};

function JobQuoteCard({
  item,
  highlightedJobId,
  onWithdrawQuote,
  onEditQuote,
  onResubmitQuote,
  onProceedToCompliance,
  onViewQuoteStatus,
  onRefresh,
}: {
  item: any;
  highlightedJobId?: string | null;
  onWithdrawQuote: (quoteId: string) => void;
  onEditQuote?: (quoteId: string, newAmount: number, notes: string, deliverBy: string) => Promise<void>;
  onResubmitQuote?: (jobId: string, newAmount: number, notes: string, deliverBy: string) => Promise<void>;
  onProceedToCompliance: (jobId: string, jobReference?: string, quoteAmount?: number, currency?: string) => void;
  onViewQuoteStatus?: (quote: Record<string, unknown>) => void;
  onRefresh?: () => void;
}) {
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDeliverBy, setEditDeliverBy] = useState('');
  const [resubmitAmount, setResubmitAmount] = useState('');
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [resubmitDeliverBy, setResubmitDeliverBy] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [resubmitMode, setResubmitMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [handover, setHandover] = useState<{driverSigned?: boolean; haulierSigned?: boolean} | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');

  const statusUpper = (item.status ?? '').toUpperCase();
  const isAccepted   = statusUpper === 'ACCEPTED' || statusUpper === 'BOOKED' || statusUpper === 'SELECTED';
  const isPending    = statusUpper === 'ACTIVE'   || statusUpper === 'PENDING';
  const isDeclined   = statusUpper === 'DECLINED';
  const isWithdrawn  = statusUpper === 'WITHDRAWN';
  const jobId        = String(item.jobId ?? '');
  const isHighlighted = !!highlightedJobId && jobId === highlightedJobId;

  // For accepted jobs, poll handover status + job status so we can show the right
  // waiting state (handover approval, or payment release once delivery is submitted).
  useEffect(() => {
    if (!isAccepted || !jobId) { return; }
    let cancelled = false;
    const load = () => {
      driverApi.compliance.getHandoverStatus(jobId)
        .then((s: any) => { if (!cancelled) { setHandover({driverSigned: !!s?.driverSigned, haulierSigned: !!s?.haulierSigned}); } })
        .catch(() => undefined);
      driverApi.jobs.getDetails(jobId)
        .then((j: any) => { if (!cancelled) { setJobStatus(String(j?.status ?? '').toUpperCase()); } })
        .catch(() => undefined);
    };
    load();
    const timer = setInterval(load, 5000);  // poll so states clear as the haulier acts
    return () => { cancelled = true; clearInterval(timer); };
  }, [isAccepted, jobId]);

  const awaitingHaulierHandover = !!(handover?.driverSigned && !handover?.haulierSigned);
  // Driver finished the job (delivery submitted) but the haulier hasn't released payment yet.
  const awaitingPaymentRelease = jobStatus === 'DELIVERY_SUBMITTED';

  // Once the haulier releases payment (job COMPLETED/RELEASED/PAID), this quote belongs
  // in history — refresh the list so it drops out of "My Quotes".
  const refreshedOnDone = useRef(false);
  useEffect(() => {
    const done = ['COMPLETED', 'PAYMENT_RELEASED', 'RELEASED', 'PAID', 'DONE'].includes(jobStatus);
    if (done && !refreshedOnDone.current) {
      refreshedOnDone.current = true;
      onRefresh?.();
    }
  }, [jobStatus, onRefresh]);

  const jobDatePassed = (() => {
    const jd: string | null = item.job?.jobDate ?? item.jobDate ?? null;
    if (!jd) {return false;}
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(String(jd).slice(0, 10) + 'T00:00:00');
    return d < today;
  })();
  const pickupLocation = item.pickupLocation ?? item.job?.pickupLocation ?? null;
  const dropLocation   = item.dropLocation   ?? item.job?.dropLocation   ?? null;

  const handleSaveEdit = async () => {
    const amount = Number(editAmount);
    if (!amount || amount <= 0 || !onEditQuote) {return;}
    setSaving(true);
    try {
      await onEditQuote(item.quoteId, amount, editNotes, editDeliverBy);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResubmit = async () => {
    const amount = Number(resubmitAmount);
    if (!amount || amount <= 0 || !onResubmitQuote) {return;}
    setSaving(true);
    try {
      await onResubmitQuote(jobId, amount, resubmitNotes, resubmitDeliverBy);
      setResubmitMode(false);
    } finally {
      setSaving(false);
    }
  };

  return (
      <View style={[
        styles.card,
        isAccepted && styles.cardAccepted,
        isHighlighted && styles.cardHighlighted,
      ]}>
        {isHighlighted && (
          <View style={styles.highlightBanner}>
            <Text style={styles.highlightBannerText}>From Upcoming Schedule</Text>
          </View>
        )}
        {/* Top row: ref + status badge */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.jobRef} numberOfLines={1}>
              {item.jobReference ?? item.jobRef ?? `Job #${jobId.slice(-6)}`}
            </Text>
            <Text style={styles.submittedAt}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            isAccepted                    ? styles.badgeGreen :
            isDeclined || isWithdrawn     ? styles.badgeRed   :
            styles.badgeGrey,
          ]}>
            <Text style={[
              styles.statusText,
              isAccepted                    ? styles.statusTextGreen :
              isDeclined || isWithdrawn     ? styles.statusTextRed   :
              styles.statusTextGrey,
            ]}>
              {STATUS_LABELS[statusUpper] ?? item.status}
            </Text>
          </View>
        </View>

        {/* Route */}
        {(pickupLocation || dropLocation) ? (
          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotGreen]} />
            <Text style={styles.routeText} numberOfLines={1}>{pickupLocation ?? '—'}</Text>
            <Text style={styles.routeArrow}>→</Text>
            <View style={[styles.dot, styles.dotAmber]} />
            <Text style={styles.routeText} numberOfLines={1}>{dropLocation ?? '—'}</Text>
          </View>
        ) : null}

        {/* Bid amount + job date */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Your Quote</Text>
            <Text style={styles.statValue}>
              {fmtMoney(Number(item.quoteAmount ?? item.amount ?? 0), item.currency)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Job Date</Text>
            <Text style={styles.statValue}>{item.job?.jobDate ?? item.jobDate ?? 'TBC'}</Text>
          </View>
        </View>

        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>"{item.notes}"</Text>
        ) : null}

        {/* Accepted — Proceed to Compliance + View notification */}
        {isAccepted && (
          <View style={styles.acceptedSection}>
            <View style={styles.acceptedBanner}>
              <Text style={styles.acceptedBannerIcon}>🎉</Text>
              <View style={{flex: 1}}>
                <Text style={styles.acceptedBannerTitle}>Your quote was accepted!</Text>
                {false && <Text style={styles.acceptedBannerSub}>
                  Proceed to verify the load code at pickup.
                </Text>}
              </View>
            </View>
            {awaitingPaymentRelease ? (
              <View style={styles.awaitingHandoverBanner}>
                <Text style={styles.awaitingHandoverText}>
                  ⏳  Waiting for payment release from haulier
                </Text>
              </View>
            ) : awaitingHaulierHandover ? (
              <View style={styles.awaitingHandoverBanner}>
                <Text style={styles.awaitingHandoverText}>
                  ⏳  Waiting for haulier approval on handover
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => onProceedToCompliance(
                  jobId,
                  item.jobReference ?? item.jobRef ?? undefined,
                  Number(item.quoteAmount ?? item.amount ?? 0) || undefined,
                  String(item.currency ?? 'USD'),
                )}
                style={styles.complianceBtn}>
                <Text style={styles.complianceBtnText}>Open Pickup Steps →</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Declined */}
        {isDeclined && (
          <View style={styles.declinedSection}>
            <View style={styles.declinedBanner}>
              <Text style={styles.declinedIcon}>❌</Text>
              <View style={{flex: 1}}>
                <Text style={styles.declinedTitle}>Quote not selected</Text>
                <Text style={styles.declinedSub}>Haulier chose a different driver.</Text>
              </View>
            </View>
            {onViewQuoteStatus && (
              <Pressable
                onPress={() => onViewQuoteStatus(item)}
                style={styles.viewNotifBtn}>
                <Text style={styles.viewNotifText}>See Similar Jobs</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Pending — Edit + Withdraw */}
        {isPending && !jobDatePassed && (
          <View style={styles.actionRow}>
            {editMode ? (
              <View style={{gap: 8}}>
                <TextInput
                  style={styles.editInput}
                  keyboardType="numeric"
                  placeholder="New quote amount"
                  placeholderTextColor="#94A3B8"
                  value={editAmount}
                  onChangeText={setEditAmount}
                />
                <TextInput
                  style={[styles.editInput, {minHeight: 60}]}
                  placeholder="Notes (optional)"
                  placeholderTextColor="#94A3B8"
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                />
                <DeliverByPicker value={editDeliverBy} onChange={setEditDeliverBy} />
                <View style={{flexDirection: 'row', gap: 8}}>
                  <Pressable
                    onPress={handleSaveEdit}
                    disabled={saving || !editAmount}
                    style={[styles.editSaveBtn, (!editAmount || saving) && {opacity: 0.5}]}>
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.editSaveBtnText}>Save Changes</Text>}
                  </Pressable>
                  <Pressable onPress={() => setEditMode(false)} style={styles.editCancelBtn}>
                    <Text style={styles.editCancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{gap: 8}}>
                {onEditQuote && (
                  <Pressable
                    onPress={() => {
                      setEditAmount(String(item.quoteAmount ?? item.amount ?? ''));
                      setEditNotes(String(item.notes ?? ''));
                      setEditDeliverBy(item.deliverBy ?? '');
                      setEditMode(true);
                    }}
                    style={styles.editBtn}>
                    <Text style={styles.editBtnText}>✏️  Edit Quote</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => onWithdrawQuote(item.quoteId)}
                  style={styles.withdrawBtn}>
                  <Text style={styles.withdrawBtnText}>Withdraw Quote</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        {isPending && jobDatePassed && (
          <Text style={styles.expiredNote}>⏰  Job Date Passed — no actions available.</Text>
        )}

        {/* Withdrawn — Re-submit */}
        {isWithdrawn && !jobDatePassed && onResubmitQuote && (
          <View style={styles.actionRow}>
            {resubmitMode ? (
              <View style={{gap: 8}}>
                <TextInput
                  style={styles.editInput}
                  keyboardType="numeric"
                  placeholder="Quote amount"
                  placeholderTextColor="#94A3B8"
                  value={resubmitAmount}
                  onChangeText={setResubmitAmount}
                />
                <TextInput
                  style={[styles.editInput, {minHeight: 60}]}
                  placeholder="Notes (optional)"
                  placeholderTextColor="#94A3B8"
                  value={resubmitNotes}
                  onChangeText={setResubmitNotes}
                  multiline
                />
                <DeliverByPicker value={resubmitDeliverBy} onChange={setResubmitDeliverBy} />
                <View style={{flexDirection: 'row', gap: 8}}>
                  <Pressable
                    onPress={handleSaveResubmit}
                    disabled={saving || !resubmitAmount}
                    style={[styles.resubmitSaveBtn, (!resubmitAmount || saving) && {opacity: 0.5}]}>
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.resubmitSaveBtnText}>Submit Quote</Text>}
                  </Pressable>
                  <Pressable onPress={() => setResubmitMode(false)} style={styles.editCancelBtn}>
                    <Text style={styles.editCancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setResubmitMode(true)}
                style={styles.resubmitBtn}>
                <Text style={styles.resubmitBtnText}>↩  Re-submit Quote</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
  );
}

const MyQuotesScreen: React.FC<MyQuotesScreenProps> = ({
  quotes,
  refreshing,
  onRefresh,
  onProceedToCompliance,
  onWithdrawQuote,
  onEditQuote,
  onResubmitQuote,
  onViewQuoteStatus,
  highlightedJobId,
}) => {
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!highlightedJobId || !quotes.length) return;
    const index = quotes.findIndex(q => String(q.jobId ?? '') === highlightedJobId);
    if (index < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({index, animated: true, viewPosition: 0.2});
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightedJobId, quotes]);

  const handleWithdraw = (quoteId: string) => {
    Alert.alert('Withdraw Quote', 'Are you sure you want to withdraw this quote?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Withdraw', style: 'destructive', onPress: () => onWithdrawQuote(quoteId)},
    ]);
  };

  return (
    <FlatList
      ref={listRef}
      data={quotes}
      renderItem={({item}) => (
        <JobQuoteCard
          item={item}
          highlightedJobId={highlightedJobId}
          onWithdrawQuote={handleWithdraw}
          onEditQuote={onEditQuote}
          onResubmitQuote={onResubmitQuote}
          onProceedToCompliance={onProceedToCompliance}
          onViewQuoteStatus={onViewQuoteStatus}
          onRefresh={onRefresh}
        />
      )}
      keyExtractor={item => item.quoteId ?? String(Math.random())}
      style={styles.screen}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onScrollToIndexFailed={() => {}}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>✍️</Text>
          <Text style={styles.emptyTitle}>No Active Quotes</Text>
          <Text style={styles.emptySub}>
            Go to Find Jobs to place your first quote.
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bg},
  listContent: {
    padding: spacing.xl,
    paddingBottom: 120,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccepted: {
    borderColor: '#1066B1',
    borderWidth: 2,
  },
  cardHighlighted: {
    borderColor: '#1066B1',
    borderWidth: 2,
    backgroundColor: '#EBF4FF',
  },
  highlightBanner: {
    backgroundColor: '#1066B1',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  highlightBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  jobRef: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  submittedAt: {
    color: colors.inkSoft,
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGreen: {backgroundColor: '#DBEAFE'},
  badgeRed:   {backgroundColor: '#FEE2E2'},
  badgeGrey:  {backgroundColor: '#F1F5F9'},
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextGreen: {color: '#1066B1'},
  statusTextRed:   {color: '#B91C1C'},
  statusTextGrey:  {color: '#64748B'},
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFD',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  dotGreen: {backgroundColor: '#1066B1'},
  dotAmber: {backgroundColor: colors.accent},
  routeText: {
    flex: 1,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  routeArrow: {
    color: colors.inkSoft,
    fontSize: 12,
    flexShrink: 0,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFD',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statBox: {flex: 1},
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  statLabel: {
    color: colors.inkSoft,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  statValue: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
  },
  notesText: {
    color: colors.inkSoft,
    fontSize: 13,
    fontStyle: 'italic',
  },
  acceptedSection: {
    gap: spacing.md,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  acceptedBannerIcon: {fontSize: 24},
  acceptedBannerTitle: {
    color: '#1066B1',
    fontSize: 14,
    fontWeight: '900',
  },
  acceptedBannerSub: {
    color: '#166534',
    fontSize: 12,
    marginTop: 2,
  },
  complianceBtn: {
    backgroundColor: '#1066B1',
    borderRadius: radius.lg,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  complianceBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  awaitingHandoverBanner: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.lg,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  awaitingHandoverText: {
    color: '#A16207',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  actionRow: {
    marginTop: 2,
  },
  withdrawBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawBtnDisabled: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
  },
  withdrawBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  withdrawBtnTextDisabled: {
    color: '#94A3B8',
  },
  expiredNote: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  viewNotifBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewNotifText: {color: colors.accent, fontSize: 13, fontWeight: '800'},
  declinedSection: {gap: spacing.sm},
  declinedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#FEF2F2', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: '#FECACA',
  },
  declinedIcon: {fontSize: 20},
  declinedTitle: {color: '#B91C1C', fontSize: 13, fontWeight: '900'},
  declinedSub: {color: '#7F1D1D', fontSize: 11, marginTop: 2},
  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
    gap: spacing.md,
  },
  emptyIcon: {fontSize: 56},
  emptyTitle: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
  },
  emptySub: {
    color: colors.inkSoft,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.navy,
    backgroundColor: '#F8FAFD',
  },
  editBtn: {
    borderWidth: 1, borderColor: '#1066B1',
    borderRadius: radius.md, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  editBtnText: {color: '#1066B1', fontSize: 13, fontWeight: '800'},
  editSaveBtn: {
    flex: 1, backgroundColor: '#1066B1',
    borderRadius: radius.md, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  editSaveBtnText: {color: '#fff', fontSize: 13, fontWeight: '800'},
  editCancelBtn: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  editCancelBtnText: {color: colors.inkSoft, fontSize: 13, fontWeight: '700'},
  resubmitBtn: {
    borderWidth: 1, borderColor: '#059669',
    borderRadius: radius.md, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F0FBF4',
  },
  resubmitBtnText: {color: '#059669', fontSize: 13, fontWeight: '800'},
  resubmitSaveBtn: {
    flex: 1, backgroundColor: '#059669',
    borderRadius: radius.md, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  resubmitSaveBtnText: {color: '#fff', fontSize: 13, fontWeight: '800'},
  iosSpinner: {
    height: 200,
    backgroundColor: '#FFFFFF',
  },
  deliverByBtn: {
    borderWidth: 1,
    borderColor: '#1066B1',
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#EFF6FF',
  },
  deliverByBtnText: {
    color: '#1066B1',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default MyQuotesScreen;
