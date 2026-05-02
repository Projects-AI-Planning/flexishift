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

const DAILY_TARGET = 550;

interface DashboardScreenProps {
  dashboard: any;
  driverName?: string;
  earnings: any;
  refreshing: boolean;
  onRefresh: () => void;
  onViewJob: (job: any) => void;
  onQuickAction: (action: string) => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  dashboard,
  driverName,
  earnings,
  refreshing,
  onRefresh,
  onViewJob,
  onQuickAction,
}) => {
  const activeJob = dashboard?.activeJob;
  const totalEarnings = Number(earnings?.summary?.totalEarnings ?? 0);
  const totalJobs = earnings?.summary?.totalJobs ?? 0;
  const onTimeRate = dashboard?.performance?.onTimeRate ?? '98';
  const rating = dashboard?.performance?.rating ?? '4.8';
  const firstName = (driverName ?? 'Driver').split(' ')[0];
  const progressPct = Math.min((totalEarnings / DAILY_TARGET) * 100, 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>

      {/* Greeting */}
      <Text style={styles.greeting}>Hello, {firstName}</Text>
      <View style={styles.statusRow}>
        <View style={styles.greenDot} />
        <Text style={styles.statusText}>Ready for Loads</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {String(rating)}</Text>
        </View>
      </View>

      {/* Find Jobs banner */}
      <Pressable
        onPress={() => onQuickAction('find_jobs')}
        style={styles.searchBanner}>
        <View style={styles.searchTextWrap}>
          <Text style={styles.searchTitle}>Find New Jobs</Text>
          <Text style={styles.searchSubtitle}>
            Browse available freight in your area
          </Text>
        </View>
        <Text style={styles.searchIcon}>{'🔍'}</Text>
      </Pressable>

      {/* Today's Earnings */}
      <Card title="Today's Earnings" rightLabel="+12%" variant="accent">
        <View style={styles.earningsRow}>
          <Text style={styles.earningsValue}>${totalEarnings.toFixed(2)}</Text>
          <View style={styles.goalPill}>
            <Text style={styles.goalPillText}>Target: ${DAILY_TARGET}.00</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {width: `${progressPct}%`}]} />
        </View>
        <Text style={styles.progressLabel}>
          {progressPct.toFixed(0)}% of daily target
        </Text>
      </Card>

      {/* Metric grid */}
      <View style={styles.metricGrid}>
        <View style={styles.metricItem}>
          <Card title="Weekly Loads" subtitle="Last 7 days">
            <Text style={styles.metricValue}>{String(totalJobs || 24)}</Text>
          </Card>
        </View>
        <View style={styles.metricItem}>
          <Card title="On-Time Rate" subtitle="Punctuality">
            <Text style={styles.metricValue}>{String(onTimeRate)}%</Text>
          </Card>
        </View>
      </View>

      {/* Active Assignment */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Active Assignment</Text>
        {activeJob && (
          <View style={styles.jobPill}>
            <Text style={styles.jobPillText}>
              {activeJob?.jobReference ?? 'JOB #FF-90210'}
            </Text>
          </View>
        )}
      </View>

      <Card
        title={activeJob ? 'Current Load' : 'No Active Load'}
        subtitle={
          activeJob
            ? `${activeJob.pickupLocation} → ${activeJob.dropLocation}`
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
            <View style={styles.routeRow}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, styles.routeDotStart]} />
                <View>
                  <Text style={styles.routeLabel}>PICKUP</Text>
                  <Text style={styles.routeValue}>
                    {String(activeJob.pickupLocation ?? 'Elizabeth, NJ')}
                  </Text>
                </View>
              </View>
              <View style={styles.routeDivider} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, styles.routeDotEnd]} />
                <View>
                  <Text style={styles.routeLabel}>DROP-OFF</Text>
                  <Text style={styles.routeValue}>
                    {String(activeJob.dropLocation ?? 'Newark, NJ')}
                  </Text>
                </View>
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

      {/* Upcoming Schedule */}
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
              06:00 AM • 120 mi
            </Text>
          </View>
          <Text style={styles.chevron}>{'›'}</Text>
        </View>
      </Card>

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
    paddingBottom: 32,
  },
  greeting: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  statusText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  ratingBadge: {
    backgroundColor: '#FFF3D5',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  ratingText: {
    color: '#92620A',
    fontSize: 13,
    fontWeight: '800',
  },
  searchBanner: {
    backgroundColor: '#8BC0EE',
    borderRadius: radius.lg,
    padding: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  searchTextWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  searchTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  searchSubtitle: {
    color: colors.ink,
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
  searchIcon: {
    fontSize: 36,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  earningsValue: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  goalPill: {
    backgroundColor: '#E8F8ED',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  goalPillText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E9EDF2',
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
  },
  progressLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  metricItem: {
    flex: 1,
  },
  metricValue: {
    color: colors.navy,
    fontSize: 28,
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
    fontSize: 20,
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
    fontSize: 12,
    fontWeight: '900',
  },
  mapMock: {
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: '#DDECE0',
    marginBottom: spacing.md,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  mapLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '50%',
    height: 4,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  mapStop: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
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
    bottom: spacing.md,
    color: colors.card,
    fontSize: 14,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  routePoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  routeDotStart: {
    backgroundColor: colors.accent,
  },
  routeDotEnd: {
    backgroundColor: colors.success,
  },
  routeDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  routeLabel: {
    color: colors.inkSoft,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  viewButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.inkSoft,
    fontSize: 14,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBox: {
    width: 58,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D6DCE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    backgroundColor: '#F8FAFD',
    flexShrink: 0,
  },
  dateSmall: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  dateLarge: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
  },
  scheduleMeta: {
    flex: 1,
  },
  scheduleTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  scheduleSubtitle: {
    color: colors.inkSoft,
    fontSize: 13,
    marginTop: 4,
  },
  chevron: {
    color: colors.inkSoft,
    fontSize: 28,
    marginLeft: spacing.sm,
  },
});

export default DashboardScreen;
