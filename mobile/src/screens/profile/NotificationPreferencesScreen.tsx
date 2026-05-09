import React from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView, Switch, Pressable} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, spacing} from '../../theme';

interface NotificationPreferencesScreenProps {
  notificationPrefs: any;
  onToggle: (group: 'pushNotifications' | 'smsNotifications', key: string, value: boolean) => void;
  onSave: () => void;
  onBack?: () => void;
  loading: boolean;
}

const NotificationPreferencesScreen: React.FC<NotificationPreferencesScreenProps> = ({
  notificationPrefs,
  onToggle,
  onSave,
  onBack,
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
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Notifications</Text>
        <View style={styles.topBarSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>Choose how you want to be informed</Text>
        </View>

        {renderGroup('pushNotifications', 'Push Notifications')}
        {renderGroup('smsNotifications', 'SMS Notifications')}

        <Pressable onPress={onSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: spacing.lg,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E8EDF3',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  backArrow: {fontSize: 18, color: colors.navy, fontWeight: '700'},
  topBarTitle: {
    flex: 1, textAlign: 'center', fontSize: 18,
    fontWeight: '900', color: colors.navy,
  },
  topBarSpacer: {width: 36},
  content: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.xl,
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
