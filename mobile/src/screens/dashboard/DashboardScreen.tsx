import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import Card from '../../components/common/Card';

interface DashboardScreenProps {
  dashboard: any;
  earnings: any;
  refreshing: boolean;
  onRefresh: () => void;
  onViewJob: (job: any) => void;
  onQuickAction: (action: string) => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  dashboard,
  earnings,
  refreshing,
  onRefresh,
  onViewJob,
  onQuickAction,
}) => {
  const activeJob = dashboard?.activeJob;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <Text style={styles.welcomeText}>Hello, Driver</Text>
      <Text style={styles.dateText}>Thursday, 30 April 2026</Text>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Monthly Earnings</Text>
          <Text style={styles.statValue}>
            Rs {earnings?.summary?.totalEarnings ?? '0'}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={statStyles.label}>Jobs Done</Text>
          <Text style={statStyles.value}>
            {earnings?.summary?.totalJobs ?? '0'}
          </Text>
        </View>
      </View>

      {/* Active Job Card */}
      <Card
        title="Active Shipment"
        subtitle={activeJob ? `Ref: ${activeJob.jobReference}` : 'No active shipment'}
        rightLabel={activeJob?.status ?? 'Idle'}
        variant={activeJob ? 'dark' : 'default'}>
        {activeJob ? (
          <View>
            <View style={styles.routeContainer}>
              <View style={styles.dotContainer}>
                <View style={styles.dot} />
                <View style={styles.line} />
                <View style={[styles.dot, styles.dotEnd]} />
              </View>
              <View style={styles.addressContainer}>
                <Text style={activeJob ? styles.addressTextWhite : styles.addressText}>
                  {activeJob.pickupLocation}
                </Text>
                <Text style={activeJob ? styles.addressTextWhite : styles.addressText}>
                  {activeJob.dropLocation}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => onViewJob(activeJob)}
              style={styles.actionButton}>
              <Text style={styles.actionButtonText}>View Details</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.emptyText}>You don't have any active jobs at the moment.</Text>
        )}
      </Card>

      {/* Performance Summary */}
      <Card title="Performance" subtitle="Weekly overview">
        <View style={styles.performanceRow}>
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{dashboard?.performance?.rating ?? '4.8'}</Text>
            <Text style={styles.perfLabel}>Rating</Text>
          </View>
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{dashboard?.performance?.onTimeRate ?? '98'}%</Text>
            <Text style={styles.perfLabel}>On-Time</Text>
          </View>
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{dashboard?.performance?.acceptanceRate ?? '92'}%</Text>
            <Text style={styles.perfLabel}>Acceptance</Text>
          </View>
        </View>
      </Card>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <Pressable 
          onPress={() => onQuickAction('find_jobs')}
          style={styles.quickActionBtn}>
          <Text style={styles.quickActionIcon}>📦</Text>
          <Text style={styles.quickActionLabel}>Find Jobs</Text>
        </Pressable>
        <Pressable 
          onPress={() => onQuickAction('tracking')}
          style={styles.quickActionBtn}>
          <Text style={styles.quickActionIcon}>📍</Text>
          <Text style={styles.quickActionLabel}>Tracking</Text>
        </Pressable>
        <Pressable 
          onPress={() => onQuickAction('payouts')}
          style={styles.quickActionBtn}>
          <Text style={styles.quickActionIcon}>💰</Text>
          <Text style={styles.quickActionLabel}>Payouts</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const statStyles = StyleSheet.create({
    label: {
        fontSize: 12,
        color: '#5B6671',
        marginBottom: 4,
    },
    value: {
        fontSize: 20,
        fontWeight: '900',
        color: '#18232F',
    }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1E8',
  },
  content: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#102235',
  },
  dateText: {
    fontSize: 14,
    color: '#5B6671',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4DED0',
  },
  statLabel: {
    fontSize: 12,
    color: '#5B6671',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#18232F',
  },
  routeContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 20,
  },
  dotContainer: {
    alignItems: 'center',
    marginRight: 12,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DFA622',
  },
  dotEnd: {
    backgroundColor: '#18794E',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E4DED0',
    marginVertical: 4,
  },
  addressContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  addressText: {
    fontSize: 14,
    color: '#18232F',
    fontWeight: '600',
  },
  addressTextWhite: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#DFA622',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#102235',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 14,
    color: '#5B6671',
    fontStyle: 'italic',
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  perfItem: {
    alignItems: 'center',
  },
  perfValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#102235',
  },
  perfLabel: {
    fontSize: 11,
    color: '#5B6671',
    marginTop: 4,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102235',
    marginTop: 8,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  quickActionBtn: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4DED0',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#102235',
  },
});

export default DashboardScreen;
