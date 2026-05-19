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
import ActiveJobMap from '../../components/map/ActiveJobMap';
import {colors, radius, shadow, spacing} from '../../theme';

const DAILY_TARGET = 550;

interface DashboardScreenProps {
  dashboard: any;
  driverName?: string;
  earnings: any;
  averageRating?: number;
  upcomingJobs?: any[];
  refreshing: boolean;
  onRefresh: () => void;
  onViewJob: (job: any) => void;
  onQuickAction: (action: string) => void;
}

const StarRating: React.FC<{rating: number}> = ({rating}) => (
  <View style={starStyles.row}>
    {[1, 2, 3, 4, 5].map(i => {
      const filled = rating >= i;
      const half = !filled && rating >= i - 0.5;
      return (
        <Text
          key={i}
          style={[starStyles.star, filled || half ? starStyles.filled : starStyles.empty]}>
          {half ? '⯨' : '★'}
        </Text>
      );
    })}
    <Text style={starStyles.label}>
      {rating > 0 ? rating.toFixed(1) : 'No rating'}
    </Text>
  </View>
);

const starStyles = StyleSheet.create({
  row: {alignItems: 'center', flexDirection: 'row', gap: 2},
  star: {fontSize: 13},
  filled: {color: '#DFA622'},
  empty: {color: '#C9D0DB'},
  label: {color: '#92620A', fontSize: 12, fontWeight: '800', marginLeft: 4},
});

function formatScheduleDate(dateStr: any): {dayLabel: string; dayNum: string; timeLabel: string} {
  if (!dateStr) return {dayLabel: 'TBD', dayNum: '--', timeLabel: ''};
  try {
    const d = new Date(String(dateStr));
    if (isNaN(d.getTime())) return {dayLabel: 'TBD', dayNum: '--', timeLabel: ''};
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return {
      dayLabel: dayNames[d.getDay()],
      dayNum: String(d.getDate()).padStart(2, '0'),
      timeLabel: `${h12}:${minutes} ${ampm}`,
    };
  } catch {
    return {dayLabel: 'TBD', dayNum: '--', timeLabel: ''};
  }
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  dashboard,
  driverName,
  earnings,
  averageRating = 0,
  upcomingJobs = [],
  refreshing,
  onRefresh,
  onViewJob,
  onQuickAction,
}) => {
  const activeJob = dashboard?.activeJob;
  const totalEarnings = Number(earnings?.summary?.totalEarnings ?? 0);
  const totalJobs = earnings?.summary?.totalJobs ?? 0;
  const onTimeRate = dashboard?.performance?.onTimeRate ?? '0';
  const firstName = (driverName ?? 'Driver').split(' ')[0];
  const progressPct = Math.min((totalEarnings / DAILY_TARGET) * 100, 100);
  const rating = Number(dashboard?.rating ?? averageRating ?? 0);

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
          <StarRating rating={rating} />
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
      <Card title="Today's Earnings" variant="accent">
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
            <Text style={styles.metricValue}>{String(totalJobs ?? 0)}</Text>
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
            <ActiveJobMap
              pickupLocation={
                typeof activeJob.pickupLocation === 'object'
                  ? String((activeJob.pickupLocation as any)?.address ?? (activeJob.pickupLocation as any)?.city ?? '')
                  : String(activeJob.pickupLocation ?? '')
              }
              dropLocation={
                typeof activeJob.dropLocation === 'object'
                  ? String((activeJob.dropLocation as any)?.address ?? (activeJob.dropLocation as any)?.city ?? '')
                  : String(activeJob.dropLocation ?? '')
              }
              pickupCoords={
                activeJob.pickupLat != null && activeJob.pickupLng != null
                  ? {latitude: Number(activeJob.pickupLat), longitude: Number(activeJob.pickupLng)}
                  : null
              }
              dropCoords={
                activeJob.dropLat != null && activeJob.dropLng != null
                  ? {latitude: Number(activeJob.dropLat), longitude: Number(activeJob.dropLng)}
                  : null
              }
              currentCoords={
                activeJob.currentLocation?.latitude != null && activeJob.currentLocation?.longitude != null
                  ? {
                      latitude: Number(activeJob.currentLocation.latitude),
                      longitude: Number(activeJob.currentLocation.longitude),
                    }
                  : null
              }
            />
            <View style={styles.routeRow}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, styles.routeDotStart]} />
                <View>
                  <Text style={styles.routeLabel}>PICKUP</Text>
                  <Text style={styles.routeValue}>
                    {String(activeJob.pickupLocation ?? '—')}
                  </Text>
                </View>
              </View>
              <View style={styles.routeDivider} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, styles.routeDotEnd]} />
                <View>
                  <Text style={styles.routeLabel}>DROP-OFF</Text>
                  <Text style={styles.routeValue}>
                    {String(activeJob.dropLocation ?? '—')}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={() => onViewJob(activeJob)}
              style={styles.activeViewButton}>
              <Text style={styles.activeViewButtonText}>View Details</Text>
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
      {upcomingJobs.length === 0 ? (
        <Card title="No Upcoming Jobs" variant="accent">
          <Text style={styles.emptyText}>
            Accepted jobs will appear here once scheduled.
          </Text>
          <Pressable
            onPress={() => onQuickAction('find_jobs')}
            style={styles.viewButton}>
            <Text style={styles.viewButtonText}>Browse Jobs</Text>
          </Pressable>
        </Card>
      ) : (
        upcomingJobs.map((job, idx) => {
          const pickup =
            typeof job.pickupLocation === 'object'
              ? String((job.pickupLocation as any)?.address ?? '')
              : String(job.pickupLocation ?? '');
          const drop =
            typeof job.dropLocation === 'object'
              ? String((job.dropLocation as any)?.address ?? '')
              : String(job.dropLocation ?? '');
          const dist = job.estimatedDistance ?? job.distance ?? '';
          const {dayLabel, dayNum, timeLabel} = formatScheduleDate(
            job.scheduledDate ?? job.jobDate ?? job.pickupDate,
          );
          const distLabel = dist ? ` • ${String(dist)} mi` : '';
          const timeStr = timeLabel ? `${timeLabel}${distLabel}` : distLabel.replace(' • ', '') || 'Scheduled';
          return (
            <Pressable key={String(job.jobId ?? idx)} onPress={() => onViewJob(job)}>
              <Card
                title={String(job.jobReference ?? `Job #${idx + 1}`)}
                subtitle={pickup && drop ? `${pickup} → ${drop}` : timeStr}>
                <View style={styles.scheduleRow}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateSmall}>{dayLabel}</Text>
                    <Text style={styles.dateLarge}>{dayNum}</Text>
                  </View>
                  <View style={styles.scheduleMeta}>
                    <Text style={styles.scheduleTitle}>
                      {String(job.jobReference ?? job.cargoType ?? 'Freight Job')}
                    </Text>
                    <Text style={styles.scheduleSubtitle}>
                      {timeStr}
                    </Text>
                    {pickup && drop ? (
                      <Text style={styles.scheduleRoute} numberOfLines={1}>
                        {pickup} → {drop}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.chevron}>{'›'}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })
      )}


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
    paddingBottom: spacing.xl,
    flexGrow: 1,
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
    backgroundColor: '#EBF4FF',
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
    backgroundColor: '#1066B1',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  jobPillText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '900',
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
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeViewButton: {
    backgroundColor: '#1066B1',
    borderColor: '#0E5A9D',
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0E5A9D',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  activeViewButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
  scheduleRoute: {
    color: colors.inkSoft,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: colors.inkSoft,
    fontSize: 28,
    marginLeft: spacing.sm,
  },
});

export default DashboardScreen;
