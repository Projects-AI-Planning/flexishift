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
import {RatingSummary, RatingReviewItem} from '../../types';

interface RatingsListScreenProps {
  ratings: RatingSummary | null;
  refreshing: boolean;
  onRefresh: () => void;
}

const renderRatingItem = ({item}: {item: RatingReviewItem}) => (
  <Card
    title={item.raterName || 'Haulier'}
    subtitle={item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'}) : 'Recently'}
    rightLabel={`${item.rating} ★`}
    variant="default">
    <Text style={styles.reviewText}>{item.comment || 'No comment provided.'}</Text>
    {item.jobReference ? (
      <Text style={styles.jobRef}>Job: {item.jobReference}</Text>
    ) : null}
  </Card>
);

const RatingsListScreen: React.FC<RatingsListScreenProps> = ({
  ratings,
  refreshing,
  onRefresh,
}) => {
  const avgDisplay = ratings?.averageRating
    ? ratings.averageRating.toFixed(1)
    : '0.0';
  const totalDisplay = ratings?.totalRatings ?? 0;
  const reviewsList: RatingReviewItem[] = (ratings?.reviews as RatingReviewItem[]) ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.profileCircle}>
          <Text style={styles.profileInitial}>
            {ratings?.name ? ratings.name.charAt(0).toUpperCase() : '👤'}
          </Text>
        </View>
        <Text style={styles.driverName}>{ratings?.name || 'My Profile'}</Text>
        <Text style={styles.ratingLine}>
          {'⭐'}{' '}
          <Text style={styles.ratingValue}>{avgDisplay}</Text>
          <Text style={styles.ratingMeta}> ({totalDisplay} {totalDisplay === 1 ? 'review' : 'reviews'})</Text>
        </Text>
      </View>

      <FlatList
        data={reviewsList}
        renderItem={renderRatingItem}
        keyExtractor={item => item.ratingId || String(Math.random())}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'⭐'}</Text>
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptySubtitle}>
              Completed jobs will appear here once hauliers leave feedback.
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#151A32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileInitial: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '900',
  },
  driverName: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  ratingLine: {
    fontSize: 20,
    color: colors.accent,
    fontWeight: '900',
  },
  ratingValue: {
    color: colors.navy,
  },
  ratingMeta: {
    color: colors.inkSoft,
    fontWeight: '700',
    fontSize: 16,
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
