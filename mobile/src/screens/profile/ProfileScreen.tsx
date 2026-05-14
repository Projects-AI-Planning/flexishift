import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
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
import {colors, radius, spacing} from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileForm {
  name: string;
  phone: string;
  licenceNumber: string;
  vehicleType: string;
  vehicleRegistration: string;
  companyName?: string;
  companyAddress?: string;
  coverageArea?: string;
}

interface ProfileScreenProps {
  profile: any;
  session: any;
  profileForm: ProfileForm;
  documents?: any[];
  verificationStatus?: any;
  focusDocuments?: boolean;
  onChange: (patch: Partial<ProfileForm>) => void;
  onSave: () => void;
  onLogout: () => void;
  onSettings: () => void;
  onAddVehicle: (vehicleType: string, vehicleRegistration: string) => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stars({rating}: {rating: number}) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = rating >= i;
        const half = !filled && rating >= i - 0.5;
        return (
          <Text key={i} style={[starStyles.star, filled || half ? starStyles.starFilled : starStyles.starEmpty]}>
            {filled ? '★' : half ? '⯨' : '☆'}
          </Text>
        );
      })}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 2},
  star: {fontSize: 16},
  starFilled: {color: '#1066B1'},
  starEmpty: {color: '#D1D5DB'},
});

function ProgressBar({value, color}: {value: number; color: string}) {
  return (
    <View style={pbStyles.track}>
      <View style={[pbStyles.fill, {width: `${Math.min(value, 100)}%` as any, backgroundColor: color}]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: {height: 3, backgroundColor: '#E5E7EB', borderRadius: 99, marginTop: 10, overflow: 'hidden'},
  fill: {height: 3, borderRadius: 99},
});

function InfoField({label, value, onChange, placeholder, keyboardType, editable = true}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  editable?: boolean;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, !editable && fieldStyles.inputReadonly]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        editable={editable}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: {gap: 6},
  label: {fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5},
  input: {
    backgroundColor: '#F3F4F6', borderRadius: radius.md,
    paddingHorizontal: spacing.lg, minHeight: 48,
    fontSize: 15, color: '#111827', fontWeight: '500',
  },
  inputReadonly: {color: '#374151'},
});

// ─── Component ────────────────────────────────────────────────────────────────

// Maps raw backend status → display status
function resolveDocStatus(uploaded: any | undefined): 'not_uploaded' | 'under_review' | 'rejected' | 'active' | 'complete' {
  if (!uploaded) return 'not_uploaded';
  const s = String(uploaded.status ?? '').toLowerCase();
  if (s === 'approved' || s === 'verified' || s === 'active') return 'active';
  if (s === 'complete' || s === 'completed') return 'complete';
  if (s === 'rejected') return 'rejected';
  return 'under_review';
}

function normalizeDocType(raw: string | undefined): string {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'driving_licence' || value === 'driving_license') return 'driving_license';
  if (value === 'vehicle_reg' || value === 'vehicle_registration') return 'vehicle_registration';
  if (value === 'vehicle_insurance') return 'vehicle_insurance';
  if (value === 'background_check') return 'background_check';
  return value;
}

function normalizeSummaryStatus(raw: string | undefined): string {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'approved' || value === 'verified' || value === 'active') return 'active';
  if (value === 'complete' || value === 'completed') return 'complete';
  if (value === 'rejected') return 'rejected';
  return 'under_review';
}

const DRIVER_DOCUMENTS = [
  {key: 'driving_license', backendKey: 'DRIVING_LICENCE', icon: '🪪', label: 'Driving License'},
  {key: 'vehicle_registration', backendKey: 'VEHICLE_REG', icon: '🚛', label: 'Vehicle Registration'},
  {key: 'vehicle_insurance', backendKey: 'VEHICLE_INSURANCE', icon: '🛡️', label: 'Insurance Policy'},
] as const;

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  session,
  profileForm,
  documents = [],
  verificationStatus,
  focusDocuments = false,
  onChange,
  onSave,
  onLogout,
  onSettings,
  onAddVehicle,
  loading,
  refreshing,
  onRefresh,
}) => {
  const [photoUploading, setPhotoUploading] = useState(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const documentsSectionY = useRef<number | null>(null);

  // ── Vehicle modal state ──────────────────────────────────────────────────
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const openVehicleModal = () => {
    setVehicleType(profileForm.vehicleType ?? '');
    setVehicleReg(profileForm.vehicleRegistration ?? '');
    setVehicleError(null);
    setVehicleModalVisible(true);
  };

  const handleVehicleSave = async () => {
    if (!vehicleType.trim()) { setVehicleError('Vehicle type is required.'); return; }
    if (!vehicleReg.trim()) { setVehicleError('Vehicle registration is required.'); return; }
    setVehicleSaving(true);
    setVehicleError(null);
    try {
      await onAddVehicle(vehicleType.trim(), vehicleReg.trim());
      setVehicleModalVisible(false);
    } catch (err) {
      setVehicleError(err instanceof Error ? err.message : 'Failed to save vehicle.');
    } finally {
      setVehicleSaving(false);
    }
  };

  // ── Upload modal state ───────────────────────────────────────────────────
  type ModalDoc = {key: string; backendKey: string; label: string; icon: string};
  const [activeModal, setActiveModal] = useState<ModalDoc | null>(null);
  const [modalFile, setModalFile] = useState<any>(null);
  const [modalExpiry, setModalExpiry] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalUploading, setModalUploading] = useState(false);
  const [modalPickerDate, setModalPickerDate] = useState(new Date(Date.now() + 86400000));
  const [modalShowPicker, setModalShowPicker] = useState(false);

  const openModal = (doc: ModalDoc) => {
    setActiveModal(doc);
    setModalFile(null);
    setModalExpiry('');
    setModalError(null);
    setModalPickerDate(new Date(Date.now() + 86400000));
    setModalShowPicker(false);
  };

  const closeModal = () => {
    if (modalUploading) return;
    setActiveModal(null);
    setModalFile(null);
    setModalExpiry('');
    setModalError(null);
    setModalShowPicker(false);
  };

  const onModalDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setModalShowPicker(false);
    }
    if (!selected) return;
    setModalPickerDate(selected);
    const dd = String(selected.getDate()).padStart(2, '0');
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const yyyy = selected.getFullYear();
    setModalExpiry(`${dd}-${mm}-${yyyy}`);
    setModalError(null);
  };

  const pickDocFile = async () => {
    const result = await launchImageLibrary({mediaType: 'mixed', quality: 0.9, selectionLimit: 1});
    if (result.didCancel || result.errorCode || !result.assets?.length) return;
    setModalFile(result.assets[0]);
    setModalError(null);
  };

  const handleModalUpload = async () => {
    if (!activeModal) return;
    if (!modalFile?.uri) { setModalError('Please select a document file'); return; }
    if (!modalExpiry) { setModalError('Please select an expiry date'); return; }
    setModalUploading(true);
    setModalError(null);
    try {
      const formData = new FormData();
      formData.append('documentType', activeModal.backendKey);
      formData.append('expiryDate', modalExpiry);
      formData.append('file', {
        uri: modalFile.uri,
        name: modalFile.fileName ?? 'document.jpg',
        type: modalFile.type ?? 'image/jpeg',
      } as any);
      await driverApi.documents.upload(formData);
      // Refresh local doc state after successful upload
      const [docs, status] = await Promise.all([
        driverApi.documents.list(),
        driverApi.documents.getStatus(),
      ]);
      setLocalDocuments(((docs as any).items ?? []) as any[]);
      setLocalVerificationStatus(status);
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setModalUploading(false);
    }
  };

  const [localDocuments, setLocalDocuments] = useState<any[]>(documents);
  const [localVerificationStatus, setLocalVerificationStatus] = useState<any>(verificationStatus);

  const name = profile?.name ?? session?.name ?? 'Driver';
  const email = profile?.email ?? session?.email ?? '';
  const role = profile?.role ?? session?.role ?? 'Senior Logistics Partner';
  const roleKey = String(role ?? '').toUpperCase();
  const isHaulier = roleKey === 'HAULIER' || roleKey === 'FIRM';
  const isVerified = Boolean(profile?.isVerified);
  const rating = Number(profile?.avgRating ?? 4.8);
  const completedJobs = Number(profile?.completedJobs ?? 0);
  const photoUrl = localPhotoUrl ?? profile?.profile?.photoUrl ?? profile?.profilePhoto ?? '';
  const effectiveDocuments = localDocuments.length ? localDocuments : documents;
  const effectiveVerification = localVerificationStatus ?? verificationStatus;
  const documentStatuses = effectiveVerification?.documentStatuses ?? {};
  const verificationReady = effectiveVerification?.isVerified === true || effectiveVerification?.allDocumentsApproved === true;
  const overallVerification = effectiveVerification?.allDocumentsApproved === true
    ? 'all approved'
    : effectiveVerification?.profileComplete
      ? 'profile complete'
      : 'in progress';

  const findDoc = (type: string) =>
    effectiveDocuments.find(d => normalizeDocType(d.documentType ?? d.docType ?? d.type) === type);

  const docStatus = Object.fromEntries(
    DRIVER_DOCUMENTS.map(doc => {
      const summaryStatus = normalizeSummaryStatus(documentStatuses[doc.backendKey]);
      const found = findDoc(doc.key);
      const status = summaryStatus !== 'under_review' ? summaryStatus : resolveDocStatus(found);
      return [doc.key, status];
    }),
  ) as Record<string, 'not_uploaded' | 'under_review' | 'rejected' | 'active' | 'complete'>;

  const completionRate = useMemo(() => {
    const backendProfileComplete = profile?.profileComplete === true || effectiveVerification?.profileComplete === true;
    const allDocsApproved = effectiveVerification?.allDocumentsApproved === true
      || DRIVER_DOCUMENTS.every(doc => {
        const status = docStatus[doc.key];
        return status === 'active' || status === 'complete';
      });

    if (backendProfileComplete && allDocsApproved) {
      return 100;
    }

    const checklist = [
      Boolean(profile?.name ?? session?.name),
      Boolean(profile?.email ?? session?.email),
      Boolean(profile?.phone ?? profileForm.phone),
      Boolean(profileForm.licenceNumber),
      Boolean(profileForm.vehicleType),
      Boolean(profileForm.vehicleRegistration),
      !isHaulier || Boolean(profileForm.companyName),
      !isHaulier || Boolean(profileForm.companyAddress),
      Boolean(photoUrl),
      DRIVER_DOCUMENTS.some(doc => {
        const status = docStatus[doc.key];
        return status === 'active' || status === 'complete';
      }),
      DRIVER_DOCUMENTS.every(doc => {
        const status = docStatus[doc.key];
        return status === 'active' || status === 'complete';
      }),
    ];

    const score = checklist.filter(Boolean).length;
    return Math.max(0, Math.min(100, Math.round((score / checklist.length) * 100)));
  }, [
    docStatus,
    effectiveVerification?.allDocumentsApproved,
    effectiveVerification?.profileComplete,
    photoUrl,
    profile?.email,
    profile?.name,
    profile?.phone,
    profile?.profileComplete,
    profileForm.licenceNumber,
    profileForm.phone,
    profileForm.companyAddress,
    profileForm.companyName,
    profileForm.vehicleRegistration,
    profileForm.vehicleType,
    session?.email,
    session?.name,
    isHaulier,
  ]);

  const initials = useMemo(() => {
    const base = name.trim() || email.trim() || 'D';
    return base.charAt(0).toUpperCase();
  }, [name, email]);

  useEffect(() => {
    let alive = true;
    const loadLiveProfileData = async () => {
      try {
        const [docs, status] = await Promise.all([
          driverApi.documents.list(),
          driverApi.documents.getStatus(),
        ]);
        if (!alive) return;
        setLocalDocuments(((docs.items ?? []) as any[]) || []);
        setLocalVerificationStatus(status);
      } catch {
        if (!alive) return;
        setLocalDocuments(documents);
        setLocalVerificationStatus(verificationStatus);
      }
    };

    loadLiveProfileData().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setLocalDocuments(documents);
  }, [documents]);

  useEffect(() => {
    setLocalVerificationStatus(verificationStatus);
  }, [verificationStatus]);

  useEffect(() => {
    if (!focusDocuments || documentsSectionY.current == null) {
      return;
    }
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({animated: true, y: Math.max(documentsSectionY.current ?? 0, 0)});
    });
  }, [focusDocuments]);

  const uploadPhoto = async () => {
    try {
      const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 1});
      if (result.didCancel || result.errorCode || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      setPhotoUploading(true);
      // Optimistic preview from local file immediately
      setLocalPhotoUrl(asset.uri);
      const formData = new FormData();
      formData.append('file', {uri: asset.uri, name: asset.fileName ?? 'profile.jpg', type: asset.type ?? 'image/jpeg'} as any);
      const uploadRes = await driverApi.profile.uploadPhotoDirect(formData) as any;
      const returnedUrl = uploadRes?.photoUrl;
      if (returnedUrl) {
        setLocalPhotoUrl(returnedUrl);
      }
      await Promise.resolve(onRefresh());
    } catch (err) {
      setLocalPhotoUrl(null);
      Alert.alert('Photo upload failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const docLabel = (status: string): string => {
    switch (status) {
      case 'active':       return 'ACTIVE';
      case 'complete':     return 'COMPLETE';
      case 'under_review': return 'UNDER REVIEW';
      case 'rejected':     return 'REJECTED';
      case 'not_uploaded': return 'NOT UPLOADED';
      default:             return 'NOT UPLOADED';
    }
  };

  const docColor = (status: string): {bg: string; text: string} => {
    switch (status) {
      case 'active':
      case 'complete':     return {bg: '#DCFCE7', text: '#15803D'};
      case 'under_review': return {bg: '#FEF9C3', text: '#854D0E'};
      case 'rejected':     return {bg: '#FEE2E2', text: '#B91C1C'};
      default:             return {bg: '#F1F5F9', text: '#64748B'}; // not uploaded — gray
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      {/* ── Cover + Avatar ────────────────────────────────────────────────── */}
      <View style={styles.coverWrap}>
        <Image
          source={require('../../assets/screens/Freightflex.png')}
          style={styles.coverBg}
        />
        <View style={styles.avatarArea}>
          <Pressable onPress={uploadPhoto} style={styles.avatarCircle}>
            {photoUrl
              ? <Image source={{uri: photoUrl}} style={styles.avatarImg} />
              : <Text style={styles.avatarInitials}>{initials}</Text>}
            <View style={styles.cameraOverlay}>
              {photoUploading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.cameraIcon}>📷</Text>}
            </View>
          </Pressable>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ VERIFIED</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Name & Role ───────────────────────────────────────────────────── */}
      <View style={styles.nameWrap}>
        <Text style={styles.nameText}>{name}</Text>
        <Text style={styles.roleText}>{String(role).replace(/_/g, ' ')}</Text>
      </View>

      {/* ── Overall Rating card ───────────────────────────────────────────── */}
      <View style={styles.ratingCard}>
        <View style={styles.ratingLeft}>
          <Text style={styles.ratingLabel}>OVERALL RATING</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
            <Stars rating={rating} />
          </View>
        </View>
        <View style={styles.trophyCircle}>
          <Text style={styles.trophyIcon}>🏆</Text>
        </View>
      </View>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL JOBS</Text>
          <Text style={styles.statValue}>{completedJobs}</Text>
          <ProgressBar value={Math.min((completedJobs / 50) * 100, 100)} color="#111827" />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>COMPLETION</Text>
          <Text style={styles.statValue}>{completionRate}%</Text>
          <ProgressBar value={completionRate} color="#1066B1" />
        </View>
      </View>

      {/* ── Personal Information ──────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderIcon}>🏠</Text>
          <Text style={styles.sectionHeaderText}>PERSONAL INFORMATION</Text>
        </View>
        <InfoField
          label="FULL NAME"
          value={profileForm.name}
          onChange={v => onChange({name: v})}
          placeholder="Your full name"
        />
        <InfoField
          label="EMAIL"
          value={email}
          editable={false}
        />
        <InfoField
          label="PHONE NUMBER"
          value={profileForm.phone}
          onChange={v => onChange({phone: v})}
          placeholder="+1 (555) 000-0000"
          keyboardType="phone-pad"
        />
      </View>

      {/* ── Vehicle Information ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderIcon}>🚛</Text>
          <Text style={styles.sectionHeaderText}>VEHICLE INFORMATION</Text>
        </View>

        {(profileForm.vehicleType || profileForm.vehicleRegistration) ? (
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleImgBox}>
              <Text style={styles.vehicleImgPlaceholder}>🚛</Text>
            </View>
            <View style={styles.vehicleInfo}>
              {profileForm.vehicleType ? (
                <View style={styles.vehicleCategoryTag}>
                  <Text style={styles.vehicleCategoryText}>
                    {profileForm.vehicleType.toUpperCase()}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.vehiclePlateLabel}>License Plate</Text>
              <Text style={styles.vehiclePlate}>
                {profileForm.vehicleRegistration || '—'}
              </Text>
            </View>
          </View>
        ) : null}

        <InfoField
          label="VEHICLE TYPE"
          value={profileForm.vehicleType}
          onChange={v => onChange({vehicleType: v})}
          placeholder="e.g. FLATBED, VAN, HGV"
        />
        <InfoField
          label="LICENCE NUMBER"
          value={profileForm.licenceNumber}
          onChange={v => onChange({licenceNumber: v})}
          placeholder="DL-XXXXXXXXXXXX"
        />
        <InfoField
          label="VEHICLE REGISTRATION"
          value={profileForm.vehicleRegistration}
          onChange={v => onChange({vehicleRegistration: v})}
          placeholder="e.g. TX-LOG-8892"
        />

        {isHaulier ? (
          <View style={{gap: spacing.md, marginTop: spacing.md}}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderIcon}>🏢</Text>
              <Text style={styles.sectionHeaderText}>HAULIER DETAILS</Text>
            </View>
            <InfoField
              label="COMPANY NAME"
              value={profileForm.companyName ?? ''}
              onChange={v => onChange({companyName: v})}
              placeholder="Enter your company name"
            />
            <InfoField
              label="COMPANY ADDRESS"
              value={profileForm.companyAddress ?? ''}
              onChange={v => onChange({companyAddress: v})}
              placeholder="Enter company address"
            />
            <InfoField
              label="COVERAGE AREA"
              value={profileForm.coverageArea ?? ''}
              onChange={v => onChange({coverageArea: v})}
              placeholder="Cities, states, or regions you cover"
            />
          </View>
        ) : null}

        <Pressable style={styles.addVehicleBtn} onPress={openVehicleModal}>
          <Text style={styles.addVehicleBtnText}>＋  Add New Vehicle</Text>
        </Pressable>
      </View>

      {/* ── Documents & Verification ──────────────────────────────────────── */}
      <View
        style={styles.section}
        onLayout={event => {
          const y = event.nativeEvent.layout.y;
          documentsSectionY.current = y;
          if (focusDocuments) {
            requestAnimationFrame(() => {
              scrollRef.current?.scrollTo({animated: true, y: Math.max(y - 12, 0)});
            });
          }
        }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderIcon}>📂</Text>
          <Text style={styles.sectionHeaderText}>DOCUMENTS & VERIFICATION</Text>
        </View>

        <View style={styles.verificationCard}>
          <View>
            <Text style={styles.verificationLabel}>VERIFICATION STATUS</Text>
            <Text style={styles.verificationValue}>{String(overallVerification).toUpperCase()}</Text>
          </View>
          <View style={[styles.verificationPill, verificationReady ? styles.verificationPillReady : styles.verificationPillPending]}>
            <Text style={[styles.verificationPillText, verificationReady ? styles.verificationPillTextReady : styles.verificationPillTextPending]}>
              {verificationReady ? 'VERIFIED' : 'PENDING'}
            </Text>
          </View>
        </View>

        {DRIVER_DOCUMENTS.map((doc, i, arr) => {
          const status = docStatus[doc.key];
          const c = docColor(status);
          const tappable = status === 'not_uploaded' || status === 'rejected';
          return (
            <Pressable
              key={doc.key}
              onPress={() => openModal(doc)}
              style={({pressed}) => [
                styles.docRow,
                i < arr.length - 1 && styles.docRowBorder,
                pressed && styles.docRowPressed,
              ]}>
              <Text style={styles.docIcon}>{doc.icon}</Text>
              <Text style={styles.docLabel}>{doc.label}</Text>
              <View style={styles.docRowRight}>
                <View style={[styles.docBadge, {backgroundColor: c.bg}]}>
                  <Text style={[styles.docBadgeText, {color: c.text}]}>
                    {docLabel(status)}
                  </Text>
                </View>
                {tappable && (
                  <Text style={styles.docRowChevron}>›</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── Save Changes ──────────────────────────────────────────────────── */}
      <Pressable
        onPress={onSave}
        disabled={loading}
        style={[styles.saveBtn, loading && styles.saveBtnDisabled]}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <>
              <Text style={styles.saveBtnIcon}>✓</Text>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>}
      </Pressable>

      {/* ── Settings + Log Out ────────────────────────────────────────────── */}
      <View style={styles.bottomRow}>
        <Pressable style={styles.settingsBtn} onPress={onSettings}>
          <Text style={styles.settingsBtnIcon}>⚙</Text>
          <Text style={styles.settingsBtnText}>Settings</Text>
        </Pressable>
        <Pressable onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnIcon}>→</Text>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </Pressable>
      </View>

      {/* ── Document Upload Modal ─────────────────────────────────────────── */}
      <Modal
        visible={!!activeModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderIcon}>{activeModal?.icon}</Text>
              <View style={{flex: 1}}>
                <Text style={styles.modalTitle}>Upload Document</Text>
                <Text style={styles.modalSubtitle}>{activeModal?.label}</Text>
              </View>
              <Pressable onPress={closeModal} style={styles.modalCloseBtn} disabled={modalUploading}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            {/* File picker */}
            <Text style={styles.modalFieldLabel}>DOCUMENT FILE</Text>
            <Pressable onPress={pickDocFile} style={styles.filePicker} disabled={modalUploading}>
              {modalFile ? (
                <View style={styles.filePickerSelected}>
                  <Text style={styles.filePickerSelectedIcon}>📄</Text>
                  <Text style={styles.filePickerSelectedName} numberOfLines={1}>
                    {modalFile.fileName ?? 'Selected file'}
                  </Text>
                  <Text style={styles.filePickerChange}>Change</Text>
                </View>
              ) : (
                <View style={styles.filePickerEmpty}>
                  <Text style={styles.filePickerEmptyIcon}>⬆</Text>
                  <Text style={styles.filePickerEmptyText}>Tap to select file</Text>
                  <Text style={styles.filePickerEmptyHint}>JPG, PNG or PDF</Text>
                </View>
              )}
            </Pressable>

            {/* Expiry date */}
            <Text style={styles.modalFieldLabel}>EXPIRY DATE</Text>
            <Pressable
              onPress={() => !modalUploading && setModalShowPicker(true)}
              style={[styles.modalInput, styles.modalDatePressable]}>
              <Text style={modalExpiry ? styles.modalDateValue : styles.modalDatePlaceholder}>
                {modalExpiry || 'DD-MM-YYYY'}
              </Text>
              <Text style={styles.modalDateIcon}>📅</Text>
            </Pressable>
            {modalShowPicker && (
              <DateTimePicker
                value={modalPickerDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date(Date.now() + 86400000)}
                onChange={onModalDateChange}
              />
            )}

            {/* Error */}
            {modalError ? (
              <Text style={styles.modalError}>{modalError}</Text>
            ) : null}

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable onPress={closeModal} style={styles.modalCancelBtn} disabled={modalUploading}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleModalUpload} style={styles.modalUploadBtn} disabled={modalUploading}>
                {modalUploading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalUploadBtnText}>Upload</Text>}
              </Pressable>
            </View>

          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Vehicle Modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={vehicleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVehicleModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !vehicleSaving && setVehicleModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderIcon}>🚛</Text>
              <View style={{flex: 1}}>
                <Text style={styles.modalTitle}>Vehicle Details</Text>
                <Text style={styles.modalSubtitle}>Enter your vehicle information</Text>
              </View>
              <Pressable
                onPress={() => setVehicleModalVisible(false)}
                style={styles.modalCloseBtn}
                disabled={vehicleSaving}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalFieldLabel}>VEHICLE TYPE</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. FLATBED, VAN, HGV, TRAILER"
              placeholderTextColor="#9CA3AF"
              value={vehicleType}
              onChangeText={v => { setVehicleType(v); setVehicleError(null); }}
              autoCapitalize="characters"
              editable={!vehicleSaving}
            />

            <Text style={styles.modalFieldLabel}>REGISTRATION NUMBER</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. TX-LOG-8892"
              placeholderTextColor="#9CA3AF"
              value={vehicleReg}
              onChangeText={v => { setVehicleReg(v); setVehicleError(null); }}
              autoCapitalize="characters"
              editable={!vehicleSaving}
            />

            {vehicleError ? (
              <Text style={styles.modalError}>{vehicleError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setVehicleModalVisible(false)}
                style={styles.modalCancelBtn}
                disabled={vehicleSaving}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleVehicleSave}
                style={styles.modalUploadBtn}
                disabled={vehicleSaving}>
                {vehicleSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalUploadBtnText}>Save Vehicle</Text>}
              </Pressable>
            </View>

          </Pressable>
        </Pressable>
      </Modal>

    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F9FAFB'},
  content: {paddingBottom: 48},

  // ── Cover + Avatar ────────────────────────────────────────────────────────
  coverWrap: {alignItems: 'center', marginBottom: 56},
  coverBg: {
    width: '100%', height: 170,
    resizeMode: 'cover',
  },
  avatarArea: {
    position: 'absolute', bottom: -52,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: colors.navy, borderWidth: 4, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarImg: {width: 104, height: 104, borderRadius: 52},
  avatarInitials: {color: '#fff', fontSize: 40, fontWeight: '900'},
  cameraOverlay: {
    position: 'absolute', bottom: 4, right: 4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraIcon: {fontSize: 12},
  verifiedBadge: {
    marginTop: 6, backgroundColor: colors.navy,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  verifiedText: {color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5},

  // ── Name / Role ───────────────────────────────────────────────────────────
  nameWrap: {alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.lg},
  nameText: {fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 4},
  roleText: {fontSize: 14, color: '#6B7280', fontWeight: '500'},

  // ── Rating card ───────────────────────────────────────────────────────────
  ratingCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', marginHorizontal: spacing.lg, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: spacing.md,
  },
  ratingLeft: {gap: 6},
  ratingLabel: {fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5},
  ratingRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  ratingValue: {fontSize: 32, fontWeight: '900', color: '#111827'},
  trophyCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EAF2FB',
    justifyContent: 'center', alignItems: 'center',
  },
  trophyIcon: {fontSize: 22, color: '#1066B1'},

  // ── Stats row ─────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row', gap: spacing.md,
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: '#E5E7EB',
  },
  statLabel: {fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5, marginBottom: 6},
  statValue: {fontSize: 28, fontWeight: '900', color: '#111827'},

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    backgroundColor: '#fff', marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderRadius: radius.lg, borderWidth: 1, borderColor: '#E5E7EB',
    padding: spacing.lg, gap: spacing.md,
  },
  sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4},
  sectionHeaderIcon: {fontSize: 16},
  sectionHeaderText: {fontSize: 13, fontWeight: '900', color: '#111827', letterSpacing: 0.5},
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  verificationLabel: {fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1},
  verificationValue: {fontSize: 14, fontWeight: '900', color: '#0F172A', marginTop: 2},
  verificationPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  verificationPillReady: {backgroundColor: '#DCFCE7'},
  verificationPillPending: {backgroundColor: '#FEF3C7'},
  verificationPillText: {fontSize: 11, fontWeight: '900', letterSpacing: 0.5},
  verificationPillTextReady: {color: '#166534'},
  verificationPillTextPending: {color: '#854D0E'},

  // ── Vehicle card ──────────────────────────────────────────────────────────
  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1C2E45', borderRadius: radius.md, padding: spacing.md,
    marginBottom: 4,
  },
  vehicleImgBox: {
    width: 80, height: 64, borderRadius: radius.sm,
    backgroundColor: '#2D4A6B', justifyContent: 'center', alignItems: 'center',
  },
  vehicleImgPlaceholder: {fontSize: 32},
  vehicleInfo: {flex: 1, gap: 4},
  vehicleCategoryTag: {
    alignSelf: 'flex-start', backgroundColor: colors.accent,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3,
    marginBottom: 4,
  },
  vehicleCategoryText: {color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5},
  vehiclePlateLabel: {color: '#94A3B8', fontSize: 11, fontWeight: '600'},
  vehiclePlate: {color: '#fff', fontSize: 16, fontWeight: '900'},

  addVehicleBtn: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderStyle: 'dashed',
    borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addVehicleBtnText: {color: '#374151', fontSize: 14, fontWeight: '700'},

  // ── Document rows ─────────────────────────────────────────────────────────
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderRadius: radius.md,
  },
  docRowBorder: {borderBottomWidth: 1, borderBottomColor: '#F3F4F6'},
  docRowPressed: {backgroundColor: '#F8FAFC'},
  docRowRight: {flexDirection: 'row', alignItems: 'center', gap: 6},
  docRowChevron: {fontSize: 20, color: '#9CA3AF', fontWeight: '300'},
  docIcon: {fontSize: 20, width: 28, textAlign: 'center'},
  docLabel: {flex: 1, fontSize: 14, fontWeight: '600', color: '#111827'},
  docBadge: {borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4},
  docBadgeText: {fontSize: 10, fontWeight: '900', letterSpacing: 0.5},

  // ── Upload modal ──────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingBottom: 36, gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4,
  },
  modalHeaderIcon: {fontSize: 28},
  modalTitle: {fontSize: 18, fontWeight: '900', color: '#111827'},
  modalSubtitle: {fontSize: 13, color: '#6B7280', fontWeight: '500', marginTop: 2},
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCloseBtnText: {fontSize: 14, color: '#6B7280', fontWeight: '700'},
  modalFieldLabel: {
    fontSize: 11, fontWeight: '800', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -4,
  },
  filePicker: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderStyle: 'dashed',
    borderRadius: radius.md, overflow: 'hidden',
  },
  filePickerEmpty: {
    padding: spacing.lg, alignItems: 'center', gap: 6,
    backgroundColor: '#F9FAFB',
  },
  filePickerEmptyIcon: {fontSize: 28},
  filePickerEmptyText: {fontSize: 14, fontWeight: '700', color: '#374151'},
  filePickerEmptyHint: {fontSize: 12, color: '#9CA3AF'},
  filePickerSelected: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, backgroundColor: '#F0FDF4',
  },
  filePickerSelectedIcon: {fontSize: 22},
  filePickerSelectedName: {flex: 1, fontSize: 13, fontWeight: '600', color: '#111827'},
  filePickerChange: {fontSize: 12, fontWeight: '800', color: '#1C2E45'},
  modalInput: {
    backgroundColor: '#F3F4F6', borderRadius: radius.md,
    paddingHorizontal: spacing.lg, minHeight: 48,
    fontSize: 15, color: '#111827', fontWeight: '500',
  },
  modalDatePressable: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  modalDateValue: {fontSize: 15, color: '#111827', fontWeight: '500'},
  modalDatePlaceholder: {fontSize: 15, color: '#9CA3AF', fontWeight: '500'},
  modalDateIcon: {fontSize: 18},
  modalError: {
    fontSize: 13, fontWeight: '700', color: '#DC2626',
    backgroundColor: '#FEF2F2', borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  modalActions: {flexDirection: 'row', gap: spacing.md, marginTop: 4},
  modalCancelBtn: {
    flex: 1, minHeight: 50, justifyContent: 'center', alignItems: 'center',
    borderRadius: radius.md, borderWidth: 1.5, borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  modalCancelBtnText: {fontSize: 15, fontWeight: '700', color: '#374151'},
  modalUploadBtn: {
    flex: 2, minHeight: 50, justifyContent: 'center', alignItems: 'center',
    borderRadius: radius.md, backgroundColor: '#1066B1',
  },
  modalUploadBtnText: {fontSize: 15, fontWeight: '900', color: '#FFFFFF'},

  // ── Document rows ─────────────────────────────────────────────────────────

  // ── Save button ───────────────────────────────────────────────────────────
  saveBtn: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: '#1066B1', borderRadius: radius.lg, minHeight: 56,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  saveBtnDisabled: {opacity: 0.5},
  saveBtnIcon: {color: '#fff', fontSize: 18},
  saveBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},

  // ── Bottom row ────────────────────────────────────────────────────────────
  bottomRow: {
    flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.lg,
  },
  settingsBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: radius.lg,
    minHeight: 52, backgroundColor: '#fff',
  },
  settingsBtnIcon: {fontSize: 16, color: '#374151'},
  settingsBtnText: {color: '#374151', fontSize: 15, fontWeight: '700'},
  logoutBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, borderWidth: 1.5, borderColor: '#FECACA', borderRadius: radius.lg,
    minHeight: 52, backgroundColor: '#FFF1F2',
  },
  logoutBtnIcon: {fontSize: 16, color: '#DC2626'},
  logoutBtnText: {color: '#DC2626', fontSize: 15, fontWeight: '700'},
});

export default ProfileScreen;
