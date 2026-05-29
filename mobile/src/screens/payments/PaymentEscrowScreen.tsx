import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface PaymentEscrowDetails {
  paymentId: string;
  jobId: string;
  jobRef: string;
  pickupAddress?: string;
  dropAddress?: string;
  stops?: Array<{order?: number; address?: string; litres?: number}>;
  goodsType?: string;
  jobDate?: string;
  timeSlot?: string;
  compartmentCount?: number;
  totalLitres?: number;
  specialInstructions?: string;
  distanceKm?: number;
  amount: number;
  driverAmount?: number;
  platformFee?: number;
  totalAmount?: number;
  currency: string;
  status: string;
  stripeIntentId?: string;
  stripeStatus?: string;
  escrowedAt?: string;
}

interface PaymentEscrowScreenProps {
  details: PaymentEscrowDetails | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onViewJob: () => void;
  onBack: () => void;
}

function fmtDate(iso?: string) {
  if (!iso) {return '—';}
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {return iso;}
}

function fmtDateTime(iso?: string) {
  if (!iso) {return '—';}
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {return iso;}
}

function maskIntentId(id?: string) {
  if (!id) {return '—';}
  if (id.length <= 12) {return id;}
  return id.slice(0, 8) + '••••••••' + id.slice(-4);
}

const STRIPE_STATUS_LABEL: Record<string, string> = {
  requires_payment_method: 'Awaiting Payment',
  requires_confirmation: 'Awaiting Confirmation',
  requires_action:  'Action Required',
  processing:       'Processing',
  requires_capture: 'Authorised',
  succeeded:        'Captured',
  canceled:         'Cancelled',
};

const PaymentEscrowScreen: React.FC<PaymentEscrowScreenProps> = ({
  details,
  loading,
  refreshing,
  onRefresh,
  onViewJob,
  onBack,
}) => {
  if (loading && !details) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loaderText}>Loading payment details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!details) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.loaderWrap}>
          <Text style={styles.errorText}>Payment details not available.</Text>
          <Pressable onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isAuthorised =
    details.stripeStatus === 'requires_capture' ||
    details.stripeStatus === 'succeeded' ||
    details.status === 'ESCROWED';

  const stripeLabel = details.stripeStatus
    ? (STRIPE_STATUS_LABEL[details.stripeStatus] ?? details.stripeStatus)
    : '—';

  const stops = details.stops ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.topTitle}>Payment Status</Text>
        <View style={{width: 60}} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }>

        {/* ── 1. Job Route ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitleIcon}>🗺</Text>
            <Text style={styles.cardTitle}>Job Route</Text>
            {details.jobRef ? (
              <View style={styles.refPill}>
                <Text style={styles.refPillText}>{details.jobRef}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.routeWrap}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, styles.dotGreen]} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>PICKUP</Text>
                <Text style={styles.routeValue}>{details.pickupAddress ?? '—'}</Text>
              </View>
            </View>

            {stops.map((stop, idx) => (
              <React.Fragment key={idx}>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                  <View style={[styles.dot, styles.dotAmber]} />
                  <View style={styles.routeText}>
                    <Text style={styles.routeLabel}>STOP {idx + 1}</Text>
                    <Text style={styles.routeValue}>{stop.address ?? '—'}</Text>
                    {stop.litres ? (
                      <Text style={styles.routeSub}>{stop.litres.toLocaleString()} L</Text>
                    ) : null}
                  </View>
                </View>
              </React.Fragment>
            ))}

            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, styles.dotBlue]} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>DROP-OFF</Text>
                <Text style={styles.routeValue}>{details.dropAddress ?? '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 2. Payment Secured ────────────────────────────────────────────── */}
        <View style={styles.payBanner}>
          <View style={styles.payIconWrap}>
            <Text style={styles.payIconText}>🔒</Text>
          </View>
          <View style={styles.payCopy}>
            <Text style={styles.payTitle}>
              {isAuthorised ? 'Payment Secured' : 'Payment Pending'}
            </Text>
            <Text style={styles.payAmount}>
              {details.currency ? `${details.currency} ` : ''}
              {(details.driverAmount ?? details.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
            </Text>
            <Text style={styles.payNote}>
              {isAuthorised
                ? 'Funds are held securely and released after delivery is confirmed.'
                : 'Awaiting payment authorisation from the haulier.'}
            </Text>
          </View>
        </View>

        {/* ── 3. Job Details ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Details</Text>
          <View style={styles.divider} />

          {details.goodsType ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>GOODS TYPE</Text>
              <Text style={styles.rowValue}>{details.goodsType}</Text>
            </View>
          ) : null}

          {details.jobDate ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>JOB DATE</Text>
              <Text style={styles.rowValue}>{fmtDate(details.jobDate)}</Text>
            </View>
          ) : null}

          {details.timeSlot ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>TIME SLOT</Text>
              <Text style={styles.rowValue}>{details.timeSlot}</Text>
            </View>
          ) : null}

          {details.distanceKm != null ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>DISTANCE</Text>
              <Text style={styles.rowValue}>{details.distanceKm} km</Text>
            </View>
          ) : null}

          {details.compartmentCount != null && details.compartmentCount > 0 ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>COMPARTMENTS</Text>
              <Text style={styles.rowValue}>{details.compartmentCount}</Text>
            </View>
          ) : null}

          {details.totalLitres != null && details.totalLitres > 0 ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>TOTAL LITRES</Text>
              <Text style={styles.rowValue}>{details.totalLitres.toLocaleString()} L</Text>
            </View>
          ) : null}

          {details.specialInstructions ? (
            <View style={[styles.row, {alignItems: 'flex-start'}]}>
              <Text style={styles.rowLabel}>INSTRUCTIONS</Text>
              <Text style={[styles.rowValue, styles.rowValueWrap]}>{details.specialInstructions}</Text>
            </View>
          ) : null}
        </View>

        {/* ── 4. Payment Details ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>REFERENCE</Text>
            <Text style={[styles.rowValue, styles.mono]}>{maskIntentId(details.stripeIntentId)}</Text>
          </View>
          <View style={[styles.row, styles.rowTotal]}>
            <Text style={[styles.rowLabel, styles.rowLabelTotal]}>YOUR PAYMENT</Text>
            <Text style={[styles.rowValue, styles.rowValueTotal]}>
              {details.currency ? `${details.currency} ` : ''}
              {(details.driverAmount ?? details.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>STATUS</Text>
            <View style={[styles.badge, isAuthorised ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={[styles.badgeText, isAuthorised ? styles.badgeTextGreen : styles.badgeTextAmber]}>
                {stripeLabel}
              </Text>
            </View>
          </View>
          {details.escrowedAt ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>SECURED ON</Text>
              <Text style={styles.rowValue}>{fmtDateTime(details.escrowedAt)}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>CURRENCY</Text>
            <Text style={styles.rowValue}>{details.currency || '—'}</Text>
          </View>
        </View>

        {/* ── 5. What happens next ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What Happens Next?</Text>
          <View style={styles.divider} />

          <View style={styles.step}>
            <View style={[styles.stepDot, styles.dotGreen]} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Payment Authorised</Text>
              <Text style={styles.stepDesc}>Funds are securely held on behalf of the haulier.</Text>
            </View>
          </View>
          <View style={styles.connector} />
          <View style={styles.step}>
            <View style={[styles.stepDot, styles.dotBlue]} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Enter Access Code</Text>
              <Text style={styles.stepDesc}>Enter the access code provided by the haulier to begin the job, then pick up and deliver the goods.</Text>
            </View>
          </View>
          <View style={styles.connector} />
          <View style={styles.step}>
            <View style={[styles.stepDot, styles.dotGrey]} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Payment Released</Text>
              <Text style={styles.stepDesc}>Once the haulier confirms delivery, the funds are released to you.</Text>
            </View>
          </View>
        </View>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <Pressable onPress={onViewJob} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>View Job & Enter Access Code</Text>
        </Pressable>

        <Pressable onPress={onBack} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Back to Notifications</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.bg},
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: 14,
    backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {width: 60},
  backText: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  topTitle: {color: colors.navy, fontSize: 16, fontWeight: '900'},

  loaderWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16},
  loaderText: {color: colors.inkSoft, fontSize: 14, fontWeight: '600'},
  errorText: {color: colors.danger, fontSize: 15, fontWeight: '700'},
  retryBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  retryText: {color: '#fff', fontWeight: '800', fontSize: 14},

  content: {padding: spacing.xl, paddingBottom: 48, gap: 14},

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.xl,
  },
  cardTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14},
  cardTitleIcon: {fontSize: 15},
  cardTitle: {
    color: colors.navy, fontSize: 14, fontWeight: '900',
    textTransform: 'uppercase', letterSpacing: 0.5, flex: 1,
  },
  refPill: {
    backgroundColor: '#EFF6FF', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  refPillText: {color: '#1066B1', fontSize: 11, fontWeight: '800'},
  divider: {height: 1, backgroundColor: colors.border, marginBottom: 14},

  // Route
  routeWrap: {gap: 0},
  routePoint: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  dot: {width: 12, height: 12, borderRadius: 6, marginTop: 3, flexShrink: 0},
  dotGreen: {backgroundColor: '#16A34A'},
  dotBlue:  {backgroundColor: '#1066B1'},
  dotAmber: {backgroundColor: '#D97706'},
  dotGrey:  {backgroundColor: '#C9D0DB'},
  routeText: {flex: 1, paddingBottom: 4},
  routeLabel: {color: colors.inkSoft, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5},
  routeValue: {color: colors.ink, fontSize: 14, fontWeight: '700', marginTop: 2},
  routeSub:   {color: colors.inkSoft, fontSize: 11, marginTop: 1},
  routeLine:  {width: 2, height: 16, backgroundColor: colors.border, marginLeft: 5},

  // Payment banner
  payBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg,
    backgroundColor: '#F0FDF4', borderRadius: radius.xl,
    padding: spacing.xl, borderWidth: 1, borderColor: '#BBF7D0',
  },
  payIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#166534', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  payIconText: {fontSize: 22},
  payCopy: {flex: 1},
  payTitle: {color: '#166534', fontSize: 14, fontWeight: '900'},
  payAmount: {color: '#15803D', fontSize: 26, fontWeight: '900', marginTop: 4},
  payNote:   {color: '#16A34A', fontSize: 12, marginTop: 6, lineHeight: 18},

  // Rows
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  rowLabel: {color: colors.inkSoft, fontSize: 11, fontWeight: '900', letterSpacing: 0.5},
  rowValue: {color: colors.navy, fontSize: 13, fontWeight: '800'},
  rowTotal: {borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4},
  rowLabelTotal: {color: colors.navy},
  rowValueTotal: {fontSize: 15, color: colors.accent},
  rowValueWrap: {flex: 1, textAlign: 'right', marginLeft: 12},
  mono: {fontFamily: 'monospace', fontSize: 12},

  // Badge
  badge: {paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20},
  badgeGreen: {backgroundColor: '#E6F9EF'},
  badgeAmber: {backgroundColor: '#FEF3C7'},
  badgeText: {fontSize: 11, fontWeight: '900'},
  badgeTextGreen: {color: '#18794E'},
  badgeTextAmber: {color: '#92400E'},

  // Steps
  step: {flexDirection: 'row', alignItems: 'flex-start', gap: 14},
  stepDot: {width: 12, height: 12, borderRadius: 6, marginTop: 3, flexShrink: 0},
  connector: {width: 2, height: 18, backgroundColor: colors.border, marginLeft: 5, marginVertical: 2},
  stepContent: {flex: 1},
  stepTitle: {color: colors.ink, fontSize: 14, fontWeight: '800'},
  stepDesc: {color: colors.inkSoft, fontSize: 12, lineHeight: 18, marginTop: 2},

  // Buttons
  primaryBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    minHeight: 56, justifyContent: 'center', alignItems: 'center',
  },
  primaryBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},
  secondaryBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  secondaryBtnText: {color: colors.inkSoft, fontSize: 14, fontWeight: '700'},
});

export default PaymentEscrowScreen;
