import React, {useMemo, useState} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {colors, radius, shadow, spacing} from '../../theme';

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
  const haystack = `${normalize(item?.type)} ${normalize(item?.title)} ${normalize(getMessage(item))}`;
  if (haystack.includes('payment') || haystack.includes('invoice') || haystack.includes('deposit')) {
    return 'payments';
  }
  if (
    haystack.includes('route') ||
    haystack.includes('tracking') ||
    haystack.includes('compliance') ||
    haystack.includes('document') ||
    haystack.includes('bol') ||
    haystack.includes('delivery')
  ) {
    return 'routes';
  }
  return 'jobs';
}

function getGroupKey(createdAt?: string | null): GroupKey {
  if (!createdAt) {
    return 'yesterday';
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return 'yesterday';
  }
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date >= startOfToday ? 'today' : 'yesterday';
}

function formatRelativeTime(value?: string | null): string {
  if (!value) {
    return 'Recently';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) {
    return 'Now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return 'Yesterday';
}

function resolveBadge(item: any): string | null {
  const text = `${normalize(item?.type)} ${normalize(item?.title)} ${normalize(getMessage(item))}`;
  if (text.includes('selected')) {
    return 'NEW SELECTION';
  }
  if (text.includes('payment') || text.includes('invoice') || text.includes('deposit')) {
    return 'PAYMENT PROCESSED';
  }
  if (text.includes('route') || text.includes('tracking') || text.includes('delivery')) {
    return 'ROUTE UPDATE';
  }
  if (text.includes('document') || text.includes('bol')) {
    return 'DOCUMENT UPDATE';
  }
  return null;
}

function resolveIcon(item: any): string {
  const category = getCategory(item);
  if (category === 'payments') {
    return '\u{1F4B3}';
  }
  if (category === 'routes') {
    return '\u{1F6E3}';
  }
  return '\u{1F3C5}';
}

function resolveAction(item: any): string {
  const category = getCategory(item);
  if (category === 'payments') {
    return 'View invoice';
  }
  if (category === 'routes') {
    return 'View route';
  }
  return 'View details';
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

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications,
  refreshing,
  onRefresh,
  onMarkRead,
  onOpenNotification,
}) => {
  const {width} = useWindowDimensions();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const contentWidth = Math.min(Math.max(0, width - spacing.lg * 2), 640);
  const iconSize = Math.max(74, Math.min(92, Math.round(width * 0.2)));
  const iconRadius = Math.round(iconSize * 0.2);

  const grouped = useMemo(() => {
    const selected = (notifications ?? []).filter(item => {
      if (activeFilter === 'all') {
        return true;
      }
      return getCategory(item) === activeFilter;
    });

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
    const isToday = group === 'today';
    const title = String(item?.title ?? 'Notification');
    const message = getMessage(item) || 'No additional details.';
    const badge = !isRead && isToday && index === 0 ? resolveBadge(item) : null;
    const timeLabel = formatRelativeTime(item?.createdAt);
    const jobRef = extractJobRef(item);
    const category = getCategory(item);

    return (
      <Pressable
        key={notificationId}
        onPress={() => handlePress(item)}
        style={({pressed}) => [
          styles.cardBase,
          isToday ? styles.cardToday : styles.cardYesterday,
          isRead ? styles.cardRead : styles.cardUnread,
          pressed ? styles.cardPressed : null,
        ]}>
        <View
          style={[
            styles.iconBox,
            isRead ? styles.iconBoxRead : styles.iconBoxUnread,
            {width: iconSize, height: iconSize, borderRadius: iconRadius},
          ]}>
          <Text
            style={[
              styles.iconText,
              isRead ? styles.iconTextRead : styles.iconTextUnread,
              {fontSize: Math.round(iconSize * 0.3)},
            ]}>
            {resolveIcon(item)}
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            {badge ? (
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : (
              <View style={styles.badgeSpacer} />
            )}
            <Text style={styles.timeText}>{timeLabel}</Text>
          </View>

          <Text style={styles.titleText} numberOfLines={2}>
            {title}
          </Text>

          <Text style={styles.messageText} numberOfLines={3}>
            {message}
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.actionText}>
              {resolveAction(item)} <Text style={styles.actionArrow}>{'\u203A'}</Text>
            </Text>
            <Text style={styles.metaText}>
              {jobRef ? `Job #${jobRef}` : String(item?.type ?? category).replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, {paddingHorizontal: spacing.lg}]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, {maxWidth: contentWidth}]}>
          <View style={styles.filterRow}>
            {FILTERS.map(filter => {
              const isActive = activeFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}>
                  <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {grouped.today.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TODAY</Text>
              {grouped.today.map((item, index) => renderCard(item, 'today', index))}
            </View>
          ) : null}

          {grouped.yesterday.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>YESTERDAY</Text>
              {grouped.yesterday.map((item, index) => renderCard(item, 'yesterday', index))}
            </View>
          ) : null}

          {!grouped.today.length && !grouped.yesterday.length ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>{'\u{1F514}'}</Text>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>
                Updates about jobs, payments, routes, and compliance will appear here.
              </Text>
            </View>
          ) : null}
        </View>
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
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  filterPill: {
    flex: 1,
    minWidth: 0,
    height: 40,
    borderRadius: radius.xl,
    backgroundColor: '#ECECF0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: '#071A2D',
  },
  filterLabel: {
    color: '#4C535A',
    fontSize: 13,
    fontWeight: '800',
  },
  filterLabelActive: {
    color: colors.card,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    color: '#7C8087',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  cardBase: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 24,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
  },
  cardToday: {
    backgroundColor: colors.card,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: shadow.elevation,
  },
  cardYesterday: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#D2D7DE',
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  cardRead: {
    borderLeftWidth: 1,
    borderLeftColor: '#DDE3EA',
  },
  cardPressed: {
    opacity: 0.94,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconBoxUnread: {
    backgroundColor: colors.accent,
  },
  iconBoxRead: {
    backgroundColor: '#F0F2F5',
  },
  iconText: {
    fontWeight: '900',
  },
  iconTextUnread: {
    color: colors.card,
  },
  iconTextRead: {
    color: '#9298A1',
  },
  cardContent: {
    flex: 1,
    paddingTop: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: spacing.md,
  },
  badgeWrap: {
    backgroundColor: '#156CC1',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  badgeSpacer: {
    flex: 1,
    minHeight: 24,
  },
  timeText: {
    color: '#7A7F87',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
    paddingTop: 2,
  },
  titleText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  messageText: {
    marginTop: 6,
    color: '#555A61',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  footerRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionText: {
    color: '#156CC1',
    fontSize: 14,
    fontWeight: '900',
  },
  actionArrow: {
    fontSize: 20,
    fontWeight: '900',
  },
  metaText: {
    color: '#7A7F87',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
    textAlign: 'right',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: spacing.sm,
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
