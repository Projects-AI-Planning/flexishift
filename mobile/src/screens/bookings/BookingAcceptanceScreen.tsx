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
import {colors, radius, shadow, spacing} from '../../theme';
import type {BookingDetail} from '../../types';

interface BookingAcceptanceScreenProps {
  booking: BookingDetail | null;
  onAccept: (bookingId: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

// Backend returns pickupAddress / dropAddress as plain strings
function resolveAddress(
  primary: string | {address?: string} | undefined,
  fallback: string | undefined,
): string {
  if (primary) {
    if (typeof primary === 'string') {return primary;}
    if (primary.address) {return primary.address;}
  }
  return fallback ?? '—';
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
          <Text style={styles.emptyTitle}>No Booking Found</Text>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go to My Bids</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Map backend field names ────────────────────────────────────────────────
  const b = booking as BookingDetail & Record<string, unknown>;

  // Backend: pickupAddress / dropAddress (plain strings)
  const pickup  = resolveAddress(b.pickupAddress  ?? b.pickupLocation,  String(b.pickup ?? ''));
  const drop    = resolveAddress(b.dropAddress    ?? b.dropLocation,    String(b.drop   ?? ''));

  // Backend: jobRef (the visible reference string)
  const bookingRef =
    String(b.jobRef ?? b.jobReference ?? b.bookingReference ?? b.bookingId ?? '');

  // Backend: agreedAmount (from payment table)
  const escrow = Number(b.agreedAmount ?? b.escrowAmount ?? 0);

  // Backend: goodsType, weightKg, distanceKm, vehicleType, jobDate
  const goodsType = String(b.goodsType ?? '—');
  const weight    = b.weightKg   ? `${b.weightKg} kg`   : String(b.weight   ?? '—');
  const distance  = b.distanceKm ? `${b.distanceKm} km` : String(b.distance ?? '—');
  const vehicleType = String(b.vehicleType ?? '—');
  const jobDate   = String(b.jobDate ?? '—');

  // Backend: paymentStatus, complianceStatus
  const payStatus = String(b.paymentStatus ?? b.escrowStatus ?? b.complianceStatus ?? 'Secured');

  const isAlreadyAccepted =
    accepted ||
    ['accepted', 'in_transit', 'booked', 'payment_secured', 'payment_pending'].includes(
      (booking.status ?? '').toLowerCase(),
    );

  const handleAccept = async () => {
    await onAccept(booking.bookingId);
    setAccepted(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Success banner */}
        <View style={styles.successBanner}>
          <Text style={styles.successIcon}>🎉</Text>
          <View style={styles.successCopy}>
            <Text style={styles.successTitle}>Your Bid Was Accepted!</Text>
            <Text style={styles.successSub}>The haulier has selected you for this job.</Text>
          </View>
        </View>

        {/* Booking Reference */}
        <View style={styles.refRow}>
          <Text style={styles.refLabel}>BOOKING REF</Text>
          <Text style={styles.refValue}>{bookingRef}</Text>
        </View>

        {/* Escrow / Payment Banner */}
        <View style={styles.escrowBanner}>
          <View style={styles.escrowIconWrap}>
            <Text style={styles.escrowIconText}>🔒</Text>
          </View>
          <View style={styles.escrowCopy}>
            <Text style={styles.escrowTitle}>Payment Secured in Escrow</Text>
            <Text style={styles.escrowAmount}>
              {escrow > 0 ? Number(escrow).toLocaleString('en-IN') : '—'}
            </Text>
            <Text style={styles.escrowNote}>
              Funds are held securely and released after delivery approval.
            </Text>
          </View>
        </View>

        {/* Route Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Route</Text>
          <View style={styles.routeWrap}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, styles.dotGreen]} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>PICKUP LOCATION</Text>
                <Text style={styles.routeValue}>{pickup}</Text>
              </View>
            </View>
            <View style={styles.routeDashedLine} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, styles.dotBlue]} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>DROP-OFF LOCATION</Text>
                <Text style={styles.routeValue}>{drop}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Job Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Details</Text>
          {[
            {label: 'Goods Type',     value: goodsType},
            {label: 'Vehicle Type',   value: vehicleType},
            {label: 'Job Date',       value: jobDate},
            {label: 'Weight',         value: weight},
            {label: 'Distance',       value: distance},
            {label: 'Payment Status', value: payStatus},
          ].map(row => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
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
              <Text style={styles.proceedBtnText}>Continue to Load Code →</Text>
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
    backgroundColor: '#1066B1', borderRadius: radius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  backBtnText: {color: colors.card, fontSize: 15, fontWeight: '800'},

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    backgroundColor: '#EFF6FF', borderRadius: radius.xl,
    padding: spacing.xl, borderWidth: 1, borderColor: '#BFDBFE',
  },
  successIcon: {fontSize: 36},
  successCopy: {flex: 1},
  successTitle: {color: '#1066B1', fontSize: 18, fontWeight: '900'},
  successSub: {color: '#166534', fontSize: 13, marginTop: 4},

  refRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F8FAFD', borderRadius: radius.lg,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  refLabel: {color: colors.inkSoft, fontSize: 11, fontWeight: '800', textTransform: 'uppercase'},
  refValue: {color: colors.navy, fontSize: 15, fontWeight: '900', letterSpacing: 0.5},

  escrowBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg,
    backgroundColor: '#EFF6FF', borderRadius: radius.xl,
    padding: spacing.xl, borderWidth: 1, borderColor: '#BFDBFE',
  },
  escrowIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.navy, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  escrowIconText: {fontSize: 22},
  escrowCopy: {flex: 1},
  escrowTitle: {color: colors.navy, fontSize: 14, fontWeight: '900'},
  escrowAmount: {color: '#1D4ED8', fontSize: 22, fontWeight: '900', marginTop: 4},
  escrowNote: {color: '#3B82F6', fontSize: 12, marginTop: 4, lineHeight: 18},

  card: {
    backgroundColor: '#FFFFFF', borderRadius: radius.lg,
    padding: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  cardTitle: {
    color: colors.navy, fontSize: 14, fontWeight: '900',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  routeWrap: {gap: spacing.md},
  routePoint: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md},
  dot: {width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0},
  dotGreen: {backgroundColor: '#1066B1'},
  dotBlue: {backgroundColor: colors.accent},
  routeText: {flex: 1},
  routeLabel: {color: colors.inkSoft, fontSize: 10, fontWeight: '800', textTransform: 'uppercase'},
  routeValue: {color: colors.ink, fontSize: 14, fontWeight: '700', marginTop: 2},
  routeDashedLine: {width: 2, height: 20, backgroundColor: colors.border, marginLeft: 5},

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  detailLabel: {color: colors.inkSoft, fontSize: 13, fontWeight: '700'},
  detailValue: {color: colors.ink, fontSize: 14, fontWeight: '800'},

  errorBox: {
    backgroundColor: '#FEE2E2', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: {color: colors.danger, fontSize: 13, fontWeight: '700'},

  acceptedState: {
    alignItems: 'center', backgroundColor: '#EFF6FF',
    borderRadius: radius.xl, padding: spacing.xl,
    borderWidth: 1, borderColor: '#BFDBFE', gap: spacing.md,
  },
  acceptedStateIcon: {fontSize: 44},
  acceptedStateText: {color: '#1066B1', fontSize: 20, fontWeight: '900'},
  acceptedStateSub: {color: '#166534', fontSize: 13, textAlign: 'center', lineHeight: 18},
  proceedBtn: {
    backgroundColor: '#1066B1', borderRadius: radius.lg,
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, marginTop: spacing.sm,
    shadowColor: shadow.color, shadowOffset: shadow.offset,
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  proceedBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '900'},

  acceptBtn: {
    backgroundColor: '#1066B1', borderRadius: radius.xl,
    minHeight: 64, justifyContent: 'center', alignItems: 'center',
    shadowColor: shadow.color, shadowOffset: shadow.offset,
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 5,
  },
  acceptBtnDisabled: {opacity: 0.5},
  acceptBtnText: {color: '#FFFFFF', fontSize: 18, fontWeight: '900'},
});

export default BookingAcceptanceScreen;
