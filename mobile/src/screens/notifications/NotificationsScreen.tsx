import React, {useMemo, useState} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';
import Icon, {IconName} from '../../components/common/Icon';

interface NotificationsScreenProps {
  notifications: any[];
  unreadCount: number;
  refreshing: boolean;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  onMarkRead?: (notificationId: string) => void;
  onOpenNotification?: (notification: any) => void;
}

type FilterKey = 'all' | 'jobs' | 'payments' | 'routes';
type GroupKey = 'today' | 'yesterday';

const FILTERS: Array<{key: FilterKey; label: string}> = [
  {key: 'all', label: 'All'},
  {key: 'jobs', label: 'Jobs'},
  {key: 'payments', label: 'Payments'},
  {key: 'routes', label: 'Routes'},
];

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function getMessage(item: any): string {
  return String(item?.message ?? item?.body ?? item?.description ?? '').trim();
}

function getCategory(item: any): FilterKey {
  const type = normalize(item?.type);
  if (type.includes('document_approved') || type.includes('document_rejected')) {
    return 'jobs';
  }
  const haystack = `${type} ${normalize(item?.title)} ${normalize(getMessage(item))}`;
  if (
    haystack.includes('payment') ||
    haystack.includes('invoice') ||
    haystack.includes('deposit')
  ) {
    return 'payments';
  }
  if (
    haystack.includes('route') ||
    haystack.includes('tracking') ||
    haystack.includes('compliance') ||
    haystack.includes('bol') ||
    haystack.includes('delivery')
  ) {
    return 'routes';
  }
  return 'jobs';
}

function parseTimestamp(value: string): Date {
  // Backend returns UTC without timezone suffix — append Z so JS parses correctly
  if (!value.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value + 'Z');
  }
  return new Date(value);
}

function getGroupKey(createdAt?: string | null): GroupKey {
  if (!createdAt) return 'yesterday';
  const date = parseTimestamp(createdAt);
  if (Number.isNaN(date.getTime())) return 'yesterday';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date >= startOfToday ? 'today' : 'yesterday';
}

function formatRelativeTime(value?: string | null): string {
  if (!value) return 'Recently';
  const date = parseTimestamp(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function extractJobRef(item: any): string | null {
  const data = item?.data ?? {};
  const value =
    data?.job_ref ??
    data?.jobRef ??
    data?.jobReference ??
    data?.job_reference ??
    item?.jobRef ??
    item?.jobReference ??
    null;
  return value ? String(value) : null;
}

interface IconStyle {
  name: IconName;
  bg: string;
  color: string;
}

function resolveIconStyle(item: any): IconStyle {
  const type = normalize(item?.type);
  if (type.includes('document_approved')) {
    return {name: 'check-circle', bg: '#EBF4FF', color: '#1066B1'};
  }
  if (type.includes('document_rejected')) {
    return {name: 'x-circle', bg: '#FEF2F2', color: '#DC2626'};
  }
  if (type.includes('document')) {
    return {name: 'file-text', bg: '#F5F3FF', color: '#7C3AED'};
  }
  const category = getCategory(item);
  if (category === 'payments') {
    return {name: 'credit-card', bg: '#EBF4FF', color: '#1066B1'};
  }
  if (category === 'routes') {
    return {name: 'map', bg: '#FFFBEB', color: '#B45309'};
  }
  return {name: 'briefcase', bg: '#EBF4FF', color: '#1566C0'};
}

interface PillStyle {
  label: string;
  bg: string;
  color: string;
}

function resolvePill(item: any): PillStyle {
  const type = normalize(item?.type);
  if (type.includes('document_approved')) {
    return {label: 'Approved', bg: '#DBEAFE', color: '#1066B1'};
  }
  if (type.includes('document_rejected')) {
    return {label: 'Rejected', bg: '#FEE2E2', color: '#B91C1C'};
  }
  if (type.includes('document')) {
    return {label: 'Document', bg: '#EDE9FE', color: '#6D28D9'};
  }
  const category = getCategory(item);
  if (category === 'payments') return {label: 'Payment', bg: '#DBEAFE', color: '#1066B1'};
  if (category === 'routes') return {label: 'Route', bg: '#FEF3C7', color: '#92400E'};
  return {label: 'Job', bg: '#DBEAFE', color: '#1E40AF'};
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications,
  unreadCount,
  refreshing,
  onMarkAllRead,
  onRefresh,
  onMarkRead,
  onOpenNotification,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const grouped = useMemo(() => {
    const selected = (notifications ?? []).filter(item =>
      activeFilter === 'all' ? true : getCategory(item) === activeFilter,
    );
    const today: any[] = [];
    const yesterday: any[] = [];
    for (const item of selected) {
      if (getGroupKey(item?.createdAt) === 'today') {
        today.push(item);
      } else {
        yesterday.push(item);
      }
    }
    return {today, yesterday};
  }, [activeFilter, notifications]);

  const handlePress = (item: any) => {
    const notificationId = String(item?.notificationId ?? item?.id ?? '');
    if (notificationId && !item?.isRead) {
      onMarkRead?.(notificationId);
    }
    onOpenNotification?.(item);
  };

  const renderCard = (item: any, group: GroupKey, index: number) => {
    const notificationId = String(item?.notificationId ?? item?.id ?? `${group}-${index}`);
    const isRead = Boolean(item?.isRead);
    const title = String(item?.title ?? 'Notification');
    const message = getMessage(item) || 'No additional details.';
    const timeLabel = formatRelativeTime(item?.createdAt);
    const jobRef = extractJobRef(item);
    const icon = resolveIconStyle(item);
    const pill = resolvePill(item);

    return (
      <Pressable
        key={notificationId}
        onPress={() => handlePress(item)}
        style={({pressed}) => [
          styles.card,
          !isRead && styles.cardUnread,
          pressed && styles.cardPressed,
        ]}>
        <View style={styles.iconWrap}>
          <View style={[styles.iconContainer, {backgroundColor: icon.bg}]}>
            <Icon name={icon.name} size={20} color={icon.color} strokeWidth={1.8} />
          </View>
          {!isRead && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.titleText, isRead && styles.titleTextRead]}
              numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.timeText}>{timeLabel}</Text>
          </View>

          <Text style={styles.messageText} numberOfLines={2}>
            {message}
          </Text>

          <View style={styles.pillRow}>
            <View style={[styles.categoryPill, {backgroundColor: pill.bg}]}>
              <Text style={[styles.categoryPillText, {color: pill.color}]}>
                {pill.label}
              </Text>
            </View>
            {jobRef ? <Text style={styles.jobRefText}>#{jobRef}</Text> : null}
          </View>
        </View>
      </Pressable>
    );
  };

  const hasAny = grouped.today.length > 0 || grouped.yesterday.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}>

        {/* Filter bar + mark all read */}
        <View style={styles.topBar}>
          <View style={styles.filterRow}>
            {FILTERS.map(filter => {
              const isActive = activeFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}>
                  <Text
                    style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={onMarkAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        {/* Today */}
        {grouped.today.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>TODAY</Text>
              <View style={styles.sectionLine} />
            </View>
            {grouped.today.map((item, i) => renderCard(item, 'today', i))}
          </View>
        )}

        {/* Earlier */}
        {grouped.yesterday.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>EARLIER</Text>
              <View style={styles.sectionLine} />
            </View>
            {grouped.yesterday.map((item, i) => renderCard(item, 'yesterday', i))}
          </View>
        )}

        {/* Empty state */}
        {!hasAny && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Icon name="bell" size={28} color="#9CA3AF" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>
              Updates about jobs, payments, routes, and compliance will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    marginBottom: spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterPill: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: '#1066B1',
  },
  filterLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  markAllBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: 2,
  },
  markAllText: {
    color: '#1066B1',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Section ──────────────────────────────────────────────────────────────
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    flexShrink: 0,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#0B1320',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: '#FAFCFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  cardPressed: {
    opacity: 0.9,
  },

  // ── Icon ─────────────────────────────────────────────────────────────────
  iconWrap: {
    flexShrink: 0,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1066B1',
    borderWidth: 2,
    borderColor: colors.card,
  },

  // ── Card body ────────────────────────────────────────────────────────────
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  titleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 20,
  },
  titleTextRead: {
    color: '#4B5563',
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    flexShrink: 0,
    marginTop: 2,
  },
  messageText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    fontWeight: '400',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  categoryPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  jobRefText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // ── Empty state ──────────────────────────────────────────────────────────
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
