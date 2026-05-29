import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AppInput from '../../components/common/AppInput';
import {colors, radius, spacing, shadow} from '../../theme';

function fmtDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function calcStopEtas(deliverBy: Date, numStops: number, durationMin: number | null): string[] {
  if (numStops === 0) return [];
  const totalSegments = numStops + 1;
  const durationMs = (durationMin ?? totalSegments * 30) * 60 * 1000;
  const startMs = deliverBy.getTime() - durationMs;
  return Array.from({length: numStops}, (_, i) => {
    const etaMs = startMs + ((i + 1) / totalSegments) * durationMs;
    return fmtDateTime(new Date(etaMs));
  });
}

function formatDriverRequirement(value?: string | null): string {
  switch ((value ?? '').toUpperCase()) {
    case 'DRIVER_ONLY':      return 'Driver Only';
    case 'TRUCK_ONLY':       return 'Truck Only';
    case 'DRIVER_WITH_TRUCK':
    default:                 return 'Driver with Truck';
  }
}

interface JobDetailScreenProps {
  job: any;
  onSubmitQuote: (amount: string, notes: string, deliverBy?: string, stopEtas?: Array<{order: number; eta: string}>) => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
  isApplied?: boolean;
}

const InfoRow = ({label, value}: {label: string; value: string}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
  </View>
);

const JobDetailScreen: React.FC<JobDetailScreenProps> = ({
  job,
  onSubmitQuote,
  onBack,
  loading,
  error,
  isApplied = false,
}) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [deliverByTime, setDeliverByTime] = useState<Date | null>(null);
  const [deliverByError, setDeliverByError] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<'date' | 'time'>('date');
  const [pickerTemp, setPickerTemp] = useState<Date>(new Date());

  const openPicker = () => {
    setPickerTemp(deliverByTime ?? new Date());
    setPickerStep('date');
    setShowTimePicker(true);
  };

  const onPickerChange = (_evt: DateTimePickerEvent, selected?: Date) => {
    if (!selected) { setShowTimePicker(false); return; }
    if (Platform.OS === 'ios') {
      setDeliverByTime(selected);
      return;
    }
    if (pickerStep === 'date') {
      setPickerTemp(selected);
      setPickerStep('time');
    } else {
      const combined = new Date(pickerTemp);
      combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDeliverByTime(combined);
      setShowTimePicker(false);
    }
  };

  const pickup = job?.pickupLocation ?? job?.pickupAddress ?? '';
  const drop = job?.dropLocation ?? job?.dropAddress ?? '';
  const jobRef = job?.jobReference ?? job?.jobRef ?? 'Job';
  const goodsType = job?.goodsType ?? 'General Goods';
  const jobDate = job?.jobDate ?? '';
  const distance = job?.distanceKm ? `${job.distanceKm} km` : '';
  const totalCapacity = job?.totalCapacity ? `${job.totalCapacity} L` : '';
  const compartmentCount = job?.compartments ? `${job.compartments}` : '';
  const timeSlot = job?.timeSlot ? String(job.timeSlot).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '';
  const specialInstructions = job?.specialInstructions ?? '';
  const stops: Array<{address: string; order: number; goods_type?: string; litres?: number; deliveryTime?: string; isFinalDestination?: boolean}> = Array.isArray(job?.stops)
    ? job.stops.filter((s: any) => !s.isFinalDestination)
    : [];
  const compartmentDetails: Array<{compartment: number; contents: string; quantity: number; unit: string; stopLabel?: string}> =
    Array.isArray(job?.compartmentDetails) ? job.compartmentDetails : [];
  const totalLitres = job?.totalLitres ? `${job.totalLitres} L` : '';
  const durationMin: number | null = job?.durationMin ?? null;
  const vehicleType: string = job?.vehicleTypeRequired ?? '';
  const weightKg: number | null = job?.weightKg ?? null;

  const stopEtas = useMemo(
    () => deliverByTime ? calcStopEtas(deliverByTime, stops.length, durationMin) : [],
    [deliverByTime, stops.length, durationMin],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* Job header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.jobRef}>{jobRef}</Text>
          <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>OPEN</Text>
          </View>
        </View>
        <View style={styles.routeRow}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, styles.dotGreen]} />
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeValue}>{pickup}</Text>
            </View>
          </View>
          {stops.map((stop, idx) => (
            <React.Fragment key={stop.order ?? idx}>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.dot, styles.dotStop]}>
                  <Text style={styles.stopNumber}>{idx + 1}</Text>
                </View>
                <View style={styles.routeTextWrap}>
                  <Text style={styles.routeLabel}>STOP {idx + 1}</Text>
                  <Text style={styles.routeValue}>{stop.address}</Text>
                  {stopEtas[idx] ? (
                    <Text style={styles.stopEtaBadge}>ETA  {stopEtas[idx]}</Text>
                  ) : stop.deliveryTime ? (
                    <Text style={styles.routeSubValue}>Est. {stop.deliveryTime}</Text>
                  ) : null}
                </View>
              </View>
            </React.Fragment>
          ))}
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, styles.dotAccent]} />
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>DROP-OFF</Text>
              <Text style={styles.routeValue}>{drop}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailCard}>
        <Text style={styles.sectionTitle}>Job Details</Text>
        <InfoRow label="Goods Type" value={goodsType} />
        <InfoRow label="Requirement" value={formatDriverRequirement(job?.driverRequirement)} />
        {vehicleType ? <InfoRow label="Vehicle Type" value={vehicleType} /> : null}
        <InfoRow label="Job Date" value={jobDate} />
        {timeSlot ? <InfoRow label="Collection Time" value={timeSlot} /> : null}
        <InfoRow label="Distance" value={distance} />
        {durationMin != null ? (
          <InfoRow label="Est. Duration" value={`${Math.round(durationMin / 60 * 10) / 10} hrs`} />
        ) : null}
        {weightKg != null ? <InfoRow label="Weight" value={`${weightKg} kg`} /> : null}
        {totalCapacity ? <InfoRow label="Total Capacity" value={totalCapacity} /> : null}
        {compartmentCount ? <InfoRow label="Compartments" value={compartmentCount} /> : null}
        {totalLitres ? <InfoRow label="Total Litres" value={totalLitres} /> : null}
        {specialInstructions ? <InfoRow label="Special Instructions" value={specialInstructions} /> : null}
      </View>

      {/* Compartment breakdown */}
      {compartmentDetails.length > 0 && (
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Compartment Breakdown</Text>
          {compartmentDetails.map((c, i) => (
            <View key={i} style={styles.compartmentRow}>
              <View style={styles.compartmentBadge}>
                <Text style={styles.compartmentBadgeText}>{c.compartment ?? i + 1}</Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.compartmentContents}>{c.contents || '—'}</Text>
                <Text style={styles.compartmentMeta}>
                  {Number(c.quantity).toLocaleString()} {c.unit}
                  {c.stopLabel ? `  ·  ${c.stopLabel}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Bid form / Applied status */}
      {isApplied ? (
        <View style={styles.appliedCard}>
          <View style={styles.appliedIconCircle}>
            <Text style={styles.appliedCheckmark}>✓</Text>
          </View>
          <Text style={styles.appliedTitle}>Quote Already Submitted</Text>
          <Text style={styles.appliedText}>
            You have already placed a quote on this job. You can track its status in My Quotes.
          </Text>
        </View>
      ) : (
        <View style={styles.bidCard}>
          <Text style={styles.sectionTitle}>Place Your Quote</Text>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <AppInput
            label="Quote Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter your price"
            keyboardType="numeric"
          />
          <AppInput
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes for the haulier..."
            multiline
            numberOfLines={3}
            containerStyle={{marginBottom: 0}}
          />

          {/* Deliver By date & time (required) */}
          <View style={styles.deliverByRow}>
            <Text style={styles.deliverByLabel}>
              Deliver By <Text style={styles.deliverByRequired}>*</Text>
            </Text>
            <Pressable
              onPress={() => { openPicker(); setDeliverByError(false); }}
              style={[styles.deliverByBtn, deliverByError && styles.deliverByBtnError]}>
              <Text style={[styles.deliverByBtnText, !deliverByTime && styles.deliverByBtnPlaceholder]}>
                {deliverByTime ? fmtDateTime(deliverByTime) : 'Select date & time'}
              </Text>
              <Text style={styles.deliverByClock}>⏱</Text>
            </Pressable>
            {deliverByTime && (
              <Pressable onPress={() => setDeliverByTime(null)} style={styles.deliverByClear}>
                <Text style={styles.deliverByClearText}>✕</Text>
              </Pressable>
            )}
          </View>
          {deliverByError && (
            <Text style={styles.deliverByErrorText}>Please select a delivery date & time.</Text>
          )}
          {showTimePicker && (
            <>
              <DateTimePicker
                value={Platform.OS === 'android' && pickerStep === 'time' ? pickerTemp : (deliverByTime ?? new Date())}
                mode={Platform.OS === 'ios' ? 'datetime' : pickerStep}
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPickerChange}
              />
              {Platform.OS === 'ios' && (
                <Pressable onPress={() => setShowTimePicker(false)} style={styles.pickerDoneBtn}>
                  <Text style={styles.pickerDoneBtnText}>Done</Text>
                </Pressable>
              )}
            </>
          )}
          {stopEtas.length > 0 && (
            <View style={styles.etaSummary}>
              <Text style={styles.etaSummaryTitle}>Calculated Stop ETAs</Text>
              {stops.map((stop, idx) => (
                <View key={idx} style={styles.etaSummaryRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.etaSummaryStopLabel}>Stop {idx + 1}</Text>
                    {stop.address ? <Text style={styles.etaSummaryStopAddr}>{stop.address}</Text> : null}
                  </View>
                  <Text style={styles.etaSummaryEta}>{stopEtas[idx]}</Text>
                </View>
              ))}
              {deliverByTime && (
                <View style={[styles.etaSummaryRow, styles.etaSummaryFinal]}>
                  <View style={{flex: 1}}>
                    <Text style={styles.etaSummaryStopLabel}>Final Delivery</Text>
                    {drop ? <Text style={styles.etaSummaryStopAddr}>{drop}</Text> : null}
                  </View>
                  <Text style={styles.etaSummaryEta}>{fmtDateTime(deliverByTime)}</Text>
                </View>
              )}
            </View>
          )}

          <Pressable
            onPress={() => {
              if (!deliverByTime) { setDeliverByError(true); return; }
              onSubmitQuote(
                amount,
                notes,
                deliverByTime.toISOString(),
                stops.map((s, i) => ({order: s.order ?? i + 1, eta: stopEtas[i] ?? ''})),
              );
            }}
            style={[styles.bidButton, (!amount || !deliverByTime || loading) && styles.bidButtonDisabled]}
            disabled={!amount || !deliverByTime || loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.bidButtonText}>Submit Quote →</Text>
            )}
          </Pressable>
        </View>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  headerCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  jobRef: {
    color: colors.card,
    fontSize: 20,
    fontWeight: '900',
  },
  openBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  openBadgeText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
  },
  routeRow: {
    gap: spacing.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  routeTextWrap: {
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotGreen: {
    backgroundColor: '#1066B1',
  },
  dotAccent: {
    backgroundColor: colors.accent,
  },
  dotStop: {
    backgroundColor: '#F59E0B',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 2,
  },
  stopNumber: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 5,
  },
  routeLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeValue: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  routeSubValue: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  compartmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  compartmentBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EAF3FD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  compartmentBadgeText: {color: '#1066B1', fontSize: 11, fontWeight: '900'},
  compartmentContents: {color: '#041627', fontSize: 13, fontWeight: '700'},
  compartmentMeta: {color: '#64748B', fontSize: 11, fontWeight: '600', marginTop: 1},
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  infoValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  bidCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#F8FAFD',
  },
  textArea: {
    minHeight: 90,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  appliedCard: {
    backgroundColor: '#EBF3FB',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    gap: spacing.md,
  },
  appliedIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1066B1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appliedCheckmark: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  appliedTitle: {
    color: '#1066B1',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  appliedText: {
    color: '#1E3A5F',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  bidButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bidButtonDisabled: {
    opacity: 0.5,
  },
  bidButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  stopEtaBadge: {
    color: '#1066B1',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
    backgroundColor: 'rgba(16,102,177,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  deliverByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  deliverByLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    width: 76,
  },
  deliverByRequired: {color: colors.danger},
  deliverByBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#C9D0DB',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  deliverByBtnError: {borderColor: colors.danger},
  deliverByBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  deliverByBtnPlaceholder: {color: '#9CA4B0'},
  deliverByErrorText: {color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 2, marginLeft: 80},
  deliverByClock: {fontSize: 16},
  deliverByClear: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  deliverByClearText: {color: '#64748B', fontSize: 13, fontWeight: '700'},

  etaSummary: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    padding: 12,
    gap: 6,
  },
  etaSummaryTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1066B1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  etaSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  etaSummaryFinal: {
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
    marginTop: 4,
    paddingTop: 6,
  },
  etaSummaryStopLabel: {fontSize: 12, fontWeight: '800', color: '#1E40AF'},
  etaSummaryStopAddr: {fontSize: 11, fontWeight: '500', color: '#3B82F6', marginTop: 1},
  etaSummaryEta: {fontSize: 12, fontWeight: '900', color: '#1066B1', flexShrink: 0},

  pickerDoneBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1066B1',
    borderRadius: radius.md,
  },
  pickerDoneBtnText: {color: '#fff', fontWeight: '800', fontSize: 14},
});

export default JobDetailScreen;
