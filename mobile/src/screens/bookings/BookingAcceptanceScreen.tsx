import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, shadow, spacing} from '../../theme';
import type {BookingDetail} from '../../types';

interface BookingAcceptanceScreenProps {
  booking: BookingDetail | null;
  onAccept: (bookingId: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

function addressStr(v: unknown): string {
  if (!v) {return '';}
  if (typeof v === 'string') {return v;}
  if (typeof v === 'object' && v !== null && 'address' in v) {
    return String((v as {address?: string}).address ?? '');
  }
  return '';
}

const BookingAcceptanceScreen: React.FC<BookingAcceptanceScreenProps> = ({
  booking,
  onAccept,
  onBack,
  loading,
  error,
}) => {
  const [accepted, setAccepted] = useState(false);

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Booking Selected</Text>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const pickup = addressStr(booking.pickupLocation);
  const drop = addressStr(booking.dropLocation);
  const escrow = Number(booking.escrowAmount ?? 0);
  const currency = booking.currency ?? 'Rs';
  const isAlreadyAccepted =
    accepted ||
    ['accepted', 'in_transit', 'booked'].includes(
      (booking.status ?? '').toLowerCase(),
    );

  const handleAccept = async () => {
    await onAccept(booking.bookingId);
    setAccepted(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Pressable onPress={onBack} style={styles.topBack}>
          <Text style={styles.topBackText}>← My Bids</Text>
        </Pressable>

        <View style={styles.successBanner}>
          <Text style={styles.successIcon}>🎉</Text>
          <View style={styles.successCopy}>
            <Text style={styles.successTitle}>Your Bid Was Accepted!</Text>
            <Text style={styles.successSub}>
              The haulier has selected you for this job.
            </Text>
          </View>
        </View>

        {/* Booking Reference */}
        <View style={styles.refRow}>
          <Text style={styles.refLabel}>BOOKING REF</Text>
          <Text style={styles.refValue}>
            {booking.bookingReference ?? booking.jobReference ?? `BKG-${booking.bookingId.slice(-6).toUpperCase()}`}
          </Text>
        </View>

        {/* Escrow Secured Banner */}
        <View style={styles.escrowBanner}>
          <View style={styles.escrowIcon}>
            <Text style={styles.escrowIconText}>🔒</Text>
          </View>
          <View style={styles.escrowCopy}>
            <Text style={styles.escrowTitle}>Payment Secured in Escrow</Text>
            <Text style={styles.escrowAmount}>
              {currency} {escrow > 0 ? escrow.toLocaleString() : '—'}
            </Text>
            <Text style={styles.escrowNote}>
              Funds are held securely and released after delivery approval.
            </Text>
          </View>
        </View>

        {/* Route Card */}
        <Card title="Job Route" variant="default">
          <View style={styles.routeWrap}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, styles.dotGreen]} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>PICKUP LOCATION</Text>
                <Text style={styles.routeValue}>{pickup || '—'}</Text>
              </View>
            </View>
            <View style={styles.routeDashedLine} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, styles.dotBlue]} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>DROP-OFF LOCATION</Text>
                <Text style={styles.routeValue}>{drop || '—'}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Job Details Card */}
        <Card title="Job Details" variant="default">
          {[
            {label: 'Goods Type', value: booking.goodsType ?? '—'},
            {label: 'Job Date', value: booking.jobDate ?? '—'},
            {label: 'Weight', value: booking.weight ?? '—'},
            {label: 'Distance', value: booking.distance ?? '—'},
            {label: 'Payment Status', value: booking.escrowStatus ?? booking.paymentStatus ?? 'Secured'},
          ].map(row => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </Card>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Next Steps</Text>
          {[
            '1. Accept this booking to confirm your participation.',
            '2. Arrive at the pickup location on time.',
            '3. Enter the 6-digit Load Code provided by the warehouse.',
            '4. Complete the vehicle handover check with photos.',
            '5. Start your trip — live tracking will begin.',
            '6. Upload delivery proof at drop-off to release payment.',
          ].map(step => (
            <Text key={step} style={styles.instructionStep}>{step}</Text>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isAlreadyAccepted ? (
          <View style={styles.acceptedState}>
            <Text style={styles.acceptedStateIcon}>✅</Text>
            <Text style={styles.acceptedStateText}>Booking Accepted</Text>
            <Text style={styles.acceptedStateSub}>
              Proceed to the pickup location and enter the Load Code to begin.
            </Text>
            <Pressable onPress={onBack} style={styles.proceedBtn}>
              <Text style={styles.proceedBtnText}>Go to Compliance →</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleAccept}
            disabled={loading}
            style={[styles.acceptBtn, loading && styles.acceptBtnDisabled]}>
            {loading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.acceptBtnText}>Accept Booking & Go to Pickup</Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: spacing.xl, paddingBottom: 100, gap: spacing.lg},
  emptyWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg},
  emptyIcon: {fontSize: 52},
  emptyTitle: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  backBtn: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtnText: {color: colors.card, fontSize: 15, fontWeight: '800'},
  topBack: {alignSelf: 'flex-start', marginBottom: spacing.sm},
  topBackText: {color: colors.accent, fontSize: 15, fontWeight: '800'},
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: '#F0FDF4',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successIcon: {fontSize: 36},
  successCopy: {flex: 1},
  successTitle: {color: '#15803D', fontSize: 18, fontWeight: '900'},
  successSub: {color: '#166534', fontSize: 13, marginTop: 4},
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refLabel: {color: colors.inkSoft, fontSize: 11, fontWeight: '800', textTransform: 'uppercase'},
  refValue: {color: colors.navy, fontSize: 15, fontWeight: '900', letterSpacing: 0.5},
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  escrowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  escrowIconText: {fontSize: 22},
  escrowCopy: {flex: 1},
  escrowTitle: {color: colors.navy, fontSize: 14, fontWeight: '900'},
  escrowAmount: {color: '#1D4ED8', fontSize: 22, fontWeight: '900', marginTop: 4},
  escrowNote: {color: '#3B82F6', fontSize: 12, marginTop: 4, lineHeight: 18},
  routeWrap: {gap: spacing.md},
  routePoint: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md},
  dot: {width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0},
  dotGreen: {backgroundColor: '#34D399'},
  dotBlue: {backgroundColor: colors.accent},
  routeText: {flex: 1},
  routeLabel: {color: colors.inkSoft, fontSize: 10, fontWeight: '800', textTransform: 'uppercase'},
  routeValue: {color: colors.ink, fontSize: 14, fontWeight: '700', marginTop: 2},
  routeDashedLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: 5,
    borderStyle: 'dashed',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {color: colors.inkSoft, fontSize: 13, fontWeight: '700'},
  detailValue: {color: colors.ink, fontSize: 14, fontWeight: '800'},
  instructionsCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: spacing.sm,
  },
  instructionsTitle: {color: '#92400E', fontSize: 14, fontWeight: '900', marginBottom: 4},
  instructionStep: {color: '#78350F', fontSize: 13, lineHeight: 20},
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {color: colors.danger, fontSize: 13, fontWeight: '700'},
  acceptedState: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: spacing.md,
  },
  acceptedStateIcon: {fontSize: 44},
  acceptedStateText: {color: '#15803D', fontSize: 20, fontWeight: '900'},
  acceptedStateSub: {color: '#166534', fontSize: 13, textAlign: 'center', lineHeight: 18},
  proceedBtn: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedBtnText: {color: colors.accent, fontSize: 16, fontWeight: '900'},
  acceptBtn: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  acceptBtnDisabled: {opacity: 0.5},
  acceptBtnText: {color: colors.accent, fontSize: 18, fontWeight: '900'},
});

export default BookingAcceptanceScreen;
