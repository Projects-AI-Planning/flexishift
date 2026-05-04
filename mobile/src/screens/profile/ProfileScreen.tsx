import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {driverApi} from '../../api/driverApi';
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
      autoCapitalize="none"
      keyboardType={keyboardType ?? 'default'}
      onChangeText={onChange}
      placeholder={placeholder ?? label}
      placeholderTextColor="#9AA4B2"
      style={styles.fieldInput}
      value={value}
    />
  </View>
);

const StatCard = ({label, value}: {label: string; value: string}) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
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
  const [photoUploading, setPhotoUploading] = useState(false);

  const name = profile?.name ?? session?.name ?? '';
  const email = profile?.email ?? session?.email ?? '';
  const role = profile?.role ?? session?.role ?? 'DRIVER';
  const isComplete = Boolean(profile?.profileComplete);
  const isVerified = Boolean(profile?.isVerified);
  const rating = Number(profile?.avgRating ?? 0);
  const completedJobs = Number(profile?.completedJobs ?? 0);
  const photoUrl = profile?.profile?.photoUrl ?? profile?.profilePhoto ?? '';
  const documentStatus = profile?.verificationStatus ?? 'PENDING';
  const locationLabel =
    profile?.locationLat && profile?.locationLng
      ? `${profile.locationLat}, ${profile.locationLng}`
      : 'Location not shared';

  const initials = useMemo(() => {
    const base = name.trim() || email.trim() || 'D';
    return base.charAt(0).toUpperCase();
  }, [email, name]);

  const uploadPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.85,
        selectionLimit: 1,
      });

      if (result.didCancel || result.errorCode || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        return;
      }

      setPhotoUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'profile.jpg',
        type: asset.type ?? 'image/jpeg',
      } as any);
      await driverApi.profile.uploadPhotoDirect(formData);
      onRefresh();
    } catch (error) {
      Alert.alert(
        'Photo upload failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageOverline}>Driver Account</Text>
        <Text style={styles.pageTitle}>Profile</Text>
        <Text style={styles.pageSubtitle}>
          Manage your backend-backed driver details, documents, and
          availability.
        </Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            {photoUrl ? (
              <Image source={{uri: photoUrl}} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Pressable onPress={uploadPhoto} style={styles.photoBtn}>
            {photoUploading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.photoBtnText}>
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.heroInfo}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                isComplete ? styles.badgeGreen : styles.badgeOrange,
              ]}>
              <Text style={styles.badgeText}>
                {isComplete ? 'Profile Complete' : 'Profile Incomplete'}
              </Text>
            </View>
            {isVerified ? (
              <View style={[styles.badge, styles.badgeBlue]}>
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroName}>{name || 'Driver Profile'}</Text>
          <Text style={styles.heroEmail}>{email}</Text>
          <Text style={styles.heroRole}>{role}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Rating" value={`★ ${rating.toFixed(1)}`} />
        <StatCard label="Jobs Done" value={String(completedJobs)} />
        <StatCard label="Status" value={isVerified ? 'Active' : 'Pending'} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Account Snapshot</Text>
        <View style={styles.snapshotRow}>
          <Text style={styles.snapshotLabel}>Profile Status</Text>
          <Text style={styles.snapshotValue}>
            {isComplete ? 'Complete' : 'Needs Review'}
          </Text>
        </View>
        <View style={styles.snapshotRow}>
          <Text style={styles.snapshotLabel}>Verification</Text>
          <Text style={styles.snapshotValue}>
            {String(documentStatus).toUpperCase()}
          </Text>
        </View>
        <View style={styles.snapshotRow}>
          <Text style={styles.snapshotLabel}>Current Location</Text>
          <Text style={styles.snapshotValue}>{locationLabel}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
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

      <View style={styles.sectionCard}>
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

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Backend Summary</Text>
        <Text style={styles.summaryText}>
          Profile completion is driven from the backend profile record,
          including verification and vehicle details.
        </Text>
        <Text style={styles.summaryText}>
          Changes saved here update `/profile/update`, and the avatar uses
          `/profile/photo/upload-direct`.
        </Text>
      </View>

      <View style={styles.quickGrid}>
        <Pressable style={styles.quickCard} onPress={onRefresh}>
          <Text style={styles.quickIcon}>{'\u21BB'}</Text>
          <Text style={styles.quickTitle}>Refresh</Text>
          <Text style={styles.quickText}>Pull latest backend profile data</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={onLogout}>
          <Text style={styles.quickIcon}>{'\uD83D\uDEAA'}</Text>
          <Text style={styles.quickTitle}>Logout</Text>
          <Text style={styles.quickText}>End the current driver session</Text>
        </Pressable>
      </View>

      <Pressable
        disabled={loading}
        onPress={onSave}
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
        {loading ? (
          <ActivityIndicator color={colors.nav} />
        ) : (
          <Text style={styles.saveButtonText}>Save Profile</Text>
        )}
      </Pressable>

      <Pressable onPress={onLogout} style={styles.logoutButton}>
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
  pageHeader: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  pageOverline: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pageTitle: {
    color: colors.navy,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  pageSubtitle: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
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
  avatarWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  avatarText: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: '900',
  },
  photoBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  photoBtnText: {
    color: colors.card,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeGreen: {
    backgroundColor: '#18794E',
  },
  badgeOrange: {
    backgroundColor: '#B45309',
  },
  badgeBlue: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.card,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
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
    marginBottom: 4,
  },
  heroRole: {
    color: colors.accentSoft,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 6,
  },
  snapshotLabel: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  snapshotValue: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
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
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionCard: {
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
    marginBottom: spacing.xs,
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
  summaryText: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: 6,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  quickIcon: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '900',
  },
  quickTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
  },
  quickText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 17,
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
    color: colors.nav,
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
