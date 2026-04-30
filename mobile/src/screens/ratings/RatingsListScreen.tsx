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
      rightLabel={`${item.rating} ⭐`}
    >
      <Text style={styles.reviewText}>
        {item.comment || 'No comment provided.'}
      </Text>
      {item.jobReference && (
        <Text style={styles.jobRef}>Job: {item.jobReference}</Text>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ratings & Reviews</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{ratings?.averageRating || '0.0'}</Text>
            <Text style={styles.summaryLabel}>Avg Rating</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{ratings?.totalRatings || '0'}</Text>
            <Text style={styles.summaryLabel}>Total Reviews</Text>
          </View>
        </View>
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
            <Text style={styles.emptyIcon}>⭐</Text>
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
    backgroundColor: '#F4F1E8',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4DED0',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#102235',
    borderRadius: 20,
    padding: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#DFA622',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C4CDD6',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  listContent: {
    padding: 20,
  },
  reviewText: {
    fontSize: 14,
    color: '#18232F',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  jobRef: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A94A0',
    marginTop: 12,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#5B6671',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default RatingsListScreen;
