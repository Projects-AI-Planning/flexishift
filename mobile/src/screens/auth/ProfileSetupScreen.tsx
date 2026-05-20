import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {colors, radius, spacing} from '../../theme';

interface ProfileSetupScreenProps {
  email: string;
  initialName?: string;
  onComplete: (data: {
    name: string;
    driverAvailability: string;
    licenceNumber: string;
    vehicleType: string;
    vehicleRegistration: string;
    truckCapacity?: string;
    photoFile?: {uri: string; fileName: string; type: string};
    extraDocs: {name: string; docNumber: string}[];
  }) => void;
  onSkip: () => void;
  loading: boolean;
  error: string | null;
}

const DRIVER_MODES = [
  {key: 'DRIVER_ONLY',       label: 'Only Driver',       desc: 'Available as driver only — no truck'},
  {key: 'DRIVER_WITH_TRUCK', label: 'Driver with Truck', desc: 'Available with my own truck'},
  {key: 'TRUCK_ONLY',        label: 'Only Truck',        desc: 'Providing a truck — no driver services'},
];

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  email: _email,
  initialName,
  onComplete,
  onSkip,
  loading,
  error,
}) => {
  const [name, setName] = useState(initialName ?? '');
  const [driverAvailability, setDriverAvailability] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [licenceNumber, setLicenceNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [truckCapacity, setTruckCapacity] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<
    {uri: string; fileName: string; type: string} | undefined
  >();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [extraDocs, setExtraDocs] = useState<{name: string; docNumber: string}[]>([]);
  const [docNameInput, setDocNameInput] = useState('');
  const [docNumberInput, setDocNumberInput] = useState('');

  const showDriverSection = driverAvailability === 'DRIVER_ONLY' || driverAvailability === 'DRIVER_WITH_TRUCK';
  const showTruckSection  = driverAvailability === 'TRUCK_ONLY'  || driverAvailability === 'DRIVER_WITH_TRUCK';

  const clearErr = (key: string) =>
    setFieldErrors(prev => {
      const next = {...prev};
      delete next[key];
      return next;
    });

  const applyPickedAsset = (asset: {uri?: string; fileName?: string | null; type?: string | null}) => {
    if (!asset.uri) {return;}
    setPhotoUri(asset.uri);
    setPhotoFile({uri: asset.uri, fileName: asset.fileName ?? 'photo.jpg', type: asset.type ?? 'image/jpeg'});
  };

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    try {
      const response = source === 'camera'
        ? await launchCamera({mediaType: 'photo', quality: 0.8, saveToPhotos: false})
        : await launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 1});
      if (response.didCancel || response.errorCode || !response.assets?.length) {return;}
      applyPickedAsset(response.assets[0]);
    } catch (pickerError) {
      Alert.alert('Photo upload failed', pickerError instanceof Error ? pickerError.message : 'Please try again.');
    }
  };

  const handlePickPhoto = () => {
    Alert.alert('Profile Photo', 'Choose a method', [
      {text: 'Camera',  onPress: () => {pickPhoto('camera').catch(() => undefined);}},
      {text: 'Gallery', onPress: () => {pickPhoto('gallery').catch(() => undefined);}},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      e.name = 'Full legal name is required (min 2 characters).';
    }
    if (!driverAvailability) {
      e.driverAvailability = 'Please select your availability type.';
    }
    if (showDriverSection && (!licenceNumber.trim() || licenceNumber.trim().length < 4)) {
      e.licenceNumber = 'A valid driving licence number is required.';
    }
    if (showTruckSection && !vehicleType.trim()) {
      e.vehicleType = 'Please enter your vehicle category.';
    }
    return e;
  };

  const onSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    onComplete({
      name,
      driverAvailability,
      licenceNumber,
      vehicleType: vehicleType.trim(),
      vehicleRegistration,
      truckCapacity: truckCapacity.trim() || undefined,
      photoFile,
      extraDocs,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <Text style={styles.subtitle}>Complete your driver profile to start</Text>

        {/* Avatar */}
        <Pressable style={styles.avatarSection} onPress={handlePickPhoto}>
          <View style={styles.avatarCircle}>
            {photoUri
              ? <Image source={{uri: photoUri}} style={styles.avatarImage} />
              : <Icon name="user" size={40} color={colors.accent} />}
            <View style={styles.cameraBtn}>
              <Icon name="camera" size={13} color="#fff" strokeWidth={2} />
            </View>
          </View>
          <Text style={styles.avatarLabel}>{photoUri ? 'Photo Selected ✓' : 'Upload Profile Photo'}</Text>
          <Text style={styles.avatarHint}>PNG, JPG or GIF. Max 5MB.</Text>
        </Pressable>

        {/* API Error */}
        {error ? (
          <View style={styles.apiErrorBox}>
            <Text style={styles.apiErrorText}>{error}</Text>
          </View>
        ) : null}

        {/* Full Legal Name */}
        <AppInput
          label="Full Legal Name"
          autoCapitalize="words"
          onChangeText={v => { setName(v); clearErr('name'); }}
          placeholder="Enter your full name"
          value={name}
          error={fieldErrors.name}
          containerStyle={styles.fieldGroup}
        />

        {/* ── Driver Availability dropdown ────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>I AM AVAILABLE AS</Text>
          <Pressable
            style={[styles.dropdownTrigger, fieldErrors.driverAvailability ? styles.inputError : null]}
            onPress={() => setDropdownOpen(o => !o)}>
            <Text style={driverAvailability ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {driverAvailability
                ? DRIVER_MODES.find(m => m.key === driverAvailability)?.label
                : 'Select availability type'}
            </Text>
            <Text style={[styles.dropdownChevron, dropdownOpen && styles.dropdownChevronUp]}>▾</Text>
          </Pressable>

          {dropdownOpen && (
            <View style={styles.dropdownList}>
              {DRIVER_MODES.map((m, i) => {
                const active = driverAvailability === m.key;
                const isLast = i === DRIVER_MODES.length - 1;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      setDriverAvailability(m.key);
                      setDropdownOpen(false);
                      clearErr('driverAvailability');
                    }}
                    style={[styles.dropdownItem, !isLast && styles.dropdownItemBorder, active && styles.dropdownItemActive]}>
                    <View style={{flex: 1}}>
                      <Text style={[styles.dropdownItemLabel, active && styles.dropdownItemLabelActive]}>
                        {m.label}
                      </Text>
                      <Text style={styles.dropdownItemDesc}>{m.desc}</Text>
                    </View>
                    {active && <Text style={styles.dropdownItemTick}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          )}

          {fieldErrors.driverAvailability
            ? <Text style={styles.inlineError}>{fieldErrors.driverAvailability}</Text>
            : null}
        </View>

        {/* ── Driver Details (DRIVER_ONLY or DRIVER_WITH_TRUCK) ───────────── */}
        {showDriverSection && (
          <View style={styles.conditionalSection}>
            <View style={styles.sectionHeadingRow}>
              <Icon name="user" size={15} color="#374151" strokeWidth={2.2} />
              <Text style={styles.sectionHeading}>Driver Details</Text>
            </View>

            <AppInput
              label="Driving License Number"
              autoCapitalize="characters"
              onChangeText={v => { setLicenceNumber(v); clearErr('licenceNumber'); }}
              placeholder="ABC-1234567-8"
              value={licenceNumber}
              error={fieldErrors.licenceNumber}
              containerStyle={styles.fieldGroup}
            />

          </View>
        )}

        {/* ── Truck Details (TRUCK_ONLY or DRIVER_WITH_TRUCK) ─────────────── */}
        {showTruckSection && (
          <View style={styles.conditionalSection}>
            <View style={styles.sectionHeadingRow}>
              <Icon name="truck" size={15} color="#374151" strokeWidth={2.2} />
              <Text style={styles.sectionHeading}>Truck Details</Text>
            </View>

            {/* Vehicle Category */}
            <AppInput
              label="Vehicle Category"
              autoCapitalize="words"
              onChangeText={v => { setVehicleType(v); clearErr('vehicleType'); }}
              placeholder="e.g. Flatbed, HGV, Van, Tanker"
              value={vehicleType}
              error={fieldErrors.vehicleType}
              containerStyle={styles.fieldGroup}
            />

            {/* Truck Capacity (Optional) */}
            <AppInput
              label="Capacity of Truck (Optional)"
              onChangeText={v => setTruckCapacity(v)}
              placeholder="e.g. 10 Tons, 20,000 kg"
              value={truckCapacity}
              containerStyle={styles.fieldGroup}
            />

            {/* Vehicle Registration */}
            <AppInput
              label="Vehicle Registration Number"
              autoCapitalize="characters"
              onChangeText={v => { setVehicleRegistration(v); clearErr('vehicleRegistration'); }}
              placeholder="e.g. TX-LOG-8892"
              value={vehicleRegistration}
              error={fieldErrors.vehicleRegistration}
              containerStyle={styles.fieldGroup}
            />
          </View>
        )}

        {/* ── Extra Documents ─────────────────────────────────────────────── */}
        {driverAvailability ? (
          <View style={styles.extraDocSection}>
            <View style={styles.sectionHeadingRow}>
              <Icon name="file" size={15} color="#374151" strokeWidth={2.2} />
              <Text style={styles.sectionHeading}>Additional Documents</Text>
              <Text style={styles.optionalTag}>  OPTIONAL</Text>
            </View>

            {/* Added doc cards */}
            {extraDocs.map((doc, idx) => (
              <View key={idx} style={styles.extraDocCard}>
                <View style={styles.extraDocCardIcon}>
                  <Icon name="file" size={18} color={colors.accent} strokeWidth={2} />
                </View>
                <View style={styles.extraDocCardBody}>
                  <Text style={styles.extraDocCardName}>{doc.name}</Text>
                  {doc.docNumber ? (
                    <Text style={styles.extraDocCardNumber}>{doc.docNumber}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setExtraDocs(prev => prev.filter((_, i) => i !== idx))}
                  style={styles.extraDocCardRemove}
                  hitSlop={8}>
                  <Text style={styles.extraDocCardRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}

            {/* Inputs */}
            <View style={styles.extraDocInputBlock}>
              <AppInput
                label="Document Name"
                placeholder="e.g. Car Insurance, Aadhar Card"
                value={docNameInput}
                onChangeText={setDocNameInput}
                autoCapitalize="words"
                containerStyle={{marginBottom: 12}}
              />
              <AppInput
                label="Document Number"
                placeholder="e.g. POL-2024-98765"
                value={docNumberInput}
                onChangeText={setDocNumberInput}
                autoCapitalize="characters"
                containerStyle={{marginBottom: 12}}
              />
              <Pressable
                style={[styles.extraDocAddBtn, !docNameInput.trim() && styles.extraDocAddBtnDisabled]}
                onPress={() => {
                  const name = docNameInput.trim();
                  if (!name) {return;}
                  setExtraDocs(prev => [...prev, {name, docNumber: docNumberInput.trim()}]);
                  setDocNameInput('');
                  setDocNumberInput('');
                }}>
                <Text style={styles.extraDocAddBtnText}>＋  Add Document</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ── Common Document Verification info (shown once any option is selected) ── */}
        {driverAvailability ? (
          <View style={styles.infoBox}>
            <Icon name="info" size={18} color={colors.accent} strokeWidth={2} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoTitle}>Document Verification</Text>
              <Text style={styles.infoDesc}>
                We'll verify your documents in the next step. Please keep your licence and vehicle papers ready.
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          disabled={loading}
          onPress={onSubmit}
          style={[styles.continueBtn, loading && styles.continueBtnDisabled]}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.continueBtnText}>Continue to Verification →</Text>}
        </Pressable>


        <Text style={styles.terms}>
          {'By continuing, you agree to our '}
          <Text style={styles.termsLink}>Driver Terms of Service</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.bg},
  content: {paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, paddingBottom: 48},

  subtitle: {color: '#525863', fontSize: 16, lineHeight: 24, marginBottom: 28},

  avatarSection: {alignItems: 'center', marginBottom: 28},
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#C8DCF4', justifyContent: 'center', alignItems: 'center',
    marginBottom: 10, overflow: 'hidden',
  },
  avatarImage: {width: 96, height: 96, borderRadius: 48},
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#F4F7FB',
  },
  avatarLabel: {color: colors.accent, fontSize: 14, fontWeight: '700', marginBottom: 2},
  avatarHint: {color: colors.inkSoft, fontSize: 12},

  apiErrorBox: {
    backgroundColor: '#FFF1EF', borderColor: '#F3B4B0', borderWidth: 1,
    borderRadius: radius.md, padding: spacing.lg, marginBottom: 16,
  },
  apiErrorText: {color: colors.danger, fontSize: 14, fontWeight: '700'},

  fieldGroup: {marginBottom: 20},
  fieldLabel: {
    color: colors.inkSoft, fontSize: 11, fontWeight: '800',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF', borderColor: '#C9D0DB', borderWidth: 1.5,
    borderRadius: radius.md, minHeight: 54, paddingHorizontal: spacing.lg,
    fontSize: 16, color: colors.ink,
  },
  inputError: {borderColor: colors.danger},
  inlineError: {color: colors.danger, fontSize: 12, marginTop: 4},

  // Availability dropdown
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#C9D0DB', borderRadius: radius.md,
    minHeight: 54, paddingHorizontal: spacing.lg, backgroundColor: '#FFFFFF',
  },
  dropdownValue: {fontSize: 16, color: colors.ink, fontWeight: '600'},
  dropdownPlaceholder: {fontSize: 16, color: '#9CA4B0'},
  dropdownChevron: {fontSize: 18, color: colors.inkSoft},
  dropdownChevronUp: {transform: [{rotate: '180deg'}]},
  dropdownList: {
    borderWidth: 1.5, borderColor: '#C9D0DB', borderRadius: radius.md,
    backgroundColor: '#FFFFFF', marginTop: 4, overflow: 'hidden',
    shadowColor: '#0B1320', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
  },
  dropdownItemBorder: {borderBottomWidth: 1, borderBottomColor: '#F0F2F5'},
  dropdownItemActive: {backgroundColor: '#EAF3FD'},
  dropdownItemLabel: {fontSize: 15, fontWeight: '700', color: colors.ink},
  dropdownItemLabelActive: {color: colors.accent},
  dropdownItemDesc: {fontSize: 12, color: colors.inkSoft, marginTop: 2},
  dropdownItemTick: {fontSize: 16, color: colors.accent, fontWeight: '900'},

  // Conditional sections
  conditionalSection: {marginBottom: 4},
  sectionHeadingRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20},
  sectionHeading: {fontSize: 13, fontWeight: '800', color: '#374151'},
  sectionDivider: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20},
  sectionDividerLine: {flex: 1, height: 1, backgroundColor: '#E5E7EB'},
  sectionDividerLabel: {fontSize: 13, fontWeight: '800', color: '#374151'},

  optionalTag: {color: colors.inkSoft, fontSize: 10, fontWeight: '600'},

  // Extra documents
  extraDocSection: {marginBottom: 20},
  extraDocCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D1E4F9',
    borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10,
    shadowColor: '#0B1320', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  extraDocCardIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EAF3FD', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  extraDocCardBody: {flex: 1},
  extraDocCardName: {fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 2},
  extraDocCardNumber: {fontSize: 12, color: colors.inkSoft},
  extraDocCardRemove: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFF1EF', justifyContent: 'center', alignItems: 'center',
  },
  extraDocCardRemoveText: {fontSize: 12, color: colors.danger, fontWeight: '700'},
  extraDocInputBlock: {
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E5EAF0',
    borderRadius: radius.md, padding: 16, marginTop: 4,
  },
  extraDocAddBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  extraDocAddBtnDisabled: {opacity: 0.4},
  extraDocAddBtnText: {color: '#fff', fontSize: 15, fontWeight: '700'},

  // Info box
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#EAF3FD', borderRadius: radius.md, padding: spacing.lg, marginBottom: 20,
  },
  infoTextWrap: {flex: 1},
  infoTitle: {color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 2},
  infoDesc: {color: colors.inkSoft, fontSize: 13, lineHeight: 19},

  continueBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg, minHeight: 58,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
    shadowColor: colors.accent, shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  continueBtnDisabled: {opacity: 0.7},
  continueBtnText: {color: '#fff', fontSize: 17, fontWeight: '800'},

  terms: {textAlign: 'center', color: colors.inkSoft, fontSize: 13, lineHeight: 20},
  termsLink: {color: colors.accent, fontWeight: '700'},
});

export default ProfileSetupScreen;
