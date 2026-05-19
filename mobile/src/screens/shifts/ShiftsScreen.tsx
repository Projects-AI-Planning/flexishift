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
import {colors, spacing, radius} from '../../theme';

type TabKey = 'available' | 'mine';

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

interface ShiftsScreenProps {
  availableShifts: ShiftItem[];
  myShifts: ShiftItem[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onSubmitQuote: (shiftId: string, amountPerDay: number, notes: string) => Promise<void>;
  onWithdrawQuote: (shiftId: string) => Promise<void>;
  onCancelShift: (shiftId: string) => Promise<void>;
}

const REQ_LABELS: Record<string, string> = {
  DRIVER_ONLY: 'Driver Only',
  TRUCK_WITH_DRIVER: 'Truck + Driver',
  TRUCK_ONLY: 'Truck Only',
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: colors.success,
  BOOKED: colors.accent,
  IN_PROGRESS: '#F59E0B',
  COMPLETED: colors.inkSoft,
  CANCELLED: colors.danger,
};

function ShiftCard({
  shift,
  isMine,
  onQuote,
  onCancel,
}: {
  shift: ShiftItem;
  isMine: boolean;
  onQuote?: (shift: ShiftItem) => void;
  onCancel?: (shiftId: string) => void;
}) {
  const statusColor = STATUS_COLOR[shift.status] ?? colors.inkSoft;
  const canCancel = isMine && !['COMPLETED', 'CANCELLED'].includes(shift.status);
  const progress = shift.totalDays > 0 ? shift.daysCompleted / shift.totalDays : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={{flex: 1}}>
          <Text style={styles.shiftRef}>{shift.shiftRef}</Text>
          {shift.pickupAddress ? (
            <>
              <Text style={styles.locationRow}>📍 {shift.pickupAddress}</Text>
              <Text style={styles.locationRow}>🏁 {shift.dropAddress}</Text>
            </>
          ) : (
            <Text style={styles.location}>{shift.location}</Text>
          )}
          <Text style={styles.meta}>
            {shift.startDate} → {shift.endDate}  ·  {shift.totalDays} day(s)  ·  {shift.hoursPerDay}h/day
          </Text>
          <Text style={styles.reqBadge}>{REQ_LABELS[shift.requirementType] ?? shift.requirementType}</Text>
        </View>
        <View style={styles.statusWrap}>
          <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
          <Text style={[styles.statusText, {color: statusColor}]}>{shift.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      {shift.dailyRate ? (
        <Text style={styles.rate}>₹{shift.dailyRate.toLocaleString()}/day</Text>
      ) : null}

      {isMine && shift.totalDays > 0 && (
        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>{shift.daysCompleted}/{shift.totalDays} days completed</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {width: `${progress * 100}%` as any}]} />
          </View>
        </View>
      )}

      {shift.notes ? <Text style={styles.notes}>{shift.notes}</Text> : null}

      <View style={styles.actionRow}>
        {!isMine && shift.status === 'OPEN' && onQuote && (
          <Pressable onPress={() => onQuote(shift)} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Submit Quote</Text>
          </Pressable>
        )}
        {canCancel && onCancel && (
          <Pressable onPress={() => onCancel(shift.shiftId)} style={styles.dangerBtn}>
            <Text style={styles.dangerBtnText}>Cancel</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} style={{width: '100%', alignItems: 'center'}}>
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
            <Text style={styles.totalPreview}>Total: ₹{total}</Text>
          ) : null}

          <Text style={styles.inputLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, {height: 72, textAlignVertical: 'top'}]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any availability details…"
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
              style={[styles.submitBtn, loading && {opacity: 0.5}]}>
              <Text style={styles.submitBtnText}>{loading ? 'Submitting…' : 'Submit Quote'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const ShiftsScreen: React.FC<ShiftsScreenProps> = ({
  availableShifts,
  myShifts,
  loading,
  actionLoading,
  error,
  refreshing,
  onRefresh,
  onSubmitQuote,
  onWithdrawQuote,
  onCancelShift,
}) => {
  const [tab, setTab] = useState<TabKey>('available');
  const [quotingShift, setQuotingShift] = useState<ShiftItem | null>(null);

  const handleSubmitQuote = async (amountPerDay: number, notes: string) => {
    if (!quotingShift) {return;}
    await onSubmitQuote(quotingShift.shiftId, amountPerDay, notes);
    setQuotingShift(null);
  };

  const handleCancel = (shiftId: string) => {
    Alert.alert(
      'Cancel Shift',
      'Are you sure you want to cancel this shift booking?',
      [
        {text: 'Keep It', style: 'cancel'},
        {text: 'Cancel Shift', style: 'destructive', onPress: () => onCancelShift(shiftId)},
      ],
    );
  };

  const list = tab === 'available' ? availableShifts : myShifts;

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab('available')}
          style={[styles.tabBtn, tab === 'available' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'available' && styles.tabTextActive]}>
            Available
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

          <Text style={styles.screenTitle}>
            {tab === 'available' ? 'Available Shifts' : 'My Booked Shifts'}
          </Text>

          {list.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>
                {tab === 'available' ? 'No shifts available right now' : 'No booked shifts yet'}
              </Text>
              <Text style={styles.emptyBody}>
                {tab === 'available'
                  ? 'Hauliers post shifts here. Pull down to refresh.'
                  : 'When a haulier accepts your quote, the shift will appear here.'}
              </Text>
            </View>
          ) : (
            list.map(shift => (
              <ShiftCard
                key={shift.shiftId}
                shift={shift}
                isMine={tab === 'mine'}
                onQuote={tab === 'available' ? setQuotingShift : undefined}
                onCancel={tab === 'mine' ? handleCancel : undefined}
              />
            ))
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
    paddingHorizontal: spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {borderBottomColor: colors.accent},
  tabText: {color: colors.inkSoft, fontWeight: '800', fontSize: 14},
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
  listContent: {padding: spacing.md, paddingBottom: 80},
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  emptyWrap: {alignItems: 'center', paddingTop: 48, gap: spacing.sm},
  emptyIcon: {fontSize: 48},
  emptyTitle: {color: colors.navy, fontSize: 18, fontWeight: '900', textAlign: 'center'},
  emptyBody: {color: colors.inkSoft, fontSize: 14, lineHeight: 20, textAlign: 'center'},

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTopRow: {flexDirection: 'row', gap: spacing.sm},
  shiftRef: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  location: {color: colors.navy, fontSize: 14, fontWeight: '700', marginTop: 2},
  locationRow: {color: colors.navy, fontSize: 12, fontWeight: '600', marginTop: 2},
  meta: {color: colors.inkSoft, fontSize: 12, fontWeight: '600', marginTop: 3},
  reqBadge: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusWrap: {alignItems: 'flex-end', gap: 4},
  statusDot: {width: 8, height: 8, borderRadius: 4},
  statusText: {fontSize: 11, fontWeight: '900'},
  rate: {color: colors.accent, fontWeight: '900', fontSize: 14, marginTop: spacing.sm},
  progressWrap: {marginTop: spacing.sm},
  progressLabel: {color: colors.inkSoft, fontSize: 11, fontWeight: '700', marginBottom: 4},
  progressTrack: {
    height: 6,
    backgroundColor: '#E5E9F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1066B1',
    borderRadius: 999,
  },
  notes: {color: colors.inkSoft, fontSize: 12, marginTop: spacing.sm, lineHeight: 17},
  actionRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
  primaryBtn: {
    flex: 1,
    backgroundColor: '#1066B1',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {color: '#fff', fontWeight: '800', fontSize: 13},
  dangerBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {color: colors.danger, fontWeight: '800', fontSize: 13},

  // Modal
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
  },
  modalTitle: {color: colors.navy, fontSize: 20, fontWeight: '900', marginBottom: 4},
  modalSub: {color: colors.inkSoft, fontSize: 13, fontWeight: '700', marginBottom: spacing.md},
  inputLabel: {color: colors.navy, fontSize: 13, fontWeight: '800', marginBottom: 6},
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.navy,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  totalPreview: {
    color: '#1066B1',
    fontWeight: '900',
    fontSize: 13,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  modalActions: {flexDirection: 'row', gap: spacing.sm, marginTop: 4},
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {color: colors.inkSoft, fontWeight: '800', fontSize: 14},
  submitBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1066B1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {color: '#fff', fontWeight: '900', fontSize: 15},
});

export default ShiftsScreen;
