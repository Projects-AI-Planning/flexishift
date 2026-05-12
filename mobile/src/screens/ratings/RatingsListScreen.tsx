import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, spacing} from '../../theme';

interface RatingsListScreenProps {
  ratings: any;
  refreshing: boolean;
  onRefresh: () => void;
}

const RatingsListScreen: React.FC<RatingsListScreenProps> = ({
  ratings,
  refreshing,
  onRefresh,
}) => {
  const renderRatingItem = ({item}: {item: any}) => (
    <Card
      title={item.raterName || 'Shipper'}
      subtitle={item.createdAt || 'Recently'}
      rightLabel={`${item.rating} ★`}
      variant="default">
      <Text style={styles.reviewText}>{item.comment || 'No comment provided.'}</Text>
      {item.jobReference ? (
        <Text style={styles.jobRef}>Job: {item.jobReference}</Text>
      ) : null}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.orderText}>Order #TR-9422</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.profileCircle}>
          <Text style={styles.profileIcon}>{'\uD83D\uDC64'}</Text>
        </View>
        <Text style={styles.companyName}>Atlas Freight Systems</Text>
        <Text style={styles.ratingLine}>
          {'\u2B50'} <Text style={styles.ratingValue}>{ratings?.averageRating || '4.8'}</Text>
          <Text style={styles.ratingMeta}>
            {' '}
            ({ratings?.totalRatings || '1,240'} reviews)
          </Text>
        </Text>
        <View style={styles.partnerPill}>
          <Text style={styles.partnerText}>ELITE PARTNER</Text>
        </View>
      </View>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>Payment Released</Text>
        <Text style={styles.noticeBody}>
          Delivery confirmed. $1,420.00 has been added to your wallet.
        </Text>
      </View>

      <FlatList
        data={ratings?.reviews || []}
        renderItem={renderRatingItem}
        keyExtractor={item => item.ratingId || String(Math.random())}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u2B50'}</Text>
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptySubtitle}>
              Completed jobs will appear here once shippers leave feedback.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.navy,
  },
  orderText: {
    fontSize: 14,
    color: colors.inkSoft,
    fontWeight: '700',
  },
  summaryCard: {
    margin: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#0B1320',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  profileCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#151A32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileIcon: {
    fontSize: 52,
  },
  companyName: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  ratingLine: {
    marginTop: spacing.sm,
    fontSize: 22,
    color: colors.accent,
    fontWeight: '900',
  },
  ratingValue: {
    color: colors.navy,
  },
  ratingMeta: {
    color: colors.inkSoft,
    fontWeight: '700',
    fontSize: 18,
  },
  partnerPill: {
    backgroundColor: '#B5C9E0',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  partnerText: {
    color: colors.navy,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  noticeCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: '#E7F1FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C7DCF7',
    padding: spacing.xl,
  },
  noticeTitle: {
    color: '#1262B3',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  noticeBody: {
    color: '#1262B3',
    fontSize: 18,
    lineHeight: 24,
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  reviewText: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  jobRef: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.inkSoft,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default RatingsListScreen;
