import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import AppInput from '../../components/common/AppInput';
import {colors, radius, spacing, shadow} from '../../theme';

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
  onSubmitQuote: (amount: string, notes: string) => void;
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

  const pickup = job?.pickupLocation ?? job?.pickupAddress ?? '';
  const drop = job?.dropLocation ?? job?.dropAddress ?? '';
  const jobRef = job?.jobReference ?? job?.jobRef ?? 'Job';
  const goodsType = job?.goodsType ?? 'General Goods';
  const vehicleType = job?.vehicleTypeRequired ?? job?.vehicleType ?? '';
  const jobDate = job?.jobDate ?? '';
  const distance = job?.distanceKm ? `${job.distanceKm} km` : '';
  const weight = job?.weightKg ? `${job.weightKg} kg` : '';

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
            <View>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeValue}>{pickup}</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, styles.dotAccent]} />
            <View>
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
        <InfoRow label="Vehicle Required" value={vehicleType} />
        <InfoRow label="Requirement" value={formatDriverRequirement(job?.driverRequirement)} />
        <InfoRow label="Job Date" value={jobDate} />
        <InfoRow label="Distance" value={distance} />
        <InfoRow label="Weight" value={weight} />
      </View>

      {/* Bid form / Applied status */}
      {isApplied ? (
        <View style={styles.appliedCard}>
          <View style={styles.appliedIconCircle}>
            <Text style={styles.appliedCheckmark}>✓</Text>
          </View>
          <Text style={styles.appliedTitle}>Quote Already Submitted</Text>
          <Text style={styles.appliedText}>
            You have already placed a bid on this job. You can track its status in My Quotes.
          </Text>
        </View>
      ) : (
        <View style={styles.bidCard}>
          <Text style={styles.sectionTitle}>Place Your Bid</Text>
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
          <Pressable
            onPress={() => onSubmitQuote(amount, notes)}
            style={[styles.bidButton, (!amount || loading) && styles.bidButtonDisabled]}
            disabled={!amount || loading}>
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
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    flexShrink: 0,
  },
  dotGreen: {
    backgroundColor: '#1066B1',
  },
  dotAccent: {
    backgroundColor: colors.accent,
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
});

export default JobDetailScreen;
