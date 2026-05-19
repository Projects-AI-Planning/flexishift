import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors, spacing, radius, shadow} from '../../theme';
import Icon from '../../components/common/Icon';

type TabKey = 'available' | 'quotes' | 'mine';

interface ShiftItem {
  shiftId: string;
  shiftRef: string;
  requirementType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  hoursPerDay: number;
  pickupAddress?: string;
  dropAddress?: string;
  location?: string;
  notes?: string;
  dailyRate?: number;
  status: string;
  daysCompleted: number;
  selectedDriverId?: string;
}

interface ShiftQuoteItem {
  quoteId: string;
  shiftId: string;
  amountPerDay: number;
  totalAmount: number;
  status: string;
  notes?: string;
  createdAt?: string;
  shiftRef?: string;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  hoursPerDay?: number;
  pickupAddress?: string;
  dropAddress?: string;
  location?: string;
  shiftStatus?: string;
}

interface ShiftsScreenProps {
  availableShifts: ShiftItem[];
  myShifts: ShiftItem[];
  myShiftQuotes: ShiftQuoteItem[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onSubmitQuote: (shiftId: string, amountPerDay: number, notes: string) => Promise<void>;
  onWithdrawQuote: (shiftId: string) => Promise<void>;
  onCancelShift: (shiftId: string) => Promise<void>;
  // Document gate
  canBrowse?: boolean;
  documentState?: 'missing' | 'pending' | 'rejected';
  profileComplete?: boolean;
  onGoToDocuments?: () => void;
  onGoToProfile?: () => void;
}

const REQ_LABELS: Record<string, string> = {
  DRIVER_ONLY: 'Driver Only',
  TRUCK_WITH_DRIVER: 'Truck + Driver',
  TRUCK_ONLY: 'Truck Only',
};

const QUOTE_STATUS: Record<string, {label: string; bg: string; text: string; border: string}> = {
  PENDING:   {label: 'Quote Submitted', bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE'},
  ACCEPTED:  {label: 'Accepted',        bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC'},
  REJECTED:  {label: 'Not Selected',    bg: '#FEE2E2', text: '#DC2626', border: '#FECACA'},
  WITHDRAWN: {label: 'Withdrawn',       bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0'},
};

// ─── ShiftLockedView ─────────────────────────────────────────────────────────

function ShiftLockedView({
  documentState,
  profileComplete,
  onGoToDocuments,
  onGoToProfile,
}: {
  documentState: 'missing' | 'pending' | 'rejected';
  profileComplete: boolean;
  onGoToDocuments?: () => void;
  onGoToProfile?: () => void;
}) {
  const needsProfile = !profileComplete;
  const isRejected   = documentState === 'rejected';
  const isPending    = documentState === 'pending';
  const isMissing    = documentState === 'missing';

  const iconName = isRejected ? 'x-circle' as const : isMissing ? 'file' as const : 'lock' as const;
  const iconColor = colors.ink;
  const title  = isRejected
    ? 'Document Rejected'
    : isMissing
    ? needsProfile ? 'Complete Your Profile' : 'Upload Documents'
    : 'Under Verification';
  const body   = isRejected
    ? 'Your document was rejected by admin. Upload a corrected copy to start viewing and quoting on shifts.'
    : isMissing
    ? needsProfile
      ? 'Complete your driver profile, then upload your required documents. Shifts unlock after admin approval.'
      : 'Upload your required documents first. Shifts will unlock after admin approval.'
    : 'Your documents are under review. You will be notified once approved.';
  const btnText = needsProfile
    ? 'Complete Profile →'
    : isMissing || isRejected
    ? 'Upload Documents →'
    : 'View Documents';
  const onPress = needsProfile ? onGoToProfile : onGoToDocuments;

  return (
    <View style={styles.lockedWrap}>
      {/* Icon */}
      <View style={[
        styles.lockedIconCircle,
        isRejected && styles.lockedIconCircleRed,
        isPending  && styles.lockedIconCircleAmber,
      ]}>
        <Icon name={iconName} size={44} color={iconColor} strokeWidth={1.5} />
      </View>

      {/* Copy */}
      <Text style={styles.lockedTitle}>{title}</Text>
      <Text style={styles.lockedBody}>{body}</Text>

      {/* Status pill */}
      <View style={[
        styles.lockedPill,
        isRejected && styles.lockedPillRed,
        isPending  && styles.lockedPillAmber,
      ]}>
        <Text style={[
          styles.lockedPillText,
          isRejected && styles.lockedPillTextRed,
          isPending  && styles.lockedPillTextAmber,
        ]}>
          {isRejected ? 'Action Required' : isMissing ? 'Documents Missing' : 'Pending Approval'}
        </Text>
      </View>

      {/* CTA */}
      {onPress ? (
        <Pressable onPress={onPress} style={styles.lockedBtn}>
          <Text style={styles.lockedBtnText}>{btnText}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.lockedNote}>
        My Quotes and My Shifts remain accessible below.
      </Text>
    </View>
  );
}

// ─── ShiftCard (Available tab) ────────────────────────────────────────────────

function ShiftCard({
  shift,
  myQuote,
  onQuote,
  onWithdraw,
  onCancel,
  isMine,
}: {
  shift: ShiftItem;
  myQuote?: ShiftQuoteItem;
  onQuote?: (shift: ShiftItem) => void;
  onWithdraw?: (shiftId: string) => void;
  onCancel?: (shiftId: string) => void;
  isMine: boolean;
}) {
  const qStatus = myQuote?.status?.toUpperCase();
  const qCfg = qStatus ? QUOTE_STATUS[qStatus] : null;
  const canQuote = !isMine && shift.status === 'OPEN' &&
    (!qStatus || qStatus === 'REJECTED' || qStatus === 'WITHDRAWN');
  const canCancel = isMine && !['COMPLETED', 'CANCELLED'].includes(shift.status);
  const progress = shift.totalDays > 0 ? shift.daysCompleted / shift.totalDays : 0;

  return (
    <View style={[styles.card, qStatus === 'ACCEPTED' && styles.cardAccepted]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={{flex: 1}}>
          <Text style={styles.shiftRef}>{shift.shiftRef}</Text>
          {shift.pickupAddress ? (
            <View style={styles.routeBox}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, {backgroundColor: '#1066B1'}]} />
                <Text style={styles.routeText} numberOfLines={1}>{shift.pickupAddress}</Text>
              </View>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, {backgroundColor: colors.accent}]} />
                <Text style={styles.routeText} numberOfLines={1}>{shift.dropAddress}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.locationText}>{shift.location}</Text>
          )}
        </View>
        {/* Right: quote status or OPEN badge */}
        {qCfg ? (
          <View style={[styles.statusPill, {backgroundColor: qCfg.bg, borderColor: qCfg.border}]}>
            <Text style={[styles.statusPillText, {color: qCfg.text}]}>{qCfg.label}</Text>
          </View>
        ) : !isMine ? (
          <View style={[styles.statusPill, {backgroundColor: '#ECFDF5', borderColor: '#A7F3D0'}]}>
            <Text style={[styles.statusPillText, {color: '#059669'}]}>OPEN</Text>
          </View>
        ) : (
          <View style={[styles.statusPill, {
            backgroundColor: shift.status === 'COMPLETED' ? '#F1F5F9' :
              shift.status === 'IN_PROGRESS' ? '#FFFBEB' : '#DBEAFE',
            borderColor: shift.status === 'COMPLETED' ? '#E2E8F0' :
              shift.status === 'IN_PROGRESS' ? '#FDE68A' : '#BFDBFE',
          }]}>
            <Text style={[styles.statusPillText, {
              color: shift.status === 'COMPLETED' ? '#64748B' :
                shift.status === 'IN_PROGRESS' ? '#D97706' : '#1D4ED8',
            }]}>
              {shift.status.replace(/_/g, ' ')}
            </Text>
          </View>
        )}
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaChipWrap}>
          <Icon name="calendar" size={11} color={colors.inkSoft} />
          <Text style={styles.metaChipText}>{shift.startDate} → {shift.endDate}</Text>
        </View>
        <View style={styles.metaChipWrap}>
          <Icon name="clock" size={11} color={colors.inkSoft} />
          <Text style={styles.metaChipText}>{shift.totalDays}d · {shift.hoursPerDay}h/day</Text>
        </View>
        <Text style={styles.metaChip}>{REQ_LABELS[shift.requirementType] ?? shift.requirementType}</Text>
      </View>

      {/* Quote amount if submitted */}
      {myQuote && (
        <View style={styles.quoteAmountBox}>
          <Text style={styles.quoteAmountLabel}>Your quote</Text>
          <View style={styles.quoteAmountRow}>
            <Text style={styles.quoteAmount}>₹{myQuote.amountPerDay.toLocaleString()}/day</Text>
            <Text style={styles.quoteDivider}>·</Text>
            <Text style={styles.quoteTotal}>Total ₹{myQuote.totalAmount.toLocaleString()}</Text>
          </View>
        </View>
      )}

      {/* Listed rate */}
      {shift.dailyRate && !myQuote ? (
        <Text style={styles.listedRate}>Listed rate: ₹{shift.dailyRate.toLocaleString()}/day</Text>
      ) : null}

      {/* Progress bar for booked shifts */}
      {isMine && shift.totalDays > 0 && (
        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>{shift.daysCompleted}/{shift.totalDays} days completed</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {width: `${progress * 100}%` as any}]} />
          </View>
        </View>
      )}

      {/* Accepted banner */}
      {qStatus === 'ACCEPTED' && (
        <View style={styles.acceptedBanner}>
          <Icon name="check-circle" size={20} color="#1066B1" />
          <View style={{flex: 1}}>
            <Text style={styles.acceptedBannerTitle}>Your quote was accepted!</Text>
            <Text style={styles.acceptedBannerSub}>This shift now appears under My Shifts.</Text>
          </View>
        </View>
      )}

      {shift.notes ? <Text style={styles.notesText}>{shift.notes}</Text> : null}

      {/* Actions */}
      {(canQuote || (qStatus === 'PENDING' && onWithdraw) || canCancel) ? (
        <View style={styles.actionRow}>
          {canQuote && onQuote && (
            <Pressable onPress={() => onQuote(shift)} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Submit Quote</Text>
            </Pressable>
          )}
          {qStatus === 'PENDING' && onWithdraw && (
            <Pressable onPress={() => onWithdraw(shift.shiftId)} style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>Withdraw</Text>
            </Pressable>
          )}
          {canCancel && onCancel && (
            <Pressable onPress={() => onCancel(shift.shiftId)} style={styles.dangerBtn}>
              <Text style={styles.dangerBtnText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ─── QuoteCard (My Quotes tab) ────────────────────────────────────────────────

function QuoteCard({
  quote,
  onWithdraw,
}: {
  quote: ShiftQuoteItem;
  onWithdraw: (shiftId: string) => void;
}) {
  const statusUpper = (quote.status ?? '').toUpperCase();
  const isPending  = statusUpper === 'PENDING';
  const isAccepted = statusUpper === 'ACCEPTED';
  const isRejected = statusUpper === 'REJECTED';
  const cfg = QUOTE_STATUS[statusUpper] ?? {label: statusUpper, bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0'};

  return (
    <View style={[styles.card, isAccepted && styles.cardAccepted]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{flex: 1}}>
          <Text style={styles.shiftRef}>{quote.shiftRef ?? `Shift #${quote.shiftId.slice(-6)}`}</Text>
          {quote.pickupAddress ? (
            <View style={styles.locationRow}>
              <Icon name="map" size={12} color={colors.inkSoft} />
              <Text style={[styles.locationText, {flex: 1}]} numberOfLines={1}>
                {quote.pickupAddress} → {quote.dropAddress}
              </Text>
            </View>
          ) : quote.location ? (
            <View style={styles.locationRow}>
              <Icon name="map" size={12} color={colors.inkSoft} />
              <Text style={[styles.locationText, {flex: 1}]} numberOfLines={1}>{quote.location}</Text>
            </View>
          ) : null}
          {quote.createdAt ? (
            <Text style={styles.submittedAt}>
              Submitted {new Date(quote.createdAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
        <View style={[styles.statusPill, {backgroundColor: cfg.bg, borderColor: cfg.border}]}>
          <Text style={[styles.statusPillText, {color: cfg.text}]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Dates + meta */}
      {(quote.startDate || quote.totalDays) ? (
        <View style={styles.metaRow}>
          {quote.startDate ? (
            <View style={styles.metaChipWrap}>
              <Icon name="calendar" size={11} color={colors.inkSoft} />
              <Text style={styles.metaChipText}>{quote.startDate} → {quote.endDate}</Text>
            </View>
          ) : null}
          {quote.totalDays ? (
            <View style={styles.metaChipWrap}>
              <Icon name="clock" size={11} color={colors.inkSoft} />
              <Text style={styles.metaChipText}>{quote.totalDays}d{quote.hoursPerDay ? ` · ${quote.hoursPerDay}h/day` : ''}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Amounts */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Daily Rate</Text>
          <Text style={styles.statValue}>₹{quote.amountPerDay.toLocaleString()}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Amount</Text>
          <Text style={styles.statValue}>₹{quote.totalAmount.toLocaleString()}</Text>
        </View>
        {quote.totalDays ? (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Days</Text>
              <Text style={styles.statValue}>{quote.totalDays}</Text>
            </View>
          </>
        ) : null}
      </View>

      {quote.notes ? (
        <Text style={styles.notesText}>"{quote.notes}"</Text>
      ) : null}

      {/* Accepted banner */}
      {isAccepted && (
        <View style={styles.acceptedBanner}>
          <Icon name="check-circle" size={20} color="#1066B1" />
          <View style={{flex: 1}}>
            <Text style={styles.acceptedBannerTitle}>Your quote was accepted!</Text>
            <Text style={styles.acceptedBannerSub}>This shift now appears under My Shifts.</Text>
          </View>
        </View>
      )}

      {/* Rejected banner */}
      {isRejected && (
        <View style={styles.rejectedBanner}>
          <Icon name="x-circle" size={16} color="#DC2626" />
          <View style={{flex: 1}}>
            <Text style={styles.rejectedTitle}>Not selected</Text>
            <Text style={styles.rejectedSub}>The haulier chose a different driver.</Text>
          </View>
        </View>
      )}

      {/* Pending: withdraw */}
      {isPending && (
        <Pressable onPress={() => onWithdraw(quote.shiftId)} style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>Withdraw Quote</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── QuoteModal ───────────────────────────────────────────────────────────────

function QuoteModal({
  shift,
  loading,
  onSubmit,
  onClose,
}: {
  shift: ShiftItem;
  loading: boolean;
  onSubmit: (amountPerDay: number, notes: string) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const total = amount ? (Number(amount) * shift.totalDays).toLocaleString() : '—';

  return (
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={{width: '100%', alignItems: 'center'}}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Submit Quote</Text>
          <Text style={styles.modalSub}>{shift.shiftRef} · {shift.totalDays} day(s)</Text>

          <Text style={styles.inputLabel}>Daily Rate (₹)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Enter your daily rate"
            placeholderTextColor={colors.inkSoft}
            autoFocus
          />
          {amount ? (
            <Text style={styles.totalPreview}>Total: ₹{total} for {shift.totalDays} days</Text>
          ) : null}

          <Text style={styles.inputLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, {height: 72, textAlignVertical: 'top'}]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any availability details, vehicle info…"
            placeholderTextColor={colors.inkSoft}
            multiline
          />

          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const amt = Number(amount);
                if (!amt || amt <= 0) {
                  Alert.alert('Required', 'Please enter a valid daily rate');
                  return;
                }
                onSubmit(amt, notes.trim());
              }}
              disabled={loading}
              style={[styles.primaryBtn, {flex: 2, height: 52}, loading && {opacity: 0.5}]}>
              <Text style={styles.primaryBtnText}>{loading ? 'Submitting…' : 'Submit Quote'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ShiftsScreen: React.FC<ShiftsScreenProps> = ({
  availableShifts,
  myShifts,
  myShiftQuotes,
  loading,
  actionLoading,
  error,
  refreshing,
  onRefresh,
  onSubmitQuote,
  onWithdrawQuote,
  onCancelShift,
  canBrowse = true,
  documentState = 'missing',
  profileComplete = true,
  onGoToDocuments,
  onGoToProfile,
}) => {
  const [tab, setTab] = useState<TabKey>('available');
  const [quotingShift, setQuotingShift] = useState<ShiftItem | null>(null);

  // Build a map: shiftId → quote for quick lookup on available cards
  const quoteByShiftId = React.useMemo(() => {
    const map: Record<string, ShiftQuoteItem> = {};
    for (const q of myShiftQuotes) {
      map[q.shiftId] = q;
    }
    return map;
  }, [myShiftQuotes]);

  const handleSubmitQuote = async (amountPerDay: number, notes: string) => {
    if (!quotingShift) {return;}
    await onSubmitQuote(quotingShift.shiftId, amountPerDay, notes);
    setQuotingShift(null);
  };

  const handleWithdraw = (shiftId: string) => {
    Alert.alert(
      'Withdraw Quote',
      'Are you sure you want to withdraw your quote for this shift?',
      [
        {text: 'Keep It', style: 'cancel'},
        {text: 'Withdraw', style: 'destructive', onPress: () => onWithdrawQuote(shiftId)},
      ],
    );
  };

  const handleCancelShift = (shiftId: string) => {
    Alert.alert(
      'Cancel Shift',
      'Are you sure you want to cancel this shift booking?',
      [
        {text: 'Keep It', style: 'cancel'},
        {text: 'Cancel Shift', style: 'destructive', onPress: () => onCancelShift(shiftId)},
      ],
    );
  };

  const pendingQuotes = myShiftQuotes.filter(q => q.status?.toUpperCase() === 'PENDING');

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab('available')}
          style={[styles.tabBtn, tab === 'available' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'available' && styles.tabTextActive]}>
            Available
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('quotes')}
          style={[styles.tabBtn, tab === 'quotes' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'quotes' && styles.tabTextActive]}>
            My Quotes{pendingQuotes.length > 0 ? ` (${pendingQuotes.length})` : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('mine')}
          style={[styles.tabBtn, tab === 'mine' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>
            My Shifts{myShifts.length > 0 ? ` (${myShifts.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          showsVerticalScrollIndicator={false}>

          {/* ── Available Tab ─────────────────────────────────────────────── */}
          {tab === 'available' && (
            <>
              {!canBrowse ? (
                <ShiftLockedView
                  documentState={documentState}
                  profileComplete={profileComplete}
                  onGoToDocuments={onGoToDocuments}
                  onGoToProfile={onGoToProfile}
                />
              ) : (
                <>
                  <Text style={styles.screenTitle}>Available Shifts</Text>
                  {availableShifts.length === 0 ? (
                    <View style={styles.emptyWrap}>
                      <Icon name="clipboard" size={48} color={colors.ink} strokeWidth={1.3} />
                      <Text style={styles.emptyTitle}>No shifts available right now</Text>
                      <Text style={styles.emptyBody}>Hauliers post shifts here. Pull down to refresh.</Text>
                    </View>
                  ) : (
                    availableShifts.map(shift => (
                      <ShiftCard
                        key={shift.shiftId}
                        shift={shift}
                        myQuote={quoteByShiftId[shift.shiftId]}
                        isMine={false}
                        onQuote={setQuotingShift}
                        onWithdraw={handleWithdraw}
                      />
                    ))
                  )}
                </>
              )}
            </>
          )}

          {/* ── My Quotes Tab ─────────────────────────────────────────────── */}
          {tab === 'quotes' && (
            <>
              <Text style={styles.screenTitle}>My Shift Quotes</Text>
              {myShiftQuotes.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Icon name="pen" size={48} color={colors.ink} strokeWidth={1.3} />
                  <Text style={styles.emptyTitle}>No quotes submitted yet</Text>
                  <Text style={styles.emptyBody}>
                    Browse Available Shifts and submit a quote. It will appear here once submitted.
                  </Text>
                </View>
              ) : (
                myShiftQuotes.map(quote => (
                  <QuoteCard
                    key={quote.quoteId}
                    quote={quote}
                    onWithdraw={handleWithdraw}
                  />
                ))
              )}
            </>
          )}

          {/* ── My Shifts Tab ─────────────────────────────────────────────── */}
          {tab === 'mine' && (
            <>
              <Text style={styles.screenTitle}>My Booked Shifts</Text>
              {myShifts.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Icon name="truck" size={48} color={colors.ink} strokeWidth={1.3} />
                  <Text style={styles.emptyTitle}>No booked shifts yet</Text>
                  <Text style={styles.emptyBody}>
                    When a haulier accepts your quote, the shift appears here.
                  </Text>
                </View>
              ) : (
                myShifts.map(shift => (
                  <ShiftCard
                    key={shift.shiftId}
                    shift={shift}
                    isMine={true}
                    onCancel={handleCancelShift}
                  />
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {quotingShift && (
        <QuoteModal
          shift={quotingShift}
          loading={actionLoading}
          onSubmit={handleSubmitQuote}
          onClose={() => setQuotingShift(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {borderBottomColor: colors.accent},
  tabText: {color: colors.inkSoft, fontWeight: '800', fontSize: 13},
  tabTextActive: {color: colors.navy},

  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    margin: spacing.md,
    padding: spacing.md,
  },
  errorText: {color: colors.danger, fontWeight: '700', fontSize: 13},

  loaderWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {flex: 1},
  listContent: {padding: spacing.md, paddingBottom: 100, gap: spacing.sm},

  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.sm,
  },

  // ── Locked state ──────────────────────────────────────────────────────────
  lockedWrap: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  lockedIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EAF3FD',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lockedIconCircleRed:   {backgroundColor: '#FEE2E2', borderColor: '#FECACA'},
  lockedIconCircleAmber: {backgroundColor: '#FFFBEB', borderColor: '#FDE68A'},
  lockedTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  lockedBody: {
    color: colors.inkSoft,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  lockedPill: {
    backgroundColor: '#DBEAFE',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  lockedPillRed:   {backgroundColor: '#FEE2E2', borderColor: '#FECACA'},
  lockedPillAmber: {backgroundColor: '#FFFBEB', borderColor: '#FDE68A'},
  lockedPillText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockedPillTextRed:   {color: '#DC2626'},
  lockedPillTextAmber: {color: '#D97706'},
  lockedBtn: {
    width: '100%',
    backgroundColor: '#1066B1',
    borderRadius: radius.lg,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: '#1066B1',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  lockedBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},
  lockedNote: {
    color: colors.inkSoft,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  emptyWrap: {alignItems: 'center', paddingTop: 56, paddingHorizontal: spacing.xl, gap: spacing.sm},
  emptyTitle: {color: colors.navy, fontSize: 18, fontWeight: '900', textAlign: 'center'},
  emptyBody: {color: colors.inkSoft, fontSize: 14, lineHeight: 20, textAlign: 'center'},

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccepted: {
    borderColor: '#1066B1',
    borderWidth: 1.5,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  shiftRef: {color: colors.navy, fontSize: 16, fontWeight: '900', marginBottom: 4},

  routeBox: {gap: 4, marginTop: 2},
  routeRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  routeDot: {width: 8, height: 8, borderRadius: 4, flexShrink: 0},
  routeText: {flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700'},

  locationText: {color: colors.inkSoft, fontSize: 12, fontWeight: '600'},
  locationRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},

  statusPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusPillText: {fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3},

  metaRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  metaChip: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaChipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaChipText: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '700',
  },

  quoteAmountBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quoteAmountLabel: {color: '#1D4ED8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2},
  quoteAmountRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  quoteAmount: {color: '#1D4ED8', fontSize: 15, fontWeight: '900'},
  quoteDivider: {color: '#93C5FD', fontWeight: '700'},
  quoteTotal: {color: '#1E40AF', fontSize: 13, fontWeight: '700'},

  listedRate: {color: colors.accent, fontWeight: '800', fontSize: 13},

  progressWrap: {gap: 4},
  progressLabel: {color: colors.inkSoft, fontSize: 11, fontWeight: '700'},
  progressTrack: {height: 6, backgroundColor: '#E5E9F0', borderRadius: 999, overflow: 'hidden'},
  progressFill: {height: '100%', backgroundColor: '#1066B1', borderRadius: 999},

  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  acceptedBannerTitle: {color: '#1066B1', fontSize: 13, fontWeight: '900'},
  acceptedBannerSub: {color: '#1E40AF', fontSize: 11, marginTop: 1},

  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectedTitle: {color: '#DC2626', fontSize: 13, fontWeight: '900'},
  rejectedSub: {color: '#7F1D1D', fontSize: 11, marginTop: 1},

  notesText: {color: colors.inkSoft, fontSize: 12, fontStyle: 'italic', lineHeight: 17},

  submittedAt: {color: colors.inkSoft, fontSize: 11, marginTop: 2},

  actionRow: {flexDirection: 'row', gap: spacing.sm, marginTop: 2},
  primaryBtn: {
    flex: 1,
    backgroundColor: '#1066B1',
    borderRadius: radius.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {color: '#fff', fontWeight: '900', fontSize: 13},
  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {color: colors.inkSoft, fontWeight: '800', fontSize: 13},
  dangerBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: radius.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {color: colors.danger, fontWeight: '800', fontSize: 13},

  // ── Stats row (quote card) ─────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFD',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: {flex: 1, alignItems: 'center'},
  statDivider: {width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm},
  statLabel: {color: colors.inkSoft, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2},
  statValue: {color: colors.navy, fontSize: 14, fontWeight: '900'},

  // ── Quote modal ───────────────────────────────────────────────────────────
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 22, 39, 0.7)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modal: {
    width: '100%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: spacing.sm,
  },
  modalTitle: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  modalSub: {color: colors.inkSoft, fontSize: 13, fontWeight: '700'},
  inputLabel: {color: colors.navy, fontSize: 13, fontWeight: '800', marginTop: spacing.xs},
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.navy,
    fontWeight: '700',
  },
  totalPreview: {
    color: '#1066B1',
    fontWeight: '900',
    fontSize: 13,
    marginTop: -spacing.xs,
  },
  modalActions: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {color: colors.inkSoft, fontWeight: '800', fontSize: 14},
});

export default ShiftsScreen;
