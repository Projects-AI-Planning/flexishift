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
import {colors, radius, spacing} from '../../theme';

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
      subtitle={`${item.pickupLocation} to ${item.dropLocation}`}
      rightLabel={item.amount ? `Rs ${item.amount}` : 'Open'}
      variant="accent">
      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Text style={styles.metaText}>{item.goodsType || 'General Goods'}</Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaText}>
            {item.vehicleTypeRequired || 'Standard Truck'}
          </Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaText}>{item.jobDate || 'Today'}</Text>
        </View>
      </View>
      <Pressable onPress={() => onSelectJob(item)} style={styles.bidButton}>
        <Text style={styles.bidButtonText}>Place Bid</Text>
      </Pressable>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Loads</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
          <TextInput
            placeholder="Search city, cargo, or truck type..."
            placeholderTextColor="#7A8699"
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
            <Text style={styles.emptyIcon}>{'\uD83D\uDE9A'}</Text>
            <Text style={styles.emptyTitle}>No Jobs Available</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for new opportunities in your area.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF5FB',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#D6E5F1',
  },
  searchIcon: {
    marginRight: spacing.sm,
    fontSize: 20,
    color: colors.inkSoft,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.ink,
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: 110,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metaChip: {
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  metaText: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  bidButton: {
    backgroundColor: colors.navy,
    borderRadius: 18,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bidButtonText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});

export default JobDiscoveryScreen;
