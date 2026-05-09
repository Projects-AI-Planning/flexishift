import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface SettingsItem {
  icon: string;
  label: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}

interface SettingsScreenProps {
  onChangePassword: () => void;
  onNotificationPreferences: () => void;
  onAvailability: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  onDeactivate: () => void;
  onBack: () => void;
}

function SettingsRow({item}: {item: SettingsItem}) {
  return (
    <Pressable
      onPress={item.onPress}
      style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.iconBox, item.danger && styles.iconBoxDanger]}>
        <Text style={styles.rowIcon}>{item.icon}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}>
          {item.label}
        </Text>
        <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
      </View>
      {!item.danger && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onChangePassword,
  onNotificationPreferences,
  onAvailability,
  onTerms,
  onPrivacy,
  onDeactivate,
  onBack,
}) => {
  const accountItems: SettingsItem[] = [
    {
      icon: '🔒',
      label: 'Change Password',
      subtitle: 'Update your account password',
      onPress: onChangePassword,
    },
    {
      icon: '🔔',
      label: 'Notification Preferences',
      subtitle: 'Manage push and SMS alerts',
      onPress: onNotificationPreferences,
    },
    {
      icon: '📅',
      label: 'Set Availability',
      subtitle: 'Manage your working days & hours',
      onPress: onAvailability,
    },
  ];

  const legalItems: SettingsItem[] = [
    {
      icon: '📋',
      label: 'Terms & Conditions',
      subtitle: 'Read our terms of service',
      onPress: onTerms,
    },
    {
      icon: '🔏',
      label: 'Privacy Policy',
      subtitle: 'How we handle your data',
      onPress: onPrivacy,
    },
  ];

  const dangerItems: SettingsItem[] = [
    {
      icon: '⚠️',
      label: 'Deactivate Account',
      subtitle: 'Temporarily disable your account',
      onPress: onDeactivate,
      danger: true,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Account */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.group}>
          {accountItems.map((item, i) => (
            <View key={item.label}>
              <SettingsRow item={item} />
              {i < accountItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Legal */}
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <View style={styles.group}>
          {legalItems.map((item, i) => (
            <View key={item.label}>
              <SettingsRow item={item} />
              {i < legalItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <View style={styles.group}>
          {dangerItems.map(item => (
            <SettingsRow key={item.label} item={item} />
          ))}
        </View>

        <Text style={styles.version}>FreightFlex Driver App · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F4F7FB'},

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: spacing.lg,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E8EDF3',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  backArrow: {fontSize: 18, color: colors.navy, fontWeight: '700'},
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 18,
    fontWeight: '900', color: colors.navy,
  },
  headerSpacer: {width: 36},

  scroll: {flex: 1},
  content: {padding: spacing.lg, paddingBottom: 48, gap: spacing.sm},

  sectionLabel: {
    fontSize: 11, fontWeight: '900', color: '#64748B',
    letterSpacing: 1, textTransform: 'uppercase',
    marginTop: spacing.md, marginBottom: 6, paddingHorizontal: 4,
  },
  group: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  divider: {height: 1, backgroundColor: '#F1F5F9', marginHorizontal: spacing.lg},

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 14,
  },
  rowPressed: {backgroundColor: '#F8FAFC'},
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  iconBoxDanger: {backgroundColor: '#FFF1F2'},
  rowIcon: {fontSize: 18},
  rowText: {flex: 1},
  rowLabel: {fontSize: 15, fontWeight: '700', color: '#111827'},
  rowLabelDanger: {color: '#DC2626'},
  rowSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  chevron: {fontSize: 22, color: '#9CA3AF', fontWeight: '300'},

  version: {
    textAlign: 'center', fontSize: 12, color: '#9CA3AF',
    marginTop: spacing.lg,
  },
});

export default SettingsScreen;
