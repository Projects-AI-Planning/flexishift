import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '../../components/common/Icon';
import {colors, radius, spacing} from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StripeConnectStatus {
  hasAccount: boolean;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

interface PaymentRecord {
  paymentId: string;
  jobId?: string;
  jobRef?: string;
  pickupAddress?: string;
  dropAddress?: string;
  amount: number;
  currency: string;
  status: string;
  releasedAt?: string;
  escrowedAt?: string;
  createdAt?: string;
}

interface DriverPaymentsScreenProps {
  stripeConnect?: StripeConnectStatus | null;
  onStripeSetup: () => void;
  stripeConnectLoading?: boolean;
  totalEarnings?: number;
  totalJobs?: number;
  payments: PaymentRecord[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) {return '—';}
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtAmount(amount: number, currency: string) {
  const sym = currency?.toUpperCase() === 'GBP' ? '£' : '$';
  return `${sym}${amount.toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function statusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'RELEASED': return '#065F46';
    case 'ESCROWED': return '#92400E';
    case 'REFUNDED': return '#6B7280';
    case 'FAILED':   return '#991B1B';
    default:         return '#1D4ED8';
  }
}

function statusBg(status: string): string {
  switch (status?.toUpperCase()) {
    case 'RELEASED': return '#D1FAE5';
    case 'ESCROWED': return '#FEF3C7';
    case 'REFUNDED': return '#F3F4F6';
    case 'FAILED':   return '#FEE2E2';
    default:         return '#DBEAFE';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({title}: {title: string}) {
  return <Text style={s.sectionLabel}>{title}</Text>;
}

function ConnectCard({
  stripeConnect,
  onStripeSetup,
  loading,
}: {
  stripeConnect?: StripeConnectStatus | null;
  onStripeSetup: () => void;
  loading?: boolean;
}) {
  const complete = stripeConnect?.onboardingComplete === true;
  const hasAccount = stripeConnect?.hasAccount === true;

  return (
    <View style={[s.card, complete ? s.cardGreen : s.cardAmber]}>
      <View style={s.cardRow}>
        <View style={[s.cardIconBox, complete ? s.cardIconGreen : s.cardIconAmber]}>
          <Icon name={complete ? 'check-circle' : 'credit-card'} size={22} color={complete ? '#065F46' : '#92400E'} strokeWidth={2} />
        </View>
        <View style={s.cardBody}>
          <Text style={[s.cardTitle, complete ? s.cardTitleGreen : s.cardTitleAmber]}>
            {complete ? 'Bank Account Connected' : hasAccount ? 'Onboarding Incomplete' : 'Bank Account Required'}
          </Text>
          <Text style={[s.cardDesc, complete ? s.cardDescGreen : s.cardDescAmber]}>
            {complete
              ? 'Your account is verified. Earnings are transferred automatically after each job.'
              : hasAccount
              ? 'You started onboarding but haven\'t finished. Complete it to receive payments.'
              : 'Connect your bank account so FreightFlex can transfer your earnings after each job is completed.'}
          </Text>
        </View>
      </View>
      {!complete && (
        <Pressable
          style={[s.connectBtn, loading && s.connectBtnDisabled]}
          onPress={onStripeSetup}
          disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.connectBtnText}>
                {hasAccount ? 'Continue Setup →' : 'Set Up Bank Account →'}
              </Text>}
        </Pressable>
      )}
    </View>
  );
}

function StatCard({label, value, icon}: {label: string; value: string; icon: string}) {
  return (
    <View style={s.statCard}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function PaymentRow({item}: {item: PaymentRecord}) {
  const releaseDate = item.releasedAt || item.escrowedAt || item.createdAt;
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <Text style={s.rowRef}>{item.jobRef ?? 'Job'}</Text>
        <Text style={s.rowAddr} numberOfLines={1}>
          {item.pickupAddress ? `${item.pickupAddress.split(',')[0]} → ${(item.dropAddress ?? '').split(',')[0]}` : '—'}
        </Text>
        <Text style={s.rowDate}>{fmtDate(releaseDate)}</Text>
      </View>
      <View style={s.rowRight}>
        <Text style={s.rowAmount}>{fmtAmount(item.amount, item.currency)}</Text>
        <View style={[s.badge, {backgroundColor: statusBg(item.status)}]}>
          <Text style={[s.badgeText, {color: statusColor(item.status)}]}>
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const DriverPaymentsScreen: React.FC<DriverPaymentsScreenProps> = ({
  stripeConnect,
  onStripeSetup,
  stripeConnectLoading = false,
  totalEarnings = 0,
  totalJobs = 0,
  payments,
  loading,
  refreshing,
  onRefresh,
  onBack,
}) => {
  const released = payments.filter(p => p.status?.toUpperCase() === 'RELEASED');
  const escrowed = payments.filter(p => p.status?.toUpperCase() === 'ESCROWED');
  const escrowedTotal = escrowed.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const currency = payments[0]?.currency ?? 'GBP';

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onBack} hitSlop={10}>
          <Icon name="arrow-left" size={20} color={colors.ink} strokeWidth={2.5} />
        </Pressable>
        <Text style={s.headerTitle}>Payments</Text>
      </View>

      {loading && !refreshing ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <>
          {/* ── Bank Account ──────────────────────────────────────────────── */}
          <SectionHeader title="BANK ACCOUNT" />
          <ConnectCard
            stripeConnect={stripeConnect}
            onStripeSetup={onStripeSetup}
            loading={stripeConnectLoading}
          />

          {/* ── Earnings Summary ──────────────────────────────────────────── */}
          <SectionHeader title="EARNINGS SUMMARY" />
          <View style={s.statsRow}>
            <StatCard
              icon="trending-up"
              label="Total Earned"
              value={fmtAmount(totalEarnings, currency)}
            />
            <StatCard
              icon="briefcase"
              label="Jobs Completed"
              value={String(totalJobs)}
            />
            <StatCard
              icon="clock"
              label="In Escrow"
              value={fmtAmount(escrowedTotal, currency)}
            />
          </View>

          {/* ── Pending Escrow ────────────────────────────────────────────── */}
          {escrowed.length > 0 && (
            <>
              <SectionHeader title="PENDING RELEASE" />
              <View style={s.listCard}>
                {escrowed.map((item, i) => (
                  <View key={item.paymentId}>
                    <PaymentRow item={item} />
                    {i < escrowed.length - 1 && <View style={s.divider} />}
                  </View>
                ))}
              </View>
              <Text style={s.escrowNote}>
                These funds are held in escrow and will be released once the haulier confirms delivery.
              </Text>
            </>
          )}

          {/* ── Payment History ───────────────────────────────────────────── */}
          <SectionHeader title="PAYMENT HISTORY" />
          {released.length === 0 ? (
            <View style={s.emptyCard}>
              <Icon name="inbox" size={32} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={s.emptyTitle}>No payments yet</Text>
              <Text style={s.emptyDesc}>Completed job payments will appear here.</Text>
            </View>
          ) : (
            <View style={s.listCard}>
              {released.map((item, i) => (
                <View key={item.paymentId}>
                  <PaymentRow item={item} />
                  {i < released.length - 1 && <View style={s.divider} />}
                </View>
              ))}
            </View>
          )}

          {/* ── Stripe branding ───────────────────────────────────────────── */}
          <Pressable
            style={s.stripeFooter}
            onPress={() => Linking.openURL('https://stripe.com')}>
            <Text style={s.stripeFooterText}>Payments powered by Stripe</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bg},
  content: {paddingBottom: 48},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  headerTitle: {fontSize: 22, fontWeight: '900', color: colors.ink},

  loader: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80},

  sectionLabel: {
    fontSize: 11, fontWeight: '900', letterSpacing: 1,
    color: colors.inkSoft, textTransform: 'uppercase',
    marginTop: spacing.md, marginBottom: 8,
    paddingHorizontal: spacing.lg,
  },

  // Connect card
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
  },
  cardGreen: {backgroundColor: '#F0FDF4', borderColor: '#BBF7D0'},
  cardAmber: {backgroundColor: '#FFFBEB', borderColor: '#FDE68A'},
  cardRow: {flexDirection: 'row', gap: 12, marginBottom: 12},
  cardIconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cardIconGreen: {backgroundColor: '#BBF7D0'},
  cardIconAmber: {backgroundColor: '#FDE68A'},
  cardBody: {flex: 1},
  cardTitle: {fontSize: 15, fontWeight: '800', marginBottom: 4},
  cardTitleGreen: {color: '#065F46'},
  cardTitleAmber: {color: '#92400E'},
  cardDesc: {fontSize: 13, lineHeight: 18},
  cardDescGreen: {color: '#047857'},
  cardDescAmber: {color: '#B45309'},
  connectBtn: {
    backgroundColor: '#111827', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  connectBtnDisabled: {opacity: 0.5},
  connectBtnText: {color: '#fff', fontSize: 14, fontWeight: '700'},

  // Stats
  statsRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: spacing.lg,
  },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: radius.md,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  statValue: {fontSize: 18, fontWeight: '900', color: colors.ink, marginBottom: 4},
  statLabel: {fontSize: 11, color: colors.inkSoft, fontWeight: '600', textAlign: 'center'},

  // List
  listCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  divider: {height: 1, backgroundColor: '#F3F4F6'},
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  rowLeft: {flex: 1},
  rowRef: {fontSize: 14, fontWeight: '800', color: colors.ink},
  rowAddr: {fontSize: 12, color: colors.inkSoft, marginTop: 2},
  rowDate: {fontSize: 11, color: '#9CA3AF', marginTop: 3},
  rowRight: {alignItems: 'flex-end', gap: 6},
  rowAmount: {fontSize: 16, fontWeight: '900', color: colors.ink},
  badge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99},
  badgeText: {fontSize: 10, fontWeight: '800', textTransform: 'uppercase'},

  escrowNote: {
    marginHorizontal: spacing.lg, marginTop: 8,
    fontSize: 12, color: '#B45309', lineHeight: 17,
  },

  // Empty
  emptyCard: {
    marginHorizontal: spacing.lg, backgroundColor: '#fff',
    borderRadius: radius.lg, borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 40, alignItems: 'center', gap: 8,
  },
  emptyTitle: {fontSize: 15, fontWeight: '800', color: colors.ink},
  emptyDesc: {fontSize: 13, color: colors.inkSoft},

  stripeFooter: {
    alignItems: 'center', paddingTop: spacing.lg,
  },
  stripeFooterText: {fontSize: 12, color: '#9CA3AF'},
});

export default DriverPaymentsScreen;
