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
            <Text style={styles.backBtnText}>Go to My Quotes</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const b = booking as BookingDetail & Record<string, unknown>;

  const pickup    = resolveAddress(b.pickupAddress ?? b.pickupLocation, String(b.pickup ?? ''));
  const drop      = resolveAddress(b.dropAddress   ?? b.dropLocation,   String(b.drop   ?? ''));
  const stops     = (b.stops as Array<{order?: number; address?: string; litres?: number}> | undefined) ?? [];

  const bookingRef = String(b.jobRef ?? b.jobReference ?? b.bookingReference ?? b.bookingId ?? '');
  const amount     = Number(b.agreedAmount ?? b.escrowAmount ?? 0);
  const currency   = String(b.currency ?? '');
  const goodsType  = String(b.goodsType ?? '—');
  const jobDate    = String(b.jobDate ?? '—');

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

        {/* ── 1. Job Route ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitleIcon}>🗺</Text>
            <Text style={styles.cardTitle}>Job Route</Text>
          </View>
          {bookingRef ? (
            <View style={styles.refRow}>
              <Text style={styles.refLabel}>REF</Text>
              <Text style={styles.refValue}>{bookingRef}</Text>
            </View>
          ) : null}

          <View style={styles.routeWrap}>
            {/* Pickup */}
            <View style={styles.routePoint}>
              <View style={[styles.dot, styles.dotGreen]} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>PICKUP</Text>
                <Text style={styles.routeValue}>{pickup}</Text>
              </View>
            </View>

            {/* Intermediate stops */}
            {stops.map((stop, idx) => (
              <React.Fragment key={idx}>
                <View style={styles.routeDashedLine} />
                <View style={styles.routePoint}>
                  <View style={[styles.dot, styles.dotAmber]} />
                  <View style={styles.routeText}>
                    <Text style={styles.routeLabel}>STOP {idx + 1}</Text>
                    <Text style={styles.routeValue}>{stop.address ?? '—'}</Text>
                    {stop.litres ? (
                      <Text style={styles.stopSub}>{stop.litres.toLocaleString()} L</Text>
                    ) : null}
                  </View>
                </View>
              </React.Fragment>
            ))}

            <View style={styles.routeDashedLine} />

            {/* Drop-off */}
            <View style={styles.routePoint}>
              <View style={[styles.dot, styles.dotBlue]} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>DROP-OFF</Text>
                <Text style={styles.routeValue}>{drop}</Text>
              </View>
            </View>
          </View>

          {/* Quick info chips */}
          <View style={styles.chipRow}>
            {goodsType !== '—' && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{goodsType}</Text>
              </View>
            )}
            {jobDate !== '—' && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{jobDate}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── 2. Payment Secured ────────────────────────────────────────────── */}
        <View style={styles.paymentBanner}>
          <View style={styles.paymentIconWrap}>
            <Text style={styles.paymentIconText}>🔒</Text>
          </View>
          <View style={styles.paymentCopy}>
            <Text style={styles.paymentTitle}>Payment Secured</Text>
            {amount > 0 && (
              <Text style={styles.paymentAmount}>
                {currency ? `${currency} ` : ''}
                {amount.toLocaleString('en-US', {minimumFractionDigits: 2})}
              </Text>
            )}
            <Text style={styles.paymentNote}>
              Funds are held securely and released after delivery is confirmed.
            </Text>
          </View>
        </View>

        {/* ── 3. Booking Accepted / Accept ──────────────────────────────────── */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isAlreadyAccepted ? (
          <View style={styles.acceptedCard}>
            <View style={styles.acceptedHeader}>
              <Text style={styles.acceptedIcon}>✅</Text>
              <View>
                <Text style={styles.acceptedTitle}>Booking Accepted</Text>
                <Text style={styles.acceptedSub}>You're confirmed for this job.</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.nextStepHint}>
              Head to the pickup location and enter the access code provided by the haulier to begin.
            </Text>
            <Pressable onPress={onBack} style={styles.proceedBtn}>
              <Text style={styles.proceedBtnText}>Continue to Access Code →</Text>
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

  // Route card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: radius.lg,
    padding: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  cardTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  cardTitleIcon: {fontSize: 16},
  cardTitle: {
    color: colors.navy, fontSize: 14, fontWeight: '900',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  refRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F8FAFD', borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  refLabel: {color: colors.inkSoft, fontSize: 10, fontWeight: '800', textTransform: 'uppercase'},
  refValue: {color: colors.navy, fontSize: 13, fontWeight: '900', letterSpacing: 0.5},
  routeWrap: {gap: 0},
  routePoint: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md},
  dot: {width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0},
  dotGreen: {backgroundColor: '#16A34A'},
  dotBlue:  {backgroundColor: '#1066B1'},
  dotAmber: {backgroundColor: '#D97706'},
  routeText: {flex: 1, paddingBottom: 4},
  routeLabel: {color: colors.inkSoft, fontSize: 10, fontWeight: '800', textTransform: 'uppercase'},
  routeValue: {color: colors.ink, fontSize: 14, fontWeight: '700', marginTop: 2},
  stopSub: {color: colors.inkSoft, fontSize: 11, marginTop: 1},
  routeDashedLine: {width: 2, height: 18, backgroundColor: colors.border, marginLeft: 5},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4},
  chip: {
    backgroundColor: '#F1F5F9', borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipText: {fontSize: 12, fontWeight: '700', color: '#374151'},

  // Payment Secured banner
  paymentBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg,
    backgroundColor: '#F0FDF4', borderRadius: radius.xl,
    padding: spacing.xl, borderWidth: 1, borderColor: '#BBF7D0',
  },
  paymentIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#166534', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  paymentIconText: {fontSize: 22},
  paymentCopy: {flex: 1},
  paymentTitle: {color: '#166534', fontSize: 15, fontWeight: '900'},
  paymentAmount: {color: '#15803D', fontSize: 24, fontWeight: '900', marginTop: 4},
  paymentNote: {color: '#4ADE80', fontSize: 12, marginTop: 6, lineHeight: 18, color: '#16A34A'},

  // Booking Accepted card
  acceptedCard: {
    backgroundColor: '#EFF6FF', borderRadius: radius.xl,
    padding: spacing.xl, borderWidth: 1, borderColor: '#BFDBFE', gap: spacing.md,
  },
  acceptedHeader: {flexDirection: 'row', alignItems: 'center', gap: 14},
  acceptedIcon: {fontSize: 36},
  acceptedTitle: {color: '#1066B1', fontSize: 18, fontWeight: '900'},
  acceptedSub: {color: '#3B82F6', fontSize: 12, marginTop: 2},
  divider: {height: 1, backgroundColor: '#BFDBFE'},
  nextStepHint: {color: '#1D4ED8', fontSize: 13, lineHeight: 20, fontWeight: '500'},
  proceedBtn: {
    backgroundColor: '#1066B1', borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#1066B1', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  proceedBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '900'},

  errorBox: {
    backgroundColor: '#FEE2E2', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: {color: colors.danger, fontSize: 13, fontWeight: '700'},

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
