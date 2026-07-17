import React from 'react';
import {View, Text, StyleSheet, ScrollView, Switch, Pressable} from 'react-native';
import Card from '../../components/common/Card';
import {colors, spacing} from '../../theme';

interface NotificationPreferencesScreenProps {
  notificationPrefs: any;
  onToggle: (group: 'pushNotifications' | 'smsNotifications', key: string, value: boolean) => void;
  onSave: () => void;
  loading: boolean;
}

const NotificationPreferencesScreen: React.FC<NotificationPreferencesScreenProps> = ({
  notificationPrefs,
  onToggle,
  onSave,
  loading,
}) => {
  const renderGroup = (group: 'pushNotifications' | 'smsNotifications', title: string) => (
    <Card key={group} title={title} variant="default">
      {Object.entries(notificationPrefs[group]).map(([key, value]) => (
        <View key={`${group}-${key}`} style={styles.row}>
          <Text style={styles.label}>{key.replace(/_/g, ' ')}</Text>
          <Switch
            value={Boolean(value)}
            onValueChange={next => onToggle(group, key, next)}
            trackColor={{false: '#CBD5E1', true: colors.accent}}
            thumbColor={colors.card}
          />
        </View>
      ))}
    </Card>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Preferences</Text>
        <Text style={styles.subtitle}>Choose how you want to be informed</Text>
      </View>

      {renderGroup('pushNotifications', 'Push Notifications')}
      {renderGroup('smsNotifications', 'SMS Notifications')}

      <Pressable onPress={onSave} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Preferences'}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 15,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    paddingRight: spacing.md,
    textTransform: 'capitalize',
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: '900',
  },
});

export default NotificationPreferencesScreen;
