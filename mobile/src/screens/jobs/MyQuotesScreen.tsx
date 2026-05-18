import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import {colors, radius, spacing, shadow} from '../../theme';

interface MyQuotesScreenProps {
  quotes: any[];
  refreshing: boolean;
  onRefresh: () => void;
  onProceedToCompliance: (jobId: string, jobReference?: string, quoteAmount?: number, currency?: string) => void;
  onWithdrawQuote: (quoteId: string) => Promise<void>;
  onViewQuoteStatus?: (quote: Record<string, unknown>) => void;
  highlightedJobId?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:    'Pending',
  PENDING:   'Pending',
  ACCEPTED:  'Accepted',
  BOOKED:    'Accepted',
  DECLINED:  'Declined',
  WITHDRAWN: 'Withdrawn',
};

const MyQuotesScreen: React.FC<MyQuotesScreenProps> = ({
  quotes,
  refreshing,
  onRefresh,
  onProceedToCompliance,
  onWithdrawQuote,
  onViewQuoteStatus,
  highlightedJobId,
}) => {
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!highlightedJobId || !quotes.length) return;
    const index = quotes.findIndex(q => String(q.jobId ?? '') === highlightedJobId);
    if (index < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({index, animated: true, viewPosition: 0.2});
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightedJobId, quotes]);

  const handleWithdraw = (quoteId: string) => {
    Alert.alert('Withdraw Bid', 'Are you sure you want to withdraw this bid?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Withdraw', style: 'destructive', onPress: () => onWithdrawQuote(quoteId)},
    ]);
  };

  const renderItem = ({item}: {item: any}) => {
    const statusUpper = (item.status ?? '').toUpperCase();
    const isAccepted   = statusUpper === 'ACCEPTED' || statusUpper === 'BOOKED' || statusUpper === 'SELECTED';
    const isPending    = statusUpper === 'ACTIVE'   || statusUpper === 'PENDING';
    const isDeclined   = statusUpper === 'DECLINED';
    const isWithdrawn  = statusUpper === 'WITHDRAWN';
    const jobId        = String(item.jobId ?? '');
    const isHighlighted = !!highlightedJobId && jobId === highlightedJobId;
    // API nests route info under item.job
    const pickupLocation = item.pickupLocation ?? item.job?.pickupLocation ?? null;
    const dropLocation   = item.dropLocation   ?? item.job?.dropLocation   ?? null;

    return (
      <View style={[
        styles.card,
        isAccepted && styles.cardAccepted,
        isHighlighted && styles.cardHighlighted,
      ]}>
        {isHighlighted && (
          <View style={styles.highlightBanner}>
            <Text style={styles.highlightBannerText}>From Upcoming Schedule</Text>
          </View>
        )}
        {/* Top row: ref + status badge */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.jobRef} numberOfLines={1}>
              {item.jobReference ?? item.jobRef ?? `Job #${jobId.slice(-6)}`}
            </Text>
            <Text style={styles.submittedAt}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            isAccepted                    ? styles.badgeGreen :
            isDeclined || isWithdrawn     ? styles.badgeRed   :
            styles.badgeGrey,
          ]}>
            <Text style={[
              styles.statusText,
              isAccepted                    ? styles.statusTextGreen :
              isDeclined || isWithdrawn     ? styles.statusTextRed   :
              styles.statusTextGrey,
            ]}>
              {STATUS_LABELS[statusUpper] ?? item.status}
            </Text>
          </View>
        </View>

        {/* Route */}
        {(pickupLocation || dropLocation) ? (
          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotGreen]} />
            <Text style={styles.routeText} numberOfLines={1}>{pickupLocation ?? '—'}</Text>
            <Text style={styles.routeArrow}>→</Text>
            <View style={[styles.dot, styles.dotAmber]} />
            <Text style={styles.routeText} numberOfLines={1}>{dropLocation ?? '—'}</Text>
          </View>
        ) : null}

        {/* Bid amount + job date */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Your Bid</Text>
            <Text style={styles.statValue}>
              {item.currency ?? 'Rs'} {Number(item.quoteAmount ?? item.amount ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Job Date</Text>
            <Text style={styles.statValue}>{item.jobDate ?? 'TBC'}</Text>
          </View>
        </View>

        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>"{item.notes}"</Text>
        ) : null}

        {/* Accepted — Proceed to Compliance + View notification */}
        {isAccepted && (
          <View style={styles.acceptedSection}>
            <View style={styles.acceptedBanner}>
              <Text style={styles.acceptedBannerIcon}>🎉</Text>
              <View style={{flex: 1}}>
                <Text style={styles.acceptedBannerTitle}>Your bid was accepted!</Text>
                <Text style={styles.acceptedBannerSub}>
                  Proceed to verify the load code at pickup.
                </Text>
              </View>
            </View>
            {onViewQuoteStatus && (
              <Pressable
                onPress={() => onViewQuoteStatus(item)}
                style={styles.viewNotifBtn}>
                <Text style={styles.viewNotifText}>View Accepted Steps</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => onProceedToCompliance(
                jobId,
                item.jobReference ?? item.jobRef ?? undefined,
                Number(item.quoteAmount ?? item.amount ?? 0) || undefined,
                String(item.currency ?? 'Rs'),
              )}
              style={styles.complianceBtn}>
              <Text style={styles.complianceBtnText}>Open Pickup Steps →</Text>
            </Pressable>
          </View>
        )}

        {/* Declined */}
        {isDeclined && (
          <View style={styles.declinedSection}>
            <View style={styles.declinedBanner}>
              <Text style={styles.declinedIcon}>❌</Text>
              <View style={{flex: 1}}>
                <Text style={styles.declinedTitle}>Quote not selected</Text>
                <Text style={styles.declinedSub}>Haulier chose a different driver.</Text>
              </View>
            </View>
            {onViewQuoteStatus && (
              <Pressable
                onPress={() => onViewQuoteStatus(item)}
                style={styles.viewNotifBtn}>
                <Text style={styles.viewNotifText}>See Similar Jobs</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Pending — Withdraw */}
        {isPending && (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => handleWithdraw(item.quoteId)}
              style={styles.withdrawBtn}>
              <Text style={styles.withdrawBtnText}>Withdraw Bid</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={quotes}
      renderItem={renderItem}
      keyExtractor={item => item.quoteId ?? String(Math.random())}
      style={styles.screen}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onScrollToIndexFailed={() => {}}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>✍️</Text>
          <Text style={styles.emptyTitle}>No Active Bids</Text>
          <Text style={styles.emptySub}>
            Go to Find Jobs to place your first bid.
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bg},
  listContent: {
    padding: spacing.xl,
    paddingBottom: 120,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccepted: {
    borderColor: '#1066B1',
    borderWidth: 2,
  },
  cardHighlighted: {
    borderColor: '#1066B1',
    borderWidth: 2,
    backgroundColor: '#EBF4FF',
  },
  highlightBanner: {
    backgroundColor: '#1066B1',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  highlightBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  jobRef: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  submittedAt: {
    color: colors.inkSoft,
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGreen: {backgroundColor: '#DBEAFE'},
  badgeRed:   {backgroundColor: '#FEE2E2'},
  badgeGrey:  {backgroundColor: '#F1F5F9'},
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextGreen: {color: '#1066B1'},
  statusTextRed:   {color: '#B91C1C'},
  statusTextGrey:  {color: '#64748B'},
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFD',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  dotGreen: {backgroundColor: '#1066B1'},
  dotAmber: {backgroundColor: colors.accent},
  routeText: {
    flex: 1,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  routeArrow: {
    color: colors.inkSoft,
    fontSize: 12,
    flexShrink: 0,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFD',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statBox: {flex: 1},
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  statLabel: {
    color: colors.inkSoft,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  statValue: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
  },
  notesText: {
    color: colors.inkSoft,
    fontSize: 13,
    fontStyle: 'italic',
  },
  acceptedSection: {
    gap: spacing.md,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  acceptedBannerIcon: {fontSize: 24},
  acceptedBannerTitle: {
    color: '#1066B1',
    fontSize: 14,
    fontWeight: '900',
  },
  acceptedBannerSub: {
    color: '#166534',
    fontSize: 12,
    marginTop: 2,
  },
  complianceBtn: {
    backgroundColor: '#1066B1',
    borderRadius: radius.lg,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  complianceBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  actionRow: {
    marginTop: 2,
  },
  withdrawBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  viewNotifBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewNotifText: {color: colors.accent, fontSize: 13, fontWeight: '800'},
  declinedSection: {gap: spacing.sm},
  declinedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#FEF2F2', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: '#FECACA',
  },
  declinedIcon: {fontSize: 20},
  declinedTitle: {color: '#B91C1C', fontSize: 13, fontWeight: '900'},
  declinedSub: {color: '#7F1D1D', fontSize: 11, marginTop: 2},
  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
    gap: spacing.md,
  },
  emptyIcon: {fontSize: 56},
  emptyTitle: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
  },
  emptySub: {
    color: colors.inkSoft,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
});

export default MyQuotesScreen;
