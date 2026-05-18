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
  amount: number;
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

function fmt(iso?: string) {
  if (!iso) {return '—';}
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function maskIntentId(id?: string) {
  if (!id) {return '—';}
  if (id.length <= 12) {return id;}
  return id.slice(0, 8) + '••••••••' + id.slice(-4);
}

const STRIPE_STATUS_LABEL: Record<string, string> = {
  requires_payment_method: 'Awaiting Payment',
  requires_confirmation: 'Awaiting Confirmation',
  requires_action: 'Action Required',
  processing: 'Processing',
  requires_capture: 'Authorised (Held)',
  succeeded: 'Captured',
  canceled: 'Cancelled',
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

  const stripeLabel = details.stripeStatus
    ? STRIPE_STATUS_LABEL[details.stripeStatus] ?? details.stripeStatus
    : '—';

  const isAuthorised =
    details.stripeStatus === 'requires_capture' ||
    details.stripeStatus === 'succeeded' ||
    details.status === 'ESCROWED';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.topTitle}>Payment Escrow</Text>
        <View style={{width: 60}} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }>

        {/* Escrow icon + heading */}
        <View style={styles.iconWrap}>
          <View style={[styles.iconCircle, isAuthorised && styles.iconCircleGreen]}>
            <Text style={styles.iconEmoji}>🔒</Text>
          </View>
        </View>
        <Text style={styles.heading}>
          {isAuthorised ? 'Payment in Escrow' : 'Payment Pending'}
        </Text>
        <Text style={styles.subheading}>
          {isAuthorised
            ? 'The haulier has authorised payment for your job. Funds are securely held and will be released once the job is complete.'
            : 'The haulier has initiated a Stripe payment for this job. Awaiting authorisation.'}
        </Text>

        {/* Amount banner */}
        <View style={styles.amountBanner}>
          <Text style={styles.amountLabel}>ESCROWED AMOUNT</Text>
          <Text style={styles.amountValue}>
            {details.currency} {details.amount.toLocaleString('en-GB', {minimumFractionDigits: 2})}
          </Text>
        </View>

        {/* Stripe handshake details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stripe Payment Details</Text>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>PAYMENT INTENT</Text>
            <Text style={[styles.rowValue, styles.mono]}>{maskIntentId(details.stripeIntentId)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>STATUS</Text>
            <View style={[styles.badge, isAuthorised ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={[styles.badgeText, isAuthorised ? styles.badgeTextGreen : styles.badgeTextAmber]}>
                {stripeLabel}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ESCROWED AT</Text>
            <Text style={styles.rowValue}>{fmt(details.escrowedAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>CURRENCY</Text>
            <Text style={styles.rowValue}>{details.currency}</Text>
          </View>
        </View>

        {/* Job details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Details</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>JOB REFERENCE</Text>
            <Text style={[styles.rowValue, styles.accent]}>{details.jobRef}</Text>
          </View>
          {details.pickupAddress ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>PICKUP</Text>
                <Text style={[styles.rowValue, {flex: 1, textAlign: 'right'}]}>{details.pickupAddress}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>DROP-OFF</Text>
                <Text style={[styles.rowValue, {flex: 1, textAlign: 'right'}]}>{details.dropAddress}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* What happens next */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What Happens Next?</Text>
          <View style={styles.divider} />

          <View style={styles.step}>
            <View style={[styles.stepDot, styles.dotGreen]} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Payment Authorised</Text>
              <Text style={styles.stepDesc}>Stripe has held the funds securely on behalf of the haulier.</Text>
            </View>
          </View>
          <View style={styles.connector} />
          <View style={styles.step}>
            <View style={[styles.stepDot, styles.dotBlue]} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Complete the Job</Text>
              <Text style={styles.stepDesc}>Pick up and deliver the goods as agreed. Track your progress in the app.</Text>
            </View>
          </View>
          <View style={styles.connector} />
          <View style={styles.step}>
            <View style={[styles.stepDot, styles.dotGrey]} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Payment Released</Text>
              <Text style={styles.stepDesc}>Once the haulier confirms delivery, the escrowed funds are released to you.</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <Pressable onPress={onViewJob} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>View Job & Start Navigation</Text>
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

  content: {padding: spacing.xl, paddingBottom: 48},

  iconWrap: {alignItems: 'center', marginTop: 16, marginBottom: 16},
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#C7D7F8',
  },
  iconCircleGreen: {backgroundColor: '#E6F9EF', borderColor: '#A3DFC0'},
  iconEmoji: {fontSize: 36},

  heading: {
    color: colors.navy, fontSize: 24, fontWeight: '900',
    textAlign: 'center', marginBottom: 8,
  },
  subheading: {
    color: colors.inkSoft, fontSize: 14, lineHeight: 21,
    textAlign: 'center', marginBottom: 24,
  },

  amountBanner: {
    backgroundColor: '#F0F4FF', borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#C7D7F8',
    padding: spacing.xl, alignItems: 'center', marginBottom: 16,
  },
  amountLabel: {color: colors.inkSoft, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 6},
  amountValue: {color: colors.navy, fontSize: 32, fontWeight: '900'},

  card: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, marginBottom: 14,
  },
  cardTitle: {color: colors.navy, fontSize: 15, fontWeight: '900', marginBottom: 12},
  divider: {height: 1, backgroundColor: colors.border, marginBottom: 14},

  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 4,
  },
  rowLabel: {color: colors.inkSoft, fontSize: 11, fontWeight: '900', letterSpacing: 0.5},
  rowValue: {color: colors.navy, fontSize: 13, fontWeight: '800'},
  mono: {fontFamily: 'monospace', fontSize: 12},
  accent: {color: colors.accent},

  badge: {paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20},
  badgeGreen: {backgroundColor: '#E6F9EF'},
  badgeAmber: {backgroundColor: '#FEF3C7'},
  badgeText: {fontSize: 11, fontWeight: '900'},
  badgeTextGreen: {color: '#18794E'},
  badgeTextAmber: {color: '#92400E'},

  step: {flexDirection: 'row', alignItems: 'flex-start', gap: 14},
  stepDot: {width: 12, height: 12, borderRadius: 6, marginTop: 3, flexShrink: 0},
  dotGreen: {backgroundColor: '#18794E'},
  dotBlue: {backgroundColor: colors.accent},
  dotGrey: {backgroundColor: '#C9D0DB'},
  connector: {width: 2, height: 20, backgroundColor: colors.border, marginLeft: 5, marginVertical: 2},
  stepContent: {flex: 1},
  stepTitle: {color: colors.ink, fontSize: 14, fontWeight: '800'},
  stepDesc: {color: colors.inkSoft, fontSize: 12, lineHeight: 18, marginTop: 2},

  primaryBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    minHeight: 56, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},
  secondaryBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  secondaryBtnText: {color: colors.inkSoft, fontSize: 14, fontWeight: '700'},
});

export default PaymentEscrowScreen;
