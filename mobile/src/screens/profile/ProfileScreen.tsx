import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {colors, radius, spacing, shadow} from '../../theme';

interface ProfileForm {
  name: string;
  phone: string;
  licenceNumber: string;
  vehicleType: string;
  vehicleRegistration: string;
}

interface ProfileScreenProps {
  profile: any;
  session: any;
  profileForm: ProfileForm;
  onChange: (patch: Partial<ProfileForm>) => void;
  onSave: () => void;
  onLogout: () => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.fieldInput}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder ?? label}
      placeholderTextColor="#9AA4B2"
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize="none"
    />
  </View>
);

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  session,
  profileForm,
  onChange,
  onSave,
  onLogout,
  loading,
  refreshing,
  onRefresh,
}) => {
  const name = profile?.name ?? session?.name ?? '';
  const email = profile?.email ?? session?.email ?? '';
  const role = profile?.role ?? session?.role ?? 'DRIVER';
  const isComplete = profile?.profileComplete ?? false;
  const rating = profile?.avgRating ?? 0;
  const completedJobs = profile?.completedJobs ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}>

      {/* Hero card */}
      <View style={styles.heroCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {name.charAt(0).toUpperCase() || 'D'}
          </Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroEmail}>{email}</Text>
          <View style={styles.heroMeta}>
            <View style={[styles.badge, isComplete ? styles.badgeGreen : styles.badgeOrange]}>
              <Text style={styles.badgeText}>
                {isComplete ? 'Profile Complete' : 'Incomplete'}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{role}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>★ {Number(rating).toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{completedJobs}</Text>
          <Text style={styles.statLabel}>Jobs Done</Text>
        </View>
      </View>

      {/* Edit form */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <Field
          label="Full Name"
          value={profileForm.name}
          onChange={v => onChange({name: v})}
          placeholder="Your full name"
        />
        <Field
          label="Phone Number"
          value={profileForm.phone}
          onChange={v => onChange({phone: v})}
          placeholder="+91 XXXXXXXXXX"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Vehicle & Licence</Text>
        <Field
          label="Licence Number"
          value={profileForm.licenceNumber}
          onChange={v => onChange({licenceNumber: v})}
          placeholder="DL-XXXXXXXXXXXX"
        />
        <Field
          label="Vehicle Type"
          value={profileForm.vehicleType}
          onChange={v => onChange({vehicleType: v})}
          placeholder="e.g. VAN, TRUCK, HGV"
        />
        <Field
          label="Vehicle Registration"
          value={profileForm.vehicleRegistration}
          onChange={v => onChange({vehicleRegistration: v})}
          placeholder="e.g. MH12AB1234"
        />
      </View>

      <Pressable
        onPress={onSave}
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.navy} />
        ) : (
          <Text style={styles.saveButtonText}>Save Profile</Text>
        )}
      </Pressable>

      <Pressable
        onPress={onLogout}
        style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </Pressable>

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
    paddingBottom: 40,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: '900',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    color: colors.card,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroEmail: {
    color: '#C4CDD6',
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGreen: {
    backgroundColor: '#18794E',
  },
  badgeOrange: {
    backgroundColor: '#B45309',
  },
  badgeText: {
    color: colors.card,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#F8FAFD',
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
  },
  logoutButton: {
    backgroundColor: '#FDE8E6',
    borderRadius: radius.lg,
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3B4B0',
  },
  logoutButtonText: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '900',
  },
});

export default ProfileScreen;
