import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, spacing} from '../../theme';
import Icon, {IconName} from '../../components/common/Icon';

interface SettingsItem {
  icon: IconName;
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
}

function SettingsRow({item}: {item: SettingsItem}) {
  return (
    <Pressable
      onPress={item.onPress}
      style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.iconBox, item.danger && styles.iconBoxDanger]}>
        <Icon
          name={item.icon}
          size={20}
          color={item.danger ? colors.danger : '#000000'}
          strokeWidth={2}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}>
          {item.label}
        </Text>
        <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
      </View>
      {!item.danger && (
        <Icon name="chevron-right" size={18} color="#000000" strokeWidth={2.5} />
      )}
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
}) => {
  const accountItems: SettingsItem[] = [
    {
      icon: 'lock',
      label: 'Change Password',
      subtitle: 'Update your account password',
      onPress: onChangePassword,
    },
    {
      icon: 'bell',
      label: 'Notification Preferences',
      subtitle: 'Manage push and SMS alerts',
      onPress: onNotificationPreferences,
    },
    {
      icon: 'calendar',
      label: 'Set Availability',
      subtitle: 'Manage your working days & hours',
      onPress: onAvailability,
    },
  ];

  const legalItems: SettingsItem[] = [
    {
      icon: 'clipboard',
      label: 'Terms & Conditions',
      subtitle: 'Read our terms of service',
      onPress: onTerms,
    },
    {
      icon: 'shield',
      label: 'Privacy Policy',
      subtitle: 'How we handle your data',
      onPress: onPrivacy,
    },
  ];

  const dangerItems: SettingsItem[] = [
    {
      icon: 'alert-triangle',
      label: 'Deactivate Account',
      subtitle: 'Temporarily disable your account',
      onPress: onDeactivate,
      danger: true,
    },
  ];

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Settings</Text>
        <Text style={styles.heroText}>
          Manage your driver profile, notifications, and app preferences.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.groupStack}>
          {accountItems.map((item, i) => (
            <View key={item.label}>
              <SettingsRow item={item} />
              {i < accountItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <View style={styles.groupStack}>
          {legalItems.map((item, i) => (
            <View key={item.label}>
              <SettingsRow item={item} />
              {i < legalItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <View style={styles.groupStack}>
          {dangerItems.map(item => (
            <SettingsRow key={item.label} item={item} />
          ))}
        </View>
      </View>

      <Text style={styles.version}>FlexiShift Driver App · v1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.lg,
    paddingBottom: 56,
  },
  hero: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  heroTitle: {color: colors.ink, fontSize: 22, fontWeight: '900', marginBottom: 4},
  heroText: {color: colors.inkSoft, fontSize: 14, lineHeight: 20},
  section: {marginTop: spacing.md},
  sectionLabel: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: spacing.lg,
    textTransform: 'uppercase',
  },
  groupStack: {
    gap: 0,
  },
  divider: {height: 1, backgroundColor: '#EEF2F7', marginHorizontal: 0},
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 13, gap: 14,
  },
  rowPressed: {backgroundColor: '#F8FAFC'},
  iconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: colors.accentSoft, justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  iconBoxDanger: {backgroundColor: colors.dangerSoft},
  rowText: {flex: 1},
  rowLabel: {fontSize: 15, fontWeight: '800', color: colors.ink},
  rowLabelDanger: {color: colors.danger},
  rowSubtitle: {fontSize: 12, color: colors.inkSoft, marginTop: 2},
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: spacing.lg,
  },
});

export default SettingsScreen;
