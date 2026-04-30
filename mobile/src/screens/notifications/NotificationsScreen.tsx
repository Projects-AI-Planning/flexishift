import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, spacing} from '../../theme';

interface NotificationsScreenProps {
  notifications: any[];
  onMarkAllRead: () => void;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications,
  onMarkAllRead,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Pressable onPress={onMarkAllRead} style={styles.actionPill}>
            <Text style={styles.actionText}>Mark All Read</Text>
          </Pressable>
        </View>

        <Card title="Inbox" variant="accent">
          <Text style={styles.summaryValue}>{notifications.length}</Text>
          <Text style={styles.summaryLabel}>Unread updates in your driver inbox</Text>
        </Card>

        {notifications.length > 0 ? (
          notifications.map(item => (
            <Card
              key={item.notificationId || item.id || String(Math.random())}
              title={item.title || 'Notification'}
              subtitle={item.createdAt || 'Recently'}
              rightLabel={String(item.status || 'new').toUpperCase()}
              variant={item.read ? 'default' : 'accent'}>
              <Text style={styles.body}>{item.message || item.description || 'No additional details.'}</Text>
            </Card>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDD14'}</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              Updates about jobs, payments, and compliance will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: '900',
  },
  actionPill: {
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  actionText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryValue: {
    color: colors.navy,
    fontSize: 44,
    fontWeight: '900',
  },
  summaryLabel: {
    marginTop: spacing.xs,
    color: colors.inkSoft,
    fontSize: 15,
  },
  body: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.inkSoft,
    fontSize: 15,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
