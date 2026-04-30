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
import {colors, radius, shadow, spacing} from '../../theme';

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
  const totalEarnings = earnings?.summary?.totalEarnings ?? 0;
  const totalJobs = earnings?.summary?.totalJobs ?? 0;
  const onTimeRate = dashboard?.performance?.onTimeRate ?? '98';
  const rating = dashboard?.performance?.rating ?? '4.8';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.topCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{'\uD83D\uDC64'}</Text>
        </View>
        <Text style={styles.topTitle}>Logistics Core</Text>
        <Pressable style={styles.schedulePill}>
          <Text style={styles.schedulePillText}>Schedule</Text>
        </Pressable>
        <Text style={styles.bell}>{'\uD83D\uDD14'}</Text>
      </View>

      <Text style={styles.greeting}>Welcome, Driver</Text>
      <View style={styles.statusRow}>
        <View style={styles.greenDot} />
        <Text style={styles.statusText}>Ready for Loads</Text>
      </View>

      <Pressable
        onPress={() => onQuickAction('find_jobs')}
        style={styles.searchBanner}>
        <View>
          <Text style={styles.searchTitle}>Find New Jobs</Text>
          <Text style={styles.searchSubtitle}>
            Browse available freight in your area
          </Text>
        </View>
        <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
      </Pressable>

      <Card title="Today's Earnings" rightLabel="+12%" variant="accent">
        <View style={styles.earningsRow}>
          <Text style={styles.earningsValue}>${Number(totalEarnings).toFixed(2)}</Text>
          <View style={styles.goalPill}>
            <Text style={styles.goalPillText}>Target: $550.00</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </Card>

      <View style={styles.metricGrid}>
        <Card title="Weekly Loads" subtitle="Completed in the last 7 days">
          <Text style={styles.metricValue}>{String(totalJobs || 24)}</Text>
        </Card>
        <Card title="On-Time Rate" subtitle="Average delivery punctuality">
          <Text style={styles.metricValue}>{String(onTimeRate)}%</Text>
        </Card>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Active Assignment</Text>
        <View style={styles.jobPill}>
          <Text style={styles.jobPillText}>
            {activeJob?.jobReference || 'JOB #FF-90210'}
          </Text>
        </View>
      </View>

      <Card
        title={activeJob ? 'Current Load' : 'No Active Load'}
        subtitle={
          activeJob
            ? `${activeJob.pickupLocation} to ${activeJob.dropLocation}`
            : 'No live shipment assigned right now'
        }
        variant={activeJob ? 'default' : 'accent'}>
        {activeJob ? (
          <>
            <View style={styles.mapMock}>
              <View style={styles.mapLine} />
              <View style={[styles.mapStop, styles.mapStart]} />
              <View style={[styles.mapStop, styles.mapTruck]} />
              <View style={[styles.mapStop, styles.mapEnd]} />
              <Text style={styles.mapOverlay}>
                {String(activeJob.distanceRemaining ?? '84 miles remaining')}
              </Text>
            </View>
            <View style={styles.pickupRow}>
              <View style={styles.pickupIcon}>
                <Text style={styles.pickupIconText}>{'\uD83D\uDCCD'}</Text>
              </View>
              <View style={styles.pickupCopy}>
                <Text style={styles.pickupLabel}>Pickup</Text>
                <Text style={styles.pickupValue}>
                  {String(activeJob.pickupLocation ?? 'Elizabeth, NJ')}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => onViewJob(activeJob)}
              style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Details</Text>
            </Pressable>
          </>
        ) : (
          <View>
            <Text style={styles.emptyText}>
              Use Find New Jobs to browse available freight.
            </Text>
            <Pressable
              onPress={() => onQuickAction('find_jobs')}
              style={styles.viewButton}>
              <Text style={styles.viewButtonText}>Browse Jobs</Text>
            </Pressable>
          </View>
        )}
      </Card>

      <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
      <Card title="Regional Freight Haul" subtitle="Start time: 06:00 AM • 120 mi">
        <View style={styles.scheduleRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateSmall}>TOM</Text>
            <Text style={styles.dateLarge}>08</Text>
          </View>
          <View style={styles.scheduleMeta}>
            <Text style={styles.scheduleTitle}>Regional Freight Haul</Text>
            <Text style={styles.scheduleSubtitle}>
              Start time: 06:00 AM • 120 mi
            </Text>
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
        </View>
      </Card>

      <View style={styles.footerSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  topCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: spacing.md,
    marginBottom: spacing.xl,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D7E5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
  },
  topTitle: {
    flex: 1,
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
  },
  schedulePill: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
  },
  schedulePillText: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '800',
  },
  bell: {
    fontSize: 24,
    color: colors.inkSoft,
  },
  greeting: {
    color: colors.navy,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  greenDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    marginRight: spacing.md,
  },
  statusText: {
    color: '#4B5563',
    fontSize: 18,
    fontWeight: '600',
  },
  searchBanner: {
    backgroundColor: '#8BC0EE',
    borderRadius: 18,
    padding: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  searchTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  searchSubtitle: {
    color: colors.ink,
    fontSize: 16,
    marginTop: 6,
  },
  searchIcon: {
    color: colors.ink,
    fontSize: 46,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  earningsValue: {
    color: colors.navy,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  goalPill: {
    backgroundColor: '#E8F8ED',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  goalPillText: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#E9EDF2',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    width: '74%',
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  metricValue: {
    color: colors.navy,
    fontSize: 36,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeader: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
  },
  jobPill: {
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  jobPillText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '900',
  },
  mapMock: {
    height: 180,
    borderRadius: 18,
    backgroundColor: '#DDECE0',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  mapLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '50%',
    height: 5,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  mapStop: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
  },
  mapStart: {
    left: '10%',
    top: '47%',
  },
  mapTruck: {
    left: '48%',
    top: '47%',
    backgroundColor: colors.navy,
  },
  mapEnd: {
    right: '10%',
    top: '47%',
    backgroundColor: colors.success,
  },
  mapOverlay: {
    position: 'absolute',
    left: spacing.lg,
    bottom: spacing.lg,
    color: colors.card,
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pickupIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pickupIconText: {
    fontSize: 18,
  },
  pickupCopy: {
    flex: 1,
  },
  pickupLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pickupValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  viewButton: {
    backgroundColor: colors.navy,
    borderRadius: 18,
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    color: colors.card,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.inkSoft,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBox: {
    width: 72,
    height: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D6DCE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    backgroundColor: '#F8FAFD',
  },
  dateSmall: {
    color: colors.inkSoft,
    fontSize: 14,
    fontWeight: '900',
  },
  dateLarge: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  scheduleMeta: {
    flex: 1,
  },
  scheduleTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  scheduleSubtitle: {
    color: colors.inkSoft,
    fontSize: 15,
    marginTop: 4,
  },
  chevron: {
    color: colors.inkSoft,
    fontSize: 38,
    marginLeft: spacing.sm,
  },
  footerSpacing: {
    height: 20,
  },
});

export default DashboardScreen;
