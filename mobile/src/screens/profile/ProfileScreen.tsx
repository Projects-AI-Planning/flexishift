import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {COUNTRIES} from '../../data/countries';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import {launchImageLibrary} from 'react-native-image-picker';
import {driverApi} from '../../api/driverApi';
import {isMeaningfulSignature, segmentsToSmoothPath} from '../../utils/signature';
import Svg, {Path} from 'react-native-svg';
import SignaturePad, {SignaturePadHandle} from '../../components/common/SignaturePad';
import {colors, radius, spacing} from '../../theme';
import TruckCompartmentVisual, {
  TruckCompartment,
} from '../../components/TruckCompartmentVisual';

// ─── Types ────────────────────────────────────────────────────────────────────

const DIAL_CODES = [
  {code: 'GB', dialCode: '+44',  name: 'UK'},
  {code: 'US', dialCode: '+1',   name: 'USA'},
  {code: 'CA', dialCode: '+1',   name: 'Canada'},
  {code: 'AU', dialCode: '+61',  name: 'Australia'},
  {code: 'NZ', dialCode: '+64',  name: 'New Zealand'},
  {code: 'IE', dialCode: '+353', name: 'Ireland'},
  {code: 'DE', dialCode: '+49',  name: 'Germany'},
  {code: 'FR', dialCode: '+33',  name: 'France'},
  {code: 'ES', dialCode: '+34',  name: 'Spain'},
  {code: 'IT', dialCode: '+39',  name: 'Italy'},
  {code: 'NL', dialCode: '+31',  name: 'Netherlands'},
  {code: 'CH', dialCode: '+41',  name: 'Switzerland'},
  {code: 'SE', dialCode: '+46',  name: 'Sweden'},
  {code: 'NO', dialCode: '+47',  name: 'Norway'},
  {code: 'DK', dialCode: '+45',  name: 'Denmark'},
  {code: 'PL', dialCode: '+48',  name: 'Poland'},
  {code: 'SG', dialCode: '+65',  name: 'Singapore'},
  {code: 'HK', dialCode: '+852', name: 'Hong Kong'},
  {code: 'JP', dialCode: '+81',  name: 'Japan'},
  {code: 'IN', dialCode: '+91',  name: 'India'},
  {code: 'PK', dialCode: '+92',  name: 'Pakistan'},
  {code: 'BD', dialCode: '+880', name: 'Bangladesh'},
  {code: 'LK', dialCode: '+94',  name: 'Sri Lanka'},
  {code: 'NG', dialCode: '+234', name: 'Nigeria'},
  {code: 'GH', dialCode: '+233', name: 'Ghana'},
  {code: 'KE', dialCode: '+254', name: 'Kenya'},
  {code: 'ZA', dialCode: '+27',  name: 'South Africa'},
  {code: 'AE', dialCode: '+971', name: 'UAE'},
  {code: 'SA', dialCode: '+966', name: 'Saudi Arabia'},
  {code: 'QA', dialCode: '+974', name: 'Qatar'},
  {code: 'KW', dialCode: '+965', name: 'Kuwait'},
  {code: 'BH', dialCode: '+973', name: 'Bahrain'},
  {code: 'OM', dialCode: '+968', name: 'Oman'},
  {code: 'EG', dialCode: '+20',  name: 'Egypt'},
  {code: 'MA', dialCode: '+212', name: 'Morocco'},
  {code: 'TZ', dialCode: '+255', name: 'Tanzania'},
  {code: 'UG', dialCode: '+256', name: 'Uganda'},
  {code: 'ET', dialCode: '+251', name: 'Ethiopia'},
  {code: 'MX', dialCode: '+52',  name: 'Mexico'},
  {code: 'BR', dialCode: '+55',  name: 'Brazil'},
  {code: 'TR', dialCode: '+90',  name: 'Turkey'},
  {code: 'TH', dialCode: '+66',  name: 'Thailand'},
  {code: 'MY', dialCode: '+60',  name: 'Malaysia'},
  {code: 'ID', dialCode: '+62',  name: 'Indonesia'},
  {code: 'PH', dialCode: '+63',  name: 'Philippines'},
  {code: 'VN', dialCode: '+84',  name: 'Vietnam'},
  {code: 'CN', dialCode: '+86',  name: 'China'},
  {code: 'KR', dialCode: '+82',  name: 'South Korea'},
];

function splitPhone(raw: string): {dialCode: string; number: string} {
  if (!raw) {return {dialCode: '+44', number: ''};}
  const sorted = [...DIAL_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const d of sorted) {
    if (raw.startsWith(d.dialCode)) {
      return {dialCode: d.dialCode, number: raw.slice(d.dialCode.length).trimStart()};
    }
  }
  return {dialCode: '', number: raw};
}

const DRIVER_AVAILABILITY_LABELS: Record<string, string> = {
  DRIVER_ONLY:       'Only Driver',
  DRIVER_WITH_TRUCK: 'Driver with Truck',
  TRUCK_ONLY:        'Only Truck',
};

const DRIVER_MODES = [
  {key: 'DRIVER_ONLY',       label: 'Only Driver',       desc: 'Available as driver — no truck'},
  {key: 'DRIVER_WITH_TRUCK', label: 'Driver with Truck', desc: 'Available with my own truck'},
  {key: 'TRUCK_ONLY',        label: 'Only Truck',        desc: 'Providing a truck — no driver'},
];

const CAPACITY_UNITS = ['kg', 'liters', 'tons', 'cubic m', 'cubic ft'];
const CPT_UNITS      = ['L', 'kg', 'tons', 'cubic ft'];
const VEHICLE_CATEGORIES = [
  'HGV', 'LGV', 'Van', 'Flatbed', 'Tanker', 'Tipper',
  'Refrigerated', 'Skip Loader', 'Curtainsider', 'Box Truck', 'Other',
];

interface ProfileForm {
  name: string;
  phone: string;
  country?: string;
  currency?: string;
  licenceNumber: string;
  vehicleType: string;
  vehicleRegistration: string;
  truckCapacity?: string;
  driverAvailability?: string;
  companyName?: string;
  companyAddress?: string;
  coverageArea?: string;
  equipmentDetails?: any[];
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
  onStripeSetup?: () => void;
  stripeConnectLoading?: boolean;
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
          <Icon
            key={i}
            name="star"
            size={14}
            color={filled || half ? '#000000' : '#D1D5DB'}
            strokeWidth={filled || half ? 2 : 1.5}
          />
        );
      })}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 3},
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
    <AppInput
      label={label}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder ?? label}
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize="none"
      editable={editable}
      containerStyle={{marginBottom: 0}}
    />
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
  {key: 'driving_license', backendKey: 'DRIVING_LICENCE', icon: 'id-card' as const, label: 'Driving License'},
  {key: 'vehicle_registration', backendKey: 'VEHICLE_REG', icon: 'truck' as const, label: 'Vehicle Registration'},
  {key: 'vehicle_insurance', backendKey: 'VEHICLE_INSURANCE', icon: 'shield-check' as const, label: 'Insurance Policy'},
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
  onStripeSetup,
  stripeConnectLoading = false,
  loading,
  refreshing,
  onRefresh,
}) => {
  const [photoUploading, setPhotoUploading] = useState(false);
  const [availDropdownOpen, setAvailDropdownOpen] = useState(false);
  const [dialCodeModalOpen, setDialCodeModalOpen] = useState(false);

  const [phoneDialCode, setPhoneDialCode] = useState(() => splitPhone(profileForm.phone).dialCode || '+44');
  const [phoneNumber, setPhoneNumber] = useState(() => splitPhone(profileForm.phone).number);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  // Backend stores the 2-letter ISO code (e.g. "GB") — look up by iso field
  const selectedCountry = COUNTRIES.find(c => c.iso === profileForm.country) ?? null;
  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    return q ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.includes(q)) : COUNTRIES;
  }, [countrySearch]);
  const [extraDocs, setExtraDocs] = useState<{name: string; docNumber: string}[]>([]);
  const [extraDocNameInput, setExtraDocNameInput] = useState('');
  const [extraDocNumberInput, setExtraDocNumberInput] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);
  const documentsSectionY = useRef<number | null>(null);

  // ── Vehicle modal state ──────────────────────────────────────────────────
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  // Vehicle category dropdown — modal
  const [modalVehCatOpen, setModalVehCatOpen] = useState(false);
  const [modalVehCatSelection, setModalVehCatSelection] = useState('');
  const [modalVehCatOther, setModalVehCatOther] = useState('');
  // Vehicle category dropdown — profile form
  const [profVehCatOpen, setProfVehCatOpen] = useState(false);
  const [profVehCatSelection, setProfVehCatSelection] = useState('');
  const [profVehCatOther, setProfVehCatOther] = useState('');

  // ── E-Signature ──────────────────────────────────────────────────────────
  const [esigModalVisible,  setEsigModalVisible]  = useState(false);
  const [esigSaving,        setEsigSaving]        = useState(false);
  const [esigError,         setEsigError]         = useState('');
  const [esigSuccess,       setEsigSuccess]       = useState(false);
  const [esigRequired,      setEsigRequired]      = useState(false);
  const sigPadRef           = useRef<SignaturePadHandle>(null);
  const [esigValid,         setEsigValid]         = useState(false);
  const [esigCanvasSize,    setEsigCanvasSize]    = useState({width: 0, height: 0});
  // Local override so a just-saved (or just-removed) signature reflects immediately,
  // even before the parent profile prop refreshes. undefined = use profile prop;
  // null = locally removed; string = locally saved.
  const [localEsig, setLocalEsig] = useState<string | null | undefined>(undefined);
  const savedEsignature: string | null =
    localEsig !== undefined
      ? localEsig
      : ((profile?.profile as {esignatureData?: string | null})?.esignatureData ?? null);

  const openEsigModal = () => {
    sigPadRef.current?.clear();
    setEsigValid(false);
    setEsigError('');
    setEsigModalVisible(true);
  };

  const handleEsigSave = async () => {
    const segs = sigPadRef.current?.getSegments() ?? [];
    if (!isMeaningfulSignature(segs)) {
      setEsigError('Please draw your signature — a single tap is not enough.');
      return;
    }
    // Build a data-URI-like string from segments (we store it as JSON for mobile)
    // then call the backend
    const sigData = JSON.stringify({segments: segs, width: esigCanvasSize.width, height: esigCanvasSize.height});
    setEsigSaving(true);
    setEsigError('');
    try {
      await driverApi.profile.saveEsignature(sigData);
      setLocalEsig(sigData);          // reflect immediately so "save profile" no longer asks for it
      setEsigModalVisible(false);
      sigPadRef.current?.clear();
      setEsigValid(false);
      setEsigSuccess(true);
      setEsigRequired(false);
      setTimeout(() => setEsigSuccess(false), 3000);
      onRefresh();                    // sync the parent profile in the background
    } catch {
      setEsigError('Failed to save e-signature. Please try again.');
    } finally {
      setEsigSaving(false);
    }
  };

  const handleEsigDelete = async () => {
    Alert.alert('Remove Signature', 'Remove your saved e-signature?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await driverApi.profile.deleteEsignature();
            setLocalEsig(null);   // reflect removal immediately
            onRefresh();          // sync the parent profile
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  // ── Truck capacity unit ──────────────────────────────────────────────────
  const [truckCapacityUnit, setTruckCapacityUnit] = useState<string>(() => {
    const cap = profileForm.truckCapacity ?? '';
    const match = cap.match(/\b(kg|liters?|tons?|cubic\s*m|cubic\s*ft)\b/i);
    return match ? match[1].toLowerCase().replace('litre', 'liter').replace('ton', 'tons') : 'kg';
  });
  const [truckCapUnitOpen, setTruckCapUnitOpen] = useState(false);
  const [truckCapNumber, setTruckCapNumber] = useState<string>(() => {
    const cap = profileForm.truckCapacity ?? '';
    return cap.replace(/[^0-9.]/g, '');
  });

  // ── Truck compartments ───────────────────────────────────────────────────
  const [compartments, setCompartments] = useState<TruckCompartment[]>(() =>
    ((profileForm.equipmentDetails ?? []) as any[])
      .filter((c: any) => c?.capacityLitres)
      .map((c: any, i: number) => ({
        id: c.id ?? Date.now() + i,
        capacityLitres: String(c.capacityLitres),
        fuelType: c.fuelType ?? '',
        unit: c.unit ?? 'L',
      })),
  );
  const [cptCapacity, setCptCapacity] = useState('');
  const [cptUnit, setCptUnit] = useState('L');
  const [cptUnitOpen, setCptUnitOpen] = useState(false);
  const [cptError, setCptError] = useState('');

  const openVehicleModal = () => {
    const currentType = profileForm.vehicleType ?? '';
    const presets = VEHICLE_CATEGORIES.filter(c => c !== 'Other');
    const isPreset = presets.includes(currentType);
    setVehicleType(currentType);
    setModalVehCatSelection(isPreset ? currentType : currentType ? 'Other' : '');
    setModalVehCatOther(isPreset ? '' : currentType);
    setVehicleReg(profileForm.vehicleRegistration ?? '');
    setVehicleError(null);
    setModalVehCatOpen(false);
    setVehicleModalVisible(true);
  };

  const updateCompartments = (next: TruckCompartment[]) => {
    setCompartments(next);
    onChange({equipmentDetails: next} as any);
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
  type ModalDoc = {key: string; backendKey: string; label: string; icon: string; customName?: string};
  const [activeModal, setActiveModal] = useState<ModalDoc | null>(null);
  const [modalFile, setModalFile] = useState<any>(null);
  const [modalExpiry, setModalExpiry] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalUploading, setModalUploading] = useState(false);
  const [modalPickerDate, setModalPickerDate] = useState(new Date(Date.now() + 86400000));
  const [modalShowPicker, setModalShowPicker] = useState(false);
  const [docManageModalVisible, setDocManageModalVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoadError, setViewerLoadError] = useState(false);

  const openDocViewer = (url: string) => {
    setViewerLoadError(false);
    setViewerUrl(url);
  };

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

  const openUploadFromManage = (doc: ModalDoc) => {
    setDocManageModalVisible(false);
    setTimeout(() => openModal(doc), 350);
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
      if (activeModal.customName) {
        formData.append('customName', activeModal.customName);
      }
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

  // Filter visible docs based on the driver's availability mode
  const availabilityMode = (profileForm.driverAvailability ?? profile?.profile?.driverAvailability ?? '').toUpperCase();
  const visibleDocuments = availabilityMode === 'DRIVER_ONLY'
    ? DRIVER_DOCUMENTS.filter(d => d.key === 'driving_license')
    : availabilityMode === 'TRUCK_ONLY'
    ? DRIVER_DOCUMENTS.filter(d => d.key !== 'driving_license')
    : DRIVER_DOCUMENTS;

  const verificationReady = effectiveDocuments.length > 0 && (
    effectiveVerification?.allDocumentsApproved === true ||
    visibleDocuments.every(doc => {
      const st = normalizeSummaryStatus(documentStatuses[doc.backendKey]);
      return st === 'active' || st === 'complete';
    })
  );
  const overallVerification = effectiveVerification?.allDocumentsApproved === true
    ? 'all approved'
    : effectiveVerification?.profileComplete
      ? 'profile complete'
      : effectiveDocuments.length === 0
      ? 'not started'
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
      || visibleDocuments.every(doc => {
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
      visibleDocuments.some(doc => {
        const status = docStatus[doc.key];
        return status === 'active' || status === 'complete';
      }),
      visibleDocuments.every(doc => {
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
    profileForm.driverAvailability,
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
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? `profile_${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
      } as any);
      await driverApi.profile.uploadPhotoDirect(formData);
      // Refresh profile FIRST so the new backend URL lands in state,
      // then clear local so we swap seamlessly from local → backend URL.
      await onRefresh();
      setLocalPhotoUrl(null);
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
      case 'complete':     return {bg: '#DBEAFE', text: '#1066B1'};
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
              ? <Image
                  source={{uri: photoUrl}}
                  style={styles.avatarImg}
                  onError={() => setLocalPhotoUrl(null)}
                />
              : <Text style={styles.avatarInitials}>{initials}</Text>}
            <View style={styles.cameraOverlay}>
              {photoUploading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Icon name="pen" size={12} color="#ffffff" strokeWidth={2} />}
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
        {profileForm.driverAvailability ? (
          <View style={styles.availabilityBadge}>
            <Text style={styles.availabilityText}>
              {DRIVER_AVAILABILITY_LABELS[profileForm.driverAvailability] ?? profileForm.driverAvailability}
            </Text>
          </View>
        ) : null}
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
          <Icon name="award" size={22} color="#000000" strokeWidth={1.8} />
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
          <Icon name="user" size={16} color="#000000" strokeWidth={2} />
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
        {/* Phone with country code picker */}
        <View style={phoneStyles.wrap}>
          <Text style={phoneStyles.label}>PHONE NUMBER</Text>
          <View style={phoneStyles.row}>
            <Pressable
              style={phoneStyles.dialBtn}
              onPress={() => setDialCodeModalOpen(true)}>
              <Text style={phoneStyles.dialBtnText}>{phoneDialCode}</Text>
              <Text style={phoneStyles.dialChevron}>▾</Text>
            </Pressable>
            <TextInput
              style={phoneStyles.numberInput}
              value={phoneNumber}
              onChangeText={v => {
                setPhoneNumber(v);
                onChange({phone: v.trim() ? `${phoneDialCode}${v.trim()}` : ''});
              }}
              placeholder="7123 456789"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Country — set at registration, cannot be changed */}
        <View style={phoneStyles.wrap}>
          <Text style={phoneStyles.label}>COUNTRY  (locked)</Text>
          <View style={[countryStyles.selector, {backgroundColor: '#F1F5F9'}]}>
            <Text style={countryStyles.flag}>{selectedCountry?.flag ?? '🌍'}</Text>
            <Text style={selectedCountry ? countryStyles.selectedName : countryStyles.placeholder}>
              {selectedCountry ? selectedCountry.name : 'Not set'}
            </Text>
            <Text style={[countryStyles.chevron, {color: '#94A3B8'}]}>🔒</Text>
          </View>
        </View>

        {/* Country picker modal */}
        <Modal
          visible={countryPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setCountryPickerOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCountryPickerOpen(false)}>
            <Pressable style={[styles.modalCard, {maxHeight: '80%', gap: 0}]} onPress={() => {}}>
              <View style={[styles.modalHeader, {marginBottom: 0}]}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <Pressable onPress={() => setCountryPickerOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </Pressable>
              </View>
              <View style={countryStyles.searchWrap}>
                <TextInput
                  style={countryStyles.searchInput}
                  placeholder="Search country..."
                  placeholderTextColor="#9CA3AF"
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                  autoCapitalize="none"
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {filteredCountries.map((c, i) => {
                  const active = c.name === profileForm.country;
                  return (
                    <Pressable
                      key={c.name}
                      style={[countryStyles.row, i < filteredCountries.length - 1 && countryStyles.rowBorder, active && countryStyles.rowActive]}
                      onPress={() => {
                        onChange({country: c.iso, currency: c.currency});
                        setCountryPickerOpen(false);
                        setCountrySearch('');
                      }}>
                      <Text style={countryStyles.rowFlag}>{c.flag}</Text>
                      <Text style={[countryStyles.rowName, active && countryStyles.rowNameActive]}>{c.name}</Text>
                      <Text style={countryStyles.rowCode}>{c.code}</Text>
                      {active && <Text style={countryStyles.rowTick}>✓</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Dial code picker modal */}
        <Modal
          visible={dialCodeModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setDialCodeModalOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDialCodeModalOpen(false)}>
            <Pressable style={[styles.modalCard, {maxHeight: '70%', gap: 0}]} onPress={() => {}}>
              <View style={[styles.modalHeader, {marginBottom: 12}]}>
                <Text style={styles.modalTitle}>Select Country Code</Text>
                <Pressable onPress={() => setDialCodeModalOpen(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {DIAL_CODES.map((d, i) => {
                  const active = d.dialCode === phoneDialCode;
                  const isLast = i === DIAL_CODES.length - 1;
                  return (
                    <Pressable
                      key={d.code}
                      style={[phoneStyles.dialItem, !isLast && phoneStyles.dialItemBorder, active && phoneStyles.dialItemActive]}
                      onPress={() => {
                        setPhoneDialCode(d.dialCode);
                        onChange({phone: phoneNumber.trim() ? `${d.dialCode}${phoneNumber.trim()}` : ''});
                        setDialCodeModalOpen(false);
                      }}>
                      <Text style={[phoneStyles.dialItemName, active && phoneStyles.dialItemNameActive]}>
                        {d.name}
                      </Text>
                      <Text style={[phoneStyles.dialItemCode, active && phoneStyles.dialItemCodeActive]}>
                        {d.dialCode}
                      </Text>
                      {active && <Text style={phoneStyles.dialItemTick}>✓</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>

      {/* ── Vehicle Information ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="truck" size={16} color="#000000" strokeWidth={2} />
          <Text style={styles.sectionHeaderText}>VEHICLE INFORMATION</Text>
        </View>

        {(profileForm.vehicleType || profileForm.vehicleRegistration) ? (
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleImgBox}>
              <Icon name="truck" size={32} color="#000000" strokeWidth={1.5} />
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


        {/* Driver Availability dropdown */}
        {!isHaulier && (
          <View style={daStyles.wrap}>
            <Text style={daStyles.label}>DRIVER AVAILABILITY</Text>
            <Pressable
              style={daStyles.trigger}
              onPress={() => setAvailDropdownOpen(o => !o)}>
              <Text style={profileForm.driverAvailability ? daStyles.triggerValue : daStyles.triggerPlaceholder}>
                {profileForm.driverAvailability
                  ? DRIVER_MODES.find(m => m.key === profileForm.driverAvailability)?.label
                  : 'Select availability type'}
              </Text>
              <Text style={[daStyles.chevron, availDropdownOpen && daStyles.chevronUp]}>▾</Text>
            </Pressable>

            {availDropdownOpen && (
              <View style={daStyles.dropList}>
                {DRIVER_MODES.map((m, i) => {
                  const active = profileForm.driverAvailability === m.key;
                  const isLast = i === DRIVER_MODES.length - 1;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => {
                        onChange({driverAvailability: m.key});
                        setAvailDropdownOpen(false);
                      }}
                      style={[daStyles.dropItem, !isLast && daStyles.dropItemBorder, active && daStyles.dropItemActive]}>
                      <View style={{flex: 1}}>
                        <Text style={[daStyles.dropItemLabel, active && daStyles.dropItemLabelActive]}>
                          {m.label}
                        </Text>
                        <Text style={daStyles.dropItemDesc}>{m.desc}</Text>
                      </View>
                      {active && <Text style={daStyles.dropItemTick}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Conditional Driver Details */}
        {!isHaulier && (profileForm.driverAvailability === 'DRIVER_ONLY' || profileForm.driverAvailability === 'DRIVER_WITH_TRUCK' || !profileForm.driverAvailability) && (
          <View style={daStyles.condBlock}>
            <View style={daStyles.sectionHeadingRow}>
              <Icon name="user" size={14} color="#000000" strokeWidth={2} />
              <Text style={daStyles.sectionHeading}>Driver Details</Text>
            </View>
            <InfoField
              label="LICENCE NUMBER"
              value={profileForm.licenceNumber}
              onChange={v => onChange({licenceNumber: v})}
              placeholder="DL-XXXXXXXXXXXX"
            />
          </View>
        )}

        {/* Conditional Truck Details */}
        {!isHaulier && (profileForm.driverAvailability === 'TRUCK_ONLY' || profileForm.driverAvailability === 'DRIVER_WITH_TRUCK' || !profileForm.driverAvailability) && (
          <View style={daStyles.condBlock}>
            <View style={daStyles.sectionHeadingRow}>
              <Icon name="truck" size={14} color="#000000" strokeWidth={2} />
              <Text style={daStyles.sectionHeading}>Truck Details</Text>
            </View>
            {/* Vehicle Type dropdown */}
            {(() => {
              const presets = VEHICLE_CATEGORIES.filter(c => c !== 'Other');
              const isOther = profVehCatSelection === 'Other';
              const displayLabel = profVehCatSelection
                ? (isOther ? 'Other' : profVehCatSelection)
                : (profileForm.vehicleType || '');
              return (
                <View style={{gap: 6}}>
                  <Text style={daStyles.label}>VEHICLE TYPE</Text>
                  <Pressable
                    style={[daStyles.trigger, profVehCatOpen && {borderColor: '#1066B1'}]}
                    onPress={() => setProfVehCatOpen(o => !o)}>
                    <Text style={displayLabel ? daStyles.triggerValue : daStyles.triggerPlaceholder}>
                      {displayLabel || 'Select vehicle type'}
                    </Text>
                    <Text style={daStyles.chevron}>{profVehCatOpen ? '▴' : '▾'}</Text>
                  </Pressable>
                  {profVehCatOpen && (
                    <View style={daStyles.dropList}>
                      {VEHICLE_CATEGORIES.map((cat, i) => {
                        const active = profVehCatSelection
                          ? profVehCatSelection === cat
                          : presets.includes(profileForm.vehicleType ?? '') ? profileForm.vehicleType === cat : false;
                        return (
                          <Pressable
                            key={cat}
                            style={[daStyles.dropItem, i < VEHICLE_CATEGORIES.length - 1 && daStyles.dropItemBorder, active && daStyles.dropItemActive]}
                            onPress={() => {
                              setProfVehCatSelection(cat);
                              setProfVehCatOpen(false);
                              if (cat !== 'Other') {
                                onChange({vehicleType: cat});
                                setProfVehCatOther('');
                              } else {
                                onChange({vehicleType: profVehCatOther});
                              }
                            }}>
                            <Text style={[daStyles.dropItemLabel, active && daStyles.dropItemLabelActive]}>{cat}</Text>
                            {active && <Text style={daStyles.dropItemTick}>✓</Text>}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  {isOther && (
                    <AppInput
                      label=""
                      value={profVehCatOther}
                      onChangeText={v => { setProfVehCatOther(v); onChange({vehicleType: v}); }}
                      placeholder="Specify vehicle type"
                      autoCapitalize="words"
                      containerStyle={{marginBottom: 0, marginTop: 4}}
                    />
                  )}
                </View>
              );
            })()}
            {/* Truck Capacity with unit */}
            <View style={capStyles.fieldGroup}>
              <Text style={capStyles.fieldLabel}>CAPACITY OF TRUCK</Text>
              <View style={capStyles.row}>
                <TextInput
                  style={capStyles.numInput}
                  keyboardType="numeric"
                  placeholder="e.g. 20000"
                  placeholderTextColor="#9CA4B0"
                  value={truckCapNumber}
                  onChangeText={v => {
                    const n = v.replace(/[^0-9.]/g, '');
                    setTruckCapNumber(n);
                    onChange({truckCapacity: n ? `${n} ${truckCapacityUnit}` : ''});
                  }}
                  returnKeyType="done"
                />
                <Pressable
                  style={capStyles.unitTrigger}
                  onPress={() => setTruckCapUnitOpen(o => !o)}>
                  <Text style={capStyles.unitTriggerText}>{truckCapacityUnit}</Text>
                  <Text style={capStyles.unitChevron}>▾</Text>
                </Pressable>
              </View>
              {truckCapUnitOpen && (
                <View style={capStyles.unitList}>
                  {CAPACITY_UNITS.map((u, i) => (
                    <Pressable
                      key={u}
                      style={[capStyles.unitItem, i < CAPACITY_UNITS.length - 1 && capStyles.unitItemBorder]}
                      onPress={() => {
                        setTruckCapacityUnit(u);
                        setTruckCapUnitOpen(false);
                        onChange({truckCapacity: truckCapNumber ? `${truckCapNumber} ${u}` : ''});
                      }}>
                      <Text style={[capStyles.unitItemText, truckCapacityUnit === u && capStyles.unitItemActive]}>
                        {u}
                      </Text>
                      {truckCapacityUnit === u && <Text style={capStyles.unitItemTick}>✓</Text>}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* ── Truck Compartments ──────────────────────────────────── */}
            <View style={cptStyles.block}>
              <View style={cptStyles.heading}>
                <Icon name="package" size={13} color="#374151" strokeWidth={2} />
                <Text style={cptStyles.headingText}>TRUCK COMPARTMENTS</Text>
              </View>

              {/* Live truck diagram */}
              {compartments.length > 0 && (
                <TruckCompartmentVisual compartments={compartments} />
              )}

              {/* Compartment chips */}
              {compartments.length > 0 && (
                <View style={cptStyles.chipRow}>
                  {compartments.map((cpt, idx) => (
                    <View key={cpt.id} style={cptStyles.chip}>
                      <Text style={cptStyles.chipLabel}>C{idx + 1}</Text>
                      <Text style={cptStyles.chipCap}>{Number(cpt.capacityLitres).toLocaleString()} {cpt.unit ?? 'L'}</Text>
                      <Pressable
                        onPress={() => updateCompartments(compartments.filter(c => c.id !== cpt.id))}
                        style={cptStyles.chipRemove}
                        hitSlop={6}>
                        <Text style={cptStyles.chipRemoveText}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Add compartment form */}
              <View style={cptStyles.formBox}>
                <Text style={cptStyles.formTitle}>
                  {compartments.length === 0 ? 'Add First Compartment' : 'Add Another Compartment'}
                </Text>

                <View style={cptStyles.capacityInput}>
                  <TextInput
                    style={cptStyles.capacityField}
                    keyboardType="numeric"
                    placeholder="e.g. 8000"
                    placeholderTextColor="#9CA4B0"
                    value={cptCapacity}
                    onChangeText={v => { setCptCapacity(v.replace(/[^0-9]/g, '')); setCptError(''); }}
                    returnKeyType="done"
                  />
                  <Pressable
                    style={cptStyles.unitTrigger}
                    onPress={() => setCptUnitOpen(o => !o)}>
                    <Text style={cptStyles.unitTriggerText}>{cptUnit}</Text>
                    <Text style={cptStyles.unitTriggerChevron}>▾</Text>
                  </Pressable>
                </View>
                {cptUnitOpen && (
                  <View style={cptStyles.unitList}>
                    {CPT_UNITS.map((u, i) => (
                      <Pressable
                        key={u}
                        style={[cptStyles.unitListItem, i < CPT_UNITS.length - 1 && cptStyles.unitListItemBorder]}
                        onPress={() => { setCptUnit(u); setCptUnitOpen(false); }}>
                        <Text style={[cptStyles.unitListItemText, cptUnit === u && cptStyles.unitListItemActive]}>
                          {u}
                        </Text>
                        {cptUnit === u && <Text style={cptStyles.unitListItemTick}>✓</Text>}
                      </Pressable>
                    ))}
                  </View>
                )}

                {cptError ? <Text style={cptStyles.error}>{cptError}</Text> : null}

                <Pressable
                  style={[cptStyles.addBtn, !cptCapacity.trim() && cptStyles.addBtnDisabled]}
                  onPress={() => {
                    const cap = cptCapacity.trim();
                    if (!cap || parseFloat(cap) <= 0) {
                      setCptError('Enter a valid capacity value.');
                      return;
                    }
                    updateCompartments([
                      ...compartments,
                      {id: Date.now(), capacityLitres: cap, fuelType: '', unit: cptUnit},
                    ]);
                    setCptCapacity('');
                    setCptError('');
                  }}>
                  <Text style={cptStyles.addBtnText}>＋  Add Compartment</Text>
                </Pressable>
              </View>
            </View>

            <InfoField
              label="VEHICLE REGISTRATION"
              value={profileForm.vehicleRegistration}
              onChange={v => onChange({vehicleRegistration: v})}
              placeholder="e.g. TX-LOG-8892"
            />
          </View>
        )}

        {isHaulier ? (
          <View style={{gap: spacing.md, marginTop: spacing.md}}>
            <View style={styles.sectionHeader}>
              <Icon name="building" size={16} color="#000000" strokeWidth={2} />
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
          <Icon name="folder" size={16} color="#000000" strokeWidth={2} />
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

        {/* ── Extra document names ─────────────────────────────────────── */}
        <View style={extraDocStyles.wrap}>
          <View style={extraDocStyles.headingRow}>
            <Text style={extraDocStyles.label}>ADDITIONAL DOCUMENTS</Text>
            <Text style={extraDocStyles.optionalTag}>OPTIONAL</Text>
          </View>

          {extraDocs.map((doc, idx) => (
            <View key={idx} style={extraDocStyles.card}>
              <View style={extraDocStyles.cardIcon}>
                <Icon name="file" size={17} color={colors.accent} strokeWidth={2} />
              </View>
              <View style={extraDocStyles.cardBody}>
                <Text style={extraDocStyles.cardName}>{doc.name}</Text>
                {doc.docNumber ? <Text style={extraDocStyles.cardNumber}>{doc.docNumber}</Text> : null}
              </View>
              <Pressable
                onPress={() => setExtraDocs(prev => prev.filter((_, i) => i !== idx))}
                style={extraDocStyles.cardRemove}
                hitSlop={8}>
                <Text style={extraDocStyles.cardRemoveText}>✕</Text>
              </Pressable>
            </View>
          ))}

          <View style={extraDocStyles.inputBlock}>
            <AppInput
              label="Document Name"
              placeholder="e.g. Car Insurance, Aadhar Card"
              value={extraDocNameInput}
              onChangeText={setExtraDocNameInput}
              autoCapitalize="words"
              containerStyle={{marginBottom: 12}}
            />
            <AppInput
              label="Document Number"
              placeholder="e.g. POL-2024-98765"
              value={extraDocNumberInput}
              onChangeText={setExtraDocNumberInput}
              autoCapitalize="characters"
              containerStyle={{marginBottom: 12}}
            />
            <Pressable
              style={[extraDocStyles.addBtn, !extraDocNameInput.trim() && extraDocStyles.addBtnDisabled]}
              onPress={() => {
                const trimmedName = extraDocNameInput.trim();
                if (!trimmedName) {return;}
                setExtraDocs(prev => [...prev, {name: trimmedName, docNumber: extraDocNumberInput.trim()}]);
                setExtraDocNameInput('');
                setExtraDocNumberInput('');
              }}>
              <Text style={extraDocStyles.addBtnText}>＋  Add Document</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.manageDocsBtn}
          onPress={() => setDocManageModalVisible(true)}>
          <Icon name="upload" size={15} color="#000000" strokeWidth={2} />
          <Text style={styles.manageDocsBtnText}>  Upload / Manage Documents</Text>
        </Pressable>
      </View>

      {/* ── E-Signature ───────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderIcon}>✍️</Text>
          <Text style={styles.sectionHeaderText}>E-Signature</Text>
        </View>
        <Text style={{fontSize: 12, color: '#6B7280', lineHeight: 18}}>
          Save your signature once — it will auto-fill whenever you need to sign a handover.
        </Text>

        {esigSuccess && (
          <View style={{backgroundColor: '#D1FAE5', borderRadius: 8, padding: 10, marginTop: 4}}>
            <Text style={{fontSize: 12, fontWeight: '700', color: '#065F46'}}>✓ E-signature saved successfully.</Text>
          </View>
        )}

        {/* Preview saved signature */}
        {savedEsignature && (() => {
          let segments: {x1:number;y1:number;x2:number;y2:number}[] = [];
          try { segments = JSON.parse(savedEsignature).segments ?? []; } catch { /* not JSON */ }
          return (
            <View style={{marginTop: 4}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
                <Text style={{fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5}}>Saved Signature</Text>
                <View style={{flexDirection: 'row', gap: 12}}>
                  <Pressable onPress={openEsigModal}>
                    <Text style={{fontSize: 12, fontWeight: '700', color: '#1066B1'}}>Update</Text>
                  </Pressable>
                  <Pressable onPress={handleEsigDelete}>
                    <Text style={{fontSize: 12, fontWeight: '700', color: '#DC2626'}}>Remove</Text>
                  </Pressable>
                </View>
              </View>
              <View style={{
                height: 100, backgroundColor: '#F8FAFB', borderRadius: 10,
                borderWidth: 1.5, borderColor: '#D1D5DB', overflow: 'hidden',
              }}>
                {segments.length > 0 ? (
                  <Svg width="100%" height="100%" pointerEvents="none" style={{position: 'absolute', top: 0, left: 0}}>
                    <Path
                      d={segmentsToSmoothPath(segments)}
                      stroke="#1C2E45"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                ) : (
                  <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                    <Text style={{fontSize: 12, color: '#9CA3AF'}}>Signature stored</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Button to add if none saved */}
        {!savedEsignature && (
          <Pressable
            style={{
              backgroundColor: '#1066B1', borderRadius: 10,
              paddingVertical: 12, alignItems: 'center', marginTop: 4,
            }}
            onPress={openEsigModal}>
            <Text style={{color: '#fff', fontSize: 13, fontWeight: '700'}}>＋  Add E-Signature</Text>
          </Pressable>
        )}

        {esigRequired && !savedEsignature && (
          <View style={{backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#FECACA'}}>
            <Text style={{fontSize: 12, fontWeight: '700', color: '#DC2626'}}>⚠️  E-Signature is required before saving your profile.</Text>
          </View>
        )}
      </View>

      {/* ── E-Signature Draw Modal ─────────────────────────────────────────── */}
      <Modal visible={esigModalVisible} animationType="slide" transparent>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end'}}>
          <View style={{
            backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 20, paddingBottom: 36,
          }}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14}}>
              <Text style={{fontSize: 17, fontWeight: '900', color: '#111827'}}>Draw E-Signature</Text>
              <Pressable
                onPress={() => { setEsigModalVisible(false); setEsigError(''); }}
                style={{width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center'}}>
                <Text style={{fontSize: 18, color: '#6B7280'}}>×</Text>
              </Pressable>
            </View>
            <Text style={{fontSize: 12, color: '#6B7280', marginBottom: 12}}>
              Draw your signature in the box below. It will be saved and used to auto-fill handover forms.
            </Text>

            {/* Drawing canvas — isolated component so drawing only re-renders the
                pad, not this whole screen (keeps the pen responsive). */}
            <SignaturePad
              ref={sigPadRef}
              onValidityChange={setEsigValid}
              onLayout={e => setEsigCanvasSize({width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height})}
              placeholder="Sign here with your finger"
              style={{
                height: 160, backgroundColor: '#F8FAFB',
                borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB',
                borderStyle: 'dashed', overflow: 'hidden', marginBottom: 12,
              }}
            />

            {esigError ? (
              <View style={{backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 10}}>
                <Text style={{fontSize: 12, fontWeight: '700', color: '#DC2626'}}>{esigError}</Text>
              </View>
            ) : null}

            <View style={{flexDirection: 'row', gap: 10}}>
              <Pressable
                style={{flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 12, alignItems: 'center'}}
                onPress={() => { sigPadRef.current?.clear(); setEsigValid(false); setEsigError(''); }}>
                <Text style={{fontSize: 13, fontWeight: '700', color: '#374151'}}>Clear</Text>
              </Pressable>
              <Pressable
                style={[{
                  flex: 2, backgroundColor: '#1066B1', borderRadius: 10,
                  paddingVertical: 12, alignItems: 'center',
                }, (esigSaving || !esigValid) && {opacity: 0.4}]}
                onPress={handleEsigSave}
                disabled={esigSaving || !esigValid}>
                {esigSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{fontSize: 13, fontWeight: '700', color: '#fff'}}>Save E-Signature</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Save Changes ──────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => {
          if (!savedEsignature) {
            setEsigRequired(true);
            return;
          }
          onSave();
        }}
        disabled={loading}
        style={[styles.saveBtn, loading && styles.saveBtnDisabled]}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <>
              <Text style={styles.saveBtnIcon}>✓</Text>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>}
      </Pressable>

      {/* ── Payment Setup (Stripe Connect) ────────────────────────────────── */}
      {onStripeSetup !== undefined && (() => {
        const sc = profile?.stripeConnect;
        const complete = sc?.onboardingComplete === true;
        return (
          <View style={scStyles.card}>
            <View style={scStyles.header}>
              <Text style={scStyles.title}>💳  Payment Setup</Text>
              <View style={[scStyles.badge, complete ? scStyles.badgeDone : scStyles.badgePending]}>
                <Text style={[scStyles.badgeText, complete ? scStyles.badgeTextDone : scStyles.badgeTextPending]}>
                  {complete ? 'Verified' : 'Required'}
                </Text>
              </View>
            </View>
            <Text style={scStyles.body}>
              {complete
                ? 'Your bank account is connected. Earnings will be transferred after each job is completed.'
                : 'Connect your bank account to receive payments. You will need to provide bank details and ID proof via Stripe.'}
            </Text>
            {!complete && (
              <Pressable
                style={[scStyles.btn, stripeConnectLoading && scStyles.btnDisabled]}
                onPress={onStripeSetup}
                disabled={stripeConnectLoading}>
                {stripeConnectLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={scStyles.btnText}>Set Up Bank Account →</Text>}
              </Pressable>
            )}
          </View>
        );
      })()}

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

      {/* ── Document Viewer Modal ────────────────────────────────────────── */}
      <Modal
        visible={!!viewerUrl}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewerUrl(null)}>
        <View style={styles.viewerContainer}>
          {/* Top bar */}
          <View style={styles.viewerTopBar}>
            <Text style={styles.viewerTopBarTitle}>Document</Text>
            <Pressable style={styles.viewerCloseBtn} onPress={() => setViewerUrl(null)}>
              <Text style={styles.viewerCloseBtnText}>✕</Text>
            </Pressable>
          </View>

          {viewerLoadError ? (
            <View style={styles.viewerFallback}>
              <Text style={styles.viewerFallbackIcon}>📄</Text>
              <Text style={styles.viewerFallbackTitle}>Could not load document</Text>
              <Text style={styles.viewerFallbackSub}>The document could not be displayed. Please try again.</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.viewerScrollContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}>
              <ActivityIndicator
                size="large"
                color="#1066B1"
                style={styles.viewerSpinner}
              />
              <Image
                source={{uri: viewerUrl ?? ''}}
                style={styles.viewerImage}
                resizeMode="contain"
                onLoadStart={() => setViewerLoadError(false)}
                onError={() => setViewerLoadError(true)}
              />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ── Document Management Modal ────────────────────────────────────── */}
      <Modal
        visible={docManageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDocManageModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDocManageModalVisible(false)}>
          <Pressable style={[styles.modalCard, {maxHeight: '85%', gap: 0}]} onPress={() => {}}>

            {/* Header */}
            <View style={[styles.modalHeader, {marginBottom: 16}]}>
              <Icon name="folder" size={28} color="#000000" strokeWidth={1.8} />
              <View style={{flex: 1}}>
                <Text style={styles.modalTitle}>My Documents</Text>
                <Text style={styles.modalSubtitle}>
                  {visibleDocuments.filter(d => docStatus[d.key] !== 'not_uploaded').length} of {visibleDocuments.length} uploaded
                </Text>
              </View>
              <Pressable
                onPress={() => setDocManageModalVisible(false)}
                style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Standard required documents */}
              {visibleDocuments.map((doc, idx, arr) => {
                const status = docStatus[doc.key];
                const uploadedDoc = findDoc(doc.key);
                const c = docColor(status);
                const rejectionReason = String(uploadedDoc?.rejectionReason ?? '').trim();
                const fileUrl = uploadedDoc?.fileUrl;
                const expiryDate = uploadedDoc?.expiryDate;
                const isLast = idx === arr.length - 1;
                const isApproved = status === 'active' || status === 'complete';
                const isUnderReview = status === 'under_review';
                const isRejected = status === 'rejected';
                const isNotUploaded = status === 'not_uploaded';

                const formattedExpiry = expiryDate
                  ? (() => {
                      const d = new Date(expiryDate);
                      const isExpired = d < new Date();
                      const label = d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
                      return {label, isExpired};
                    })()
                  : null;

                return (
                  <View
                    key={doc.key}
                    style={[
                      styles.manageDocItem,
                      !isLast && styles.manageDocItemBorder,
                    ]}>

                    {/* Doc title row */}
                    <View style={styles.docRow}>
                      <View style={[styles.docIconCircle, {backgroundColor: c.bg}]}>
                        <Icon name={doc.icon} size={16} color={c.text} strokeWidth={2.2} />
                      </View>
                      <View style={{flex: 1, gap: 3}}>
                        <Text style={styles.docLabel}>{doc.label} <Text style={styles.docRequiredStar}>*</Text></Text>
                        {formattedExpiry && (
                          <View style={styles.docExpiryRow}>
                            <Icon name="calendar" size={11} color={formattedExpiry.isExpired ? '#B91C1C' : '#6B7280'} strokeWidth={2} />
                            <Text style={[styles.docExpiryText, formattedExpiry.isExpired && styles.docExpiryExpired]}>
                              {formattedExpiry.isExpired ? 'Expired' : 'Expires'}: {formattedExpiry.label}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={[styles.docBadge, {backgroundColor: c.bg}]}>
                        <Text style={[styles.docBadgeText, {color: c.text}]}>
                          {docLabel(status)}
                        </Text>
                      </View>
                    </View>

                    {/* Rejection reason — auto-expanded */}
                    {isRejected && (
                      <View style={styles.docRejectBox}>
                        <Text style={styles.docRejectTitle}>Rejection Reason</Text>
                        <Text style={styles.docRejectText}>
                          {rejectionReason || 'Document was rejected by admin. Please upload a clearer document.'}
                        </Text>
                      </View>
                    )}

                    {/* Action buttons */}
                    <View style={styles.manageDocActions}>
                      {/* Upload — not uploaded */}
                      {isNotUploaded && (
                        <Pressable
                          style={styles.manageUploadBtn}
                          onPress={() => openUploadFromManage(doc)}>
                          <Icon name="upload" size={14} color="#1066B1" strokeWidth={2} />
                          <Text style={styles.manageUploadBtnText}>  Upload Document</Text>
                        </Pressable>
                      )}

                      {/* View Doc — under review / approved / rejected */}
                      {(isUnderReview || isApproved || isRejected) && fileUrl && (
                        <Pressable
                          style={styles.manageViewBtn}
                          onPress={() => openDocViewer(String(fileUrl))}>
                          <Icon name="eye" size={14} color="#374151" strokeWidth={2} />
                          <Text style={styles.manageViewBtnText}>  View</Text>
                        </Pressable>
                      )}

                      {/* Re-upload — under review */}
                      {isUnderReview && (
                        <Pressable
                          style={styles.manageReuploadBtn}
                          onPress={() => openUploadFromManage(doc)}>
                          <Icon name="refresh" size={14} color="#000000" strokeWidth={2} />
                          <Text style={styles.manageReuploadBtnText}>  Re-upload</Text>
                        </Pressable>
                      )}

                      {/* Replace — approved */}
                      {isApproved && (
                        <Pressable
                          style={styles.manageReplaceBtn}
                          onPress={() => openUploadFromManage(doc)}>
                          <Icon name="refresh" size={14} color="#1066B1" strokeWidth={2} />
                          <Text style={styles.manageReplaceBtnText}>  Replace</Text>
                        </Pressable>
                      )}

                      {/* Re-upload — rejected */}
                      {isRejected && (
                        <Pressable
                          style={styles.manageReuploadBtn}
                          onPress={() => openUploadFromManage(doc)}>
                          <Icon name="refresh" size={14} color="#000000" strokeWidth={2} />
                          <Text style={styles.manageReuploadBtnText}>  Re-upload</Text>
                        </Pressable>
                      )}
                    </View>

                  </View>
                );
              })}

              {/* Extra documents: merge uploaded OTHER docs from backend + locally added not-yet-uploaded */}
              {(() => {
                // Docs already uploaded to backend (source of truth)
                const uploadedOther = localDocuments.filter(
                  d => (d.docType === 'OTHER' || d.documentType === 'OTHER') && d.customName,
                );
                const uploadedNames = new Set(uploadedOther.map(d => d.customName));
                // Locally added in edit form but not yet uploaded
                const pendingLocal = extraDocs.filter(d => d.name && !uploadedNames.has(d.name));

                const allExtraDocs: Array<{name: string; docNumber: string; uploaded: any | null}> = [
                  ...uploadedOther.map(d => ({name: d.customName, docNumber: '', uploaded: d})),
                  ...pendingLocal.map(d => ({name: d.name, docNumber: d.docNumber, uploaded: null})),
                ];

                return allExtraDocs.map((doc, idx) => {
                  const uploadedExtraDoc = doc.uploaded;
                  const extraDoc = {
                    key: `extra_${doc.name}`,
                    backendKey: 'OTHER',
                    customName: doc.name,
                    icon: 'file' as const,
                    label: doc.name,
                  };
                  const extraStatus = uploadedExtraDoc?.status?.toLowerCase();
                  const isExtraApproved = extraStatus === 'approved' || extraStatus === 'verified';
                  const isExtraReview = extraStatus === 'pending' || extraStatus === 'under_review';
                  const isExtraRejected = extraStatus === 'rejected';
                  const isExtraNotUploaded = !uploadedExtraDoc;
                  const cExtra = isExtraApproved
                    ? {bg: '#DBEAFE', text: '#1066B1'}
                    : isExtraReview
                    ? {bg: '#FEF9C3', text: '#854D0E'}
                    : isExtraRejected
                    ? {bg: '#FEE2E2', text: '#B91C1C'}
                    : {bg: '#F1F5F9', text: '#64748B'};
                  const extraLabelText = isExtraApproved
                    ? 'ACTIVE'
                    : isExtraReview
                    ? 'UNDER REVIEW'
                    : isExtraRejected
                    ? 'REJECTED'
                    : 'NOT UPLOADED';

                  const extraExpiry = uploadedExtraDoc?.expiryDate
                    ? (() => {
                        const d = new Date(uploadedExtraDoc.expiryDate);
                        const isExpired = d < new Date();
                        const label = d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
                        return {label, isExpired};
                      })()
                    : null;

                  return (
                    <View key={idx} style={[styles.manageDocItem, styles.manageDocItemBorder]}>
                      <View style={styles.docRow}>
                        <View style={[styles.docIconCircle, {backgroundColor: cExtra.bg}]}>
                          <Icon name={extraDoc.icon} size={16} color={cExtra.text} strokeWidth={2.2} />
                        </View>
                        <View style={{flex: 1, gap: 3}}>
                          <Text style={styles.docLabel}>{extraDoc.label}</Text>
                          {doc.docNumber ? <Text style={styles.docSubNumber}>{doc.docNumber}</Text> : null}
                          {extraExpiry && (
                            <View style={styles.docExpiryRow}>
                              <Icon name="calendar" size={11} color={extraExpiry.isExpired ? '#B91C1C' : '#6B7280'} strokeWidth={2} />
                              <Text style={[styles.docExpiryText, extraExpiry.isExpired && styles.docExpiryExpired]}>
                                {extraExpiry.isExpired ? 'Expired' : 'Expires'}: {extraExpiry.label}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={[styles.docBadge, {backgroundColor: cExtra.bg}]}>
                          <Text style={[styles.docBadgeText, {color: cExtra.text}]}>{extraLabelText}</Text>
                        </View>
                      </View>
                      <View style={styles.manageDocActions}>
                        {isExtraNotUploaded && (
                          <Pressable
                            style={styles.manageUploadBtn}
                            onPress={() => openUploadFromManage(extraDoc)}>
                            <Icon name="upload" size={14} color="#1066B1" strokeWidth={2} />
                            <Text style={styles.manageUploadBtnText}>  Upload Document</Text>
                          </Pressable>
                        )}
                        {(isExtraReview || isExtraApproved || isExtraRejected) && uploadedExtraDoc?.fileUrl && (
                          <Pressable
                            style={styles.manageViewBtn}
                            onPress={() => openDocViewer(uploadedExtraDoc.fileUrl)}>
                            <Icon name="eye" size={14} color="#374151" strokeWidth={2} />
                            <Text style={styles.manageViewBtnText}>  View</Text>
                          </Pressable>
                        )}
                        {isExtraReview && (
                          <Pressable
                            style={styles.manageReuploadBtn}
                            onPress={() => openUploadFromManage(extraDoc)}>
                            <Icon name="refresh" size={14} color="#000000" strokeWidth={2} />
                            <Text style={styles.manageReuploadBtnText}>  Re-upload</Text>
                          </Pressable>
                        )}
                        {isExtraApproved && (
                          <Pressable
                            style={styles.manageReplaceBtn}
                            onPress={() => openUploadFromManage(extraDoc)}>
                            <Icon name="refresh" size={14} color="#1066B1" strokeWidth={2} />
                            <Text style={styles.manageReplaceBtnText}>  Replace</Text>
                          </Pressable>
                        )}
                        {isExtraRejected && (
                          <Pressable
                            style={styles.manageReuploadBtn}
                            onPress={() => openUploadFromManage(extraDoc)}>
                            <Icon name="refresh" size={14} color="#000000" strokeWidth={2} />
                            <Text style={styles.manageReuploadBtnText}>  Re-upload</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>

          </Pressable>
        </Pressable>
      </Modal>

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
              {activeModal?.icon ? (
                <Icon name={activeModal.icon as any} size={28} color="#000000" strokeWidth={1.8} />
              ) : null}
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
                  <Icon name="file" size={24} color="#000000" strokeWidth={1.8} />
                  <Text style={styles.filePickerSelectedName} numberOfLines={1}>
                    {modalFile.fileName ?? 'Selected file'}
                  </Text>
                  <Text style={styles.filePickerChange}>Change</Text>
                </View>
              ) : (
                <View style={styles.filePickerEmpty}>
                  <Icon name="upload" size={28} color="#000000" strokeWidth={1.8} />
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
              <Icon name="truck" size={28} color="#000000" strokeWidth={1.8} />
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

            {/* Vehicle Type dropdown */}
            <View style={{gap: 6, marginBottom: 12}}>
              <Text style={{fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8}}>Vehicle Type</Text>
              <Pressable
                style={[daStyles.trigger, modalVehCatOpen && {borderColor: '#1066B1'}]}
                onPress={() => { if (!vehicleSaving) setModalVehCatOpen(o => !o); }}>
                <Text style={modalVehCatSelection ? daStyles.triggerValue : daStyles.triggerPlaceholder}>
                  {modalVehCatSelection === 'Other' ? 'Other' : modalVehCatSelection || 'Select vehicle type'}
                </Text>
                <Text style={daStyles.chevron}>{modalVehCatOpen ? '▴' : '▾'}</Text>
              </Pressable>
              {modalVehCatOpen && (
                <View style={daStyles.dropList}>
                  {VEHICLE_CATEGORIES.map((cat, i) => {
                    const active = modalVehCatSelection === cat;
                    return (
                      <Pressable
                        key={cat}
                        style={[daStyles.dropItem, i < VEHICLE_CATEGORIES.length - 1 && daStyles.dropItemBorder, active && daStyles.dropItemActive]}
                        onPress={() => {
                          setModalVehCatSelection(cat);
                          setModalVehCatOpen(false);
                          setVehicleError(null);
                          if (cat !== 'Other') {
                            setVehicleType(cat);
                            setModalVehCatOther('');
                          } else {
                            setVehicleType(modalVehCatOther);
                          }
                        }}>
                        <Text style={[daStyles.dropItemLabel, active && daStyles.dropItemLabelActive]}>{cat}</Text>
                        {active && <Text style={daStyles.dropItemTick}>✓</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {modalVehCatSelection === 'Other' && (
                <AppInput
                  label=""
                  value={modalVehCatOther}
                  onChangeText={v => { setModalVehCatOther(v); setVehicleType(v); setVehicleError(null); }}
                  placeholder="Specify vehicle type"
                  autoCapitalize="words"
                  editable={!vehicleSaving}
                  containerStyle={{marginBottom: 0, marginTop: 4}}
                />
              )}
            </View>

            <AppInput
              label="Registration Number"
              required
              placeholder="e.g. TX-LOG-8892"
              value={vehicleReg}
              onChangeText={v => { setVehicleReg(v); setVehicleError(null); }}
              autoCapitalize="characters"
              editable={!vehicleSaving}
              containerStyle={{marginBottom: 0}}
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
  container: {flex: 1, backgroundColor: colors.bg},
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
  availabilityBadge: {
    marginTop: 6, backgroundColor: '#EAF3FD', borderRadius: 99,
    paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: '#BFDBFE',
  },
  availabilityText: {fontSize: 12, fontWeight: '800', color: '#1066B1', letterSpacing: 0.3},

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
  verificationPillReady: {backgroundColor: '#DBEAFE'},
  verificationPillPending: {backgroundColor: '#1066B1'},
  verificationPillText: {fontSize: 11, fontWeight: '900', letterSpacing: 0.5},
  verificationPillTextReady: {color: '#166534'},
  verificationPillTextPending: {color: '#FFFFFF'},

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

  // ── Document rows (manage modal) ──────────────────────────────────────────
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  docIcon: {width: 28, alignItems: 'center', justifyContent: 'center'},
  docIconCircle: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  docLabel: {fontSize: 14, fontWeight: '700', color: '#111827'},
  docRequiredStar: {color: '#EF4444', fontWeight: '900'},
  docSubNumber: {fontSize: 11, color: '#6B7280', marginTop: 1},
  docExpiryRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  docExpiryText: {fontSize: 11, color: '#6B7280', fontWeight: '600'},
  docExpiryExpired: {color: '#B91C1C'},
  docBadge: {borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4},
  docBadgeText: {fontSize: 10, fontWeight: '900', letterSpacing: 0.5},
  docRejectBox: {
    marginLeft: 40,
    marginTop: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    padding: 10,
  },
  docRejectTitle: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  docRejectText: {color: '#B91C1C', fontSize: 12, lineHeight: 17, fontWeight: '600'},

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
  filePickerEmptyIcon: {},
  filePickerEmptyText: {fontSize: 14, fontWeight: '700', color: '#374151'},
  filePickerEmptyHint: {fontSize: 12, color: '#9CA3AF'},
  filePickerSelected: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, backgroundColor: '#EFF6FF',
  },
  filePickerSelectedIcon: {},
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

  // ── Document viewer ───────────────────────────────────────────────────────
  viewerContainer: {flex: 1, backgroundColor: '#fff'},
  viewerTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 20,
    backgroundColor: '#1C2E45',
  },
  viewerTopBarTitle: {fontSize: 16, fontWeight: '800', color: '#fff'},
  viewerCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  viewerCloseBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  viewerScrollContent: {
    width: Dimensions.get('window').width,
    minHeight: Dimensions.get('window').height - 80,
    justifyContent: 'center', alignItems: 'center',
  },
  viewerImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 80,
  },
  viewerSpinner: {
    position: 'absolute',
  },
  viewerFallback: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, gap: 12, backgroundColor: '#fff',
  },
  viewerFallbackIcon: {fontSize: 56},
  viewerFallbackTitle: {fontSize: 18, fontWeight: '800', color: '#111827'},
  viewerFallbackSub: {fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20},

  // ── Manage documents button ───────────────────────────────────────────────
  manageDocsBtn: {
    borderWidth: 1.5, borderColor: '#000000', borderStyle: 'dashed',
    borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    backgroundColor: '#F5F5F5', marginBottom: 4,
  },
  manageDocsBtnText: {color: '#000000', fontSize: 14, fontWeight: '800'},

  // ── Manage modal doc items ─────────────────────────────────────────────────
  manageDocItem: {paddingVertical: 14},
  manageDocItemBorder: {borderBottomWidth: 1, borderBottomColor: '#F3F4F6'},
  manageDocActions: {marginTop: 10, marginLeft: 40, flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
  manageViewBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#000000',
    flexDirection: 'row', alignItems: 'center',
  },
  manageViewBtnText: {fontSize: 13, fontWeight: '700', color: '#000000'},
  manageViewBtnApproved: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#000000',
    flexDirection: 'row', alignItems: 'center',
  },
  manageViewBtnTextApproved: {fontSize: 13, fontWeight: '700', color: '#000000'},
  manageUploadBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#1066B1',
    flexDirection: 'row', alignItems: 'center',
  },
  manageUploadBtnText: {fontSize: 13, fontWeight: '800', color: '#1066B1'},
  manageReuploadBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#000000',
    flexDirection: 'row', alignItems: 'center',
  },
  manageReuploadBtnText: {fontSize: 13, fontWeight: '800', color: '#000000'},
  manageReplaceBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#1066B1',
    flexDirection: 'row', alignItems: 'center',
  },
  manageReplaceBtnText: {fontSize: 13, fontWeight: '800', color: '#1066B1'},

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

const daStyles = StyleSheet.create({
  condBlock: {gap: spacing.md, marginBottom: 4},
  sectionHeadingRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  sectionHeading: {fontSize: 12, fontWeight: '800', color: '#374151', textAlign: 'left'},
  wrap: {gap: 8},
  label: {fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5},
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: radius.md,
    minHeight: 48, paddingHorizontal: spacing.md, backgroundColor: '#F3F4F6',
  },
  triggerValue: {fontSize: 15, color: '#111827', fontWeight: '600'},
  triggerPlaceholder: {fontSize: 15, color: '#9CA3AF'},
  chevron: {fontSize: 16, color: '#6B7280'},
  chevronUp: {transform: [{rotate: '180deg'}]},
  dropList: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: radius.md,
    backgroundColor: '#FFFFFF', marginTop: 4, overflow: 'hidden',
    shadowColor: '#0B1320', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  dropItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: spacing.md, backgroundColor: '#FFFFFF',
  },
  dropItemBorder: {borderBottomWidth: 1, borderBottomColor: '#F3F4F6'},
  dropItemActive: {backgroundColor: '#EAF3FD'},
  dropItemLabel: {fontSize: 14, fontWeight: '700', color: '#111827'},
  dropItemLabelActive: {color: '#1066B1'},
  dropItemDesc: {fontSize: 11, color: '#6B7280', marginTop: 2},
  dropItemTick: {fontSize: 15, color: '#1066B1', fontWeight: '900'},
});

const extraDocStyles = StyleSheet.create({
  wrap: {gap: 8},
  headingRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  label: {fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5},
  optionalTag: {fontSize: 10, fontWeight: '600', color: '#9CA3AF'},
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D1E4F9',
    borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12,
    shadowColor: '#0B1320', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EAF3FD', justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  cardBody: {flex: 1},
  cardName: {fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 1},
  cardNumber: {fontSize: 11, color: '#6B7280'},
  cardRemove: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FFF1EF', justifyContent: 'center', alignItems: 'center',
  },
  cardRemoveText: {fontSize: 11, color: '#DC2626', fontWeight: '700'},
  inputBlock: {
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E5EAF0',
    borderRadius: radius.md, padding: 14, marginTop: 4,
  },
  addBtn: {
    backgroundColor: '#1066B1', borderRadius: radius.md,
    minHeight: 46, justifyContent: 'center', alignItems: 'center',
  },
  addBtnDisabled: {opacity: 0.4},
  addBtnText: {color: '#fff', fontSize: 14, fontWeight: '700'},
});

const cptStyles = StyleSheet.create({
  block: {gap: 10, marginTop: 4},

  heading: {flexDirection: 'row', alignItems: 'center', gap: 6},
  headingText: {
    fontSize: 11, fontWeight: '800', color: '#374151',
    letterSpacing: 0.8, textTransform: 'uppercase', flex: 1,
  },
  optionalTag: {fontSize: 10, fontWeight: '600', color: '#9CA3AF'},

  // Chips
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F8FAFC', borderWidth: 1.5,
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
  },
  chipLabel: {fontSize: 11, fontWeight: '900', color: '#111827'},
  chipCap: {fontSize: 12, fontWeight: '700', color: '#111827'},
  chipRemove: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
  },
  chipRemoveText: {fontSize: 9, color: '#DC2626', fontWeight: '900'},

  // Form
  formBox: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E5EAF0',
    borderRadius: radius.md, padding: 14, gap: 10,
  },
  formTitle: {fontSize: 12, fontWeight: '800', color: '#374151', letterSpacing: 0.2},

  capacityInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D1D5DB',
    borderRadius: radius.md, minHeight: 46, paddingHorizontal: 12,
  },
  capacityField: {flex: 1, fontSize: 15, color: '#111827', fontWeight: '600'},

  unitTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: '#1066B1',
    backgroundColor: '#EAF3FD',
  },
  unitTriggerText: {fontSize: 13, fontWeight: '800', color: '#1066B1'},
  unitTriggerChevron: {fontSize: 12, color: '#1066B1'},
  unitList: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D1D5DB',
    borderRadius: radius.md, overflow: 'hidden',
    shadowColor: '#0B1320', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  unitListItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FFFFFF',
  },
  unitListItemBorder: {borderBottomWidth: 1, borderBottomColor: '#F0F2F5'},
  unitListItemText: {fontSize: 14, fontWeight: '700', color: '#111827'},
  unitListItemActive: {color: '#1066B1'},
  unitListItemTick: {fontSize: 14, color: '#1066B1', fontWeight: '900'},

  error: {fontSize: 12, fontWeight: '700', color: '#DC2626'},

  addBtn: {
    backgroundColor: '#1066B1', borderRadius: radius.md,
    minHeight: 44, justifyContent: 'center', alignItems: 'center',
  },
  addBtnDisabled: {opacity: 0.4},
  addBtnText: {color: '#fff', fontSize: 13, fontWeight: '800'},
});

const capStyles = StyleSheet.create({
  fieldGroup: {marginBottom: 0},
  fieldLabel: {
    fontSize: 11, fontWeight: '800', color: '#6B7280',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
  },
  row: {flexDirection: 'row', alignItems: 'stretch', gap: 8},
  numInput: {
    flex: 1, backgroundColor: '#FFFFFF', borderColor: '#C9D0DB', borderWidth: 1.5,
    borderRadius: radius.md, minHeight: 52, paddingHorizontal: 14,
    fontSize: 15, color: '#111827', fontWeight: '600',
  },
  unitTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#1066B1',
    borderRadius: radius.md, minHeight: 52, paddingHorizontal: 12,
  },
  unitTriggerText: {fontSize: 13, fontWeight: '800', color: '#1066B1'},
  unitChevron: {fontSize: 13, color: '#1066B1'},
  unitList: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#C9D0DB',
    borderRadius: radius.md, marginTop: 4, overflow: 'hidden',
    shadowColor: '#0B1320', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  unitItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#FFFFFF',
  },
  unitItemBorder: {borderBottomWidth: 1, borderBottomColor: '#F0F2F5'},
  unitItemText: {fontSize: 14, fontWeight: '700', color: '#111827'},
  unitItemActive: {color: '#1066B1'},
  unitItemTick: {fontSize: 14, color: '#1066B1', fontWeight: '900'},
});

const countryStyles = StyleSheet.create({
  selector: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderColor: '#C9D0DB',
    borderRadius: radius.md, borderWidth: 1.5, minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  flag: {fontSize: 20},
  selectedName: {flex: 1, fontSize: 15, fontWeight: '600', color: '#111827'},
  placeholder: {flex: 1, fontSize: 15, fontWeight: '500', color: '#9CA3AF'},
  chevron: {color: '#6B7280', fontSize: 12},
  searchWrap: {
    borderBottomColor: '#F0F2F5', borderBottomWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderRadius: 10,
    borderWidth: 1, color: '#111827', fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  row: {
    alignItems: 'center', flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  rowBorder: {borderBottomColor: '#F3F4F6', borderBottomWidth: 1},
  rowActive: {backgroundColor: '#EFF6FF'},
  rowFlag: {fontSize: 22},
  rowName: {flex: 1, fontSize: 15, fontWeight: '600', color: '#111827'},
  rowNameActive: {color: '#1066B1'},
  rowCode: {color: '#6B7280', fontSize: 14, fontWeight: '700'},
  rowTick: {color: '#1066B1', fontSize: 16, fontWeight: '900', marginLeft: 4},
});

const scStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  title: {fontSize: 15, fontWeight: '700', color: '#111827'},
  badge: {paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99},
  badgePending: {backgroundColor: '#FEF3C7'},
  badgeDone: {backgroundColor: '#D1FAE5'},
  badgeText: {fontSize: 11, fontWeight: '700'},
  badgeTextPending: {color: '#92400E'},
  badgeTextDone: {color: '#065F46'},
  body: {fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 14},
  btn: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: {opacity: 0.5},
  btnText: {color: '#fff', fontSize: 14, fontWeight: '700'},
});

const phoneStyles = StyleSheet.create({
  wrap: {gap: 6},
  label: {fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5},
  row: {
    flexDirection: 'row', alignItems: 'stretch',
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10,
    backgroundColor: '#F3F4F6', overflow: 'hidden',
  },
  dialBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 13,
    borderRightWidth: 1.5, borderRightColor: '#D1D5DB',
    backgroundColor: '#E8ECF0',
  },
  dialBtnText: {fontSize: 14, fontWeight: '800', color: '#111827'},
  dialChevron: {fontSize: 12, color: '#6B7280'},
  numberInput: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 13,
    fontSize: 15, color: '#111827', fontWeight: '500',
  },
  dialItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  dialItemBorder: {borderBottomWidth: 1, borderBottomColor: '#F3F4F6'},
  dialItemActive: {backgroundColor: '#EAF3FD'},
  dialItemName: {flex: 1, fontSize: 14, fontWeight: '600', color: '#111827'},
  dialItemNameActive: {color: '#1066B1', fontWeight: '800'},
  dialItemCode: {fontSize: 14, fontWeight: '700', color: '#6B7280', marginRight: 8},
  dialItemCodeActive: {color: '#1066B1'},
  dialItemTick: {fontSize: 14, fontWeight: '900', color: '#1066B1'},
});

export default ProfileScreen;
