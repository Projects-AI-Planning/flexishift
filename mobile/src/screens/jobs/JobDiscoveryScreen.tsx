import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import Card from '../../components/common/Card';

interface JobDiscoveryScreenProps {
  availableJobs: any[];
  onSelectJob: (job: any) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

const JobDiscoveryScreen: React.FC<JobDiscoveryScreenProps> = ({
  availableJobs,
  onSelectJob,
  refreshing,
  onRefresh,
}) => {
  const renderJobItem = ({item}: {item: any}) => (
    <Card
      title={item.jobReference || 'Job Opportunity'}
      subtitle={`${item.pickupLocation} ➔ ${item.dropLocation}`}
      rightLabel={item.amount ? `Rs ${item.amount}` : 'Open Quote'}>
      <View style={styles.jobDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📦</Text>
          <Text style={styles.detailText}>{item.goodsType || 'General Goods'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>🚛</Text>
          <Text style={styles.detailText}>{item.vehicleTypeRequired || 'Standard Truck'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>{item.jobDate || 'Today'}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => onSelectJob(item)}
        style={styles.bidButton}>
        <Text style={styles.bidButtonText}>Place Bid</Text>
      </Pressable>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Loads</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search city, cargo, or truck type..."
            placeholderTextColor="#8A94A0"
            style={styles.searchInput}
          />
        </View>
      </View>

      <FlatList
        data={availableJobs}
        keyExtractor={item => item.jobId || String(Math.random())}
        renderItem={renderJobItem}
        contentContainerStyle={styles.listContent}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={styles.emptyTitle}>No Jobs Available</Text>
            <Text style={styles.emptySubtitle}>Check back later for new opportunities in your area.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1E8',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E4DED0',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1E8',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#18232F',
  },
  listContent: {
    padding: 20,
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B6671',
  },
  bidButton: {
    backgroundColor: '#102235',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bidButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
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

export default JobDiscoveryScreen;
