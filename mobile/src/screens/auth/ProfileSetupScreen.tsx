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
  TextInput,
  View,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {colors, radius, spacing} from '../../theme';

interface ProfileSetupScreenProps {
  email: string;
  onComplete: (data: {
    licenceNumber: string;
    name: string;
    vehicleType: string;
    photoFile?: {uri: string; fileName: string; type: string};
  }) => void;
  onSkip: () => void;
  loading: boolean;
  error: string | null;
}

const VEHICLES = [
  {icon: '🚛', key: 'FLATBED', label: 'Flatbed'},
  {icon: '❄️', key: 'REFRIGERATED', label: 'Refrigerated'},
  {icon: '📦', key: 'BOX_TRUCK', label: 'Box Truck'},
  {icon: '🏗️', key: 'HGV', label: 'HGV'},
  {icon: '🚐', key: 'VAN', label: 'Van'},
  {icon: '⛽', key: 'TANKER', label: 'Tanker'},
];

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  email: _email,
  onComplete,
  onSkip,
  loading,
  error,
}) => {
  const [name, setName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<
    {uri: string; fileName: string; type: string} | undefined
  >();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearErr = (key: string) =>
    setFieldErrors(prev => {
      const next = {...prev};
      delete next[key];
      return next;
    });

  const applyPickedAsset = (asset: {
    uri?: string;
    fileName?: string | null;
    type?: string | null;
  }) => {
    if (!asset.uri) {
      return;
    }

    setPhotoUri(asset.uri);
    setPhotoFile({
      uri: asset.uri,
      fileName: asset.fileName ?? 'photo.jpg',
      type: asset.type ?? 'image/jpeg',
    });
  };

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    try {
      const response =
        source === 'camera'
          ? await launchCamera({
              mediaType: 'photo',
              quality: 0.8,
              saveToPhotos: false,
            })
          : await launchImageLibrary({
              mediaType: 'photo',
              quality: 0.8,
              selectionLimit: 1,
            });

      if (
        response.didCancel ||
        response.errorCode ||
        !response.assets?.length
      ) {
        return;
      }

      applyPickedAsset(response.assets[0]);
    } catch (pickerError) {
      Alert.alert(
        'Photo upload failed',
        pickerError instanceof Error
          ? pickerError.message
          : 'Please try selecting the photo again.',
      );
    }
  };

  const handlePickPhoto = () => {
    Alert.alert('Profile Photo', 'Choose a method', [
      {
        text: 'Camera',
        onPress: () => {
          pickPhoto('camera').catch(() => undefined);
        },
      },
      {
        text: 'Gallery',
        onPress: () => {
          pickPhoto('gallery').catch(() => undefined);
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      e.name = 'Full legal name is required (min 2 characters).';
    }
    if (!licenceNumber.trim() || licenceNumber.trim().length < 4) {
      e.licenceNumber = 'A valid driving licence number is required.';
    }
    if (!vehicleType) {
      e.vehicleType = 'Please select a vehicle category.';
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
    onComplete({licenceNumber, name, vehicleType, photoFile});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={styles.stepTrack}>
            {[0, 1, 2, 3].map(i => (
              <React.Fragment key={i}>
                <View
                  style={[
                    styles.stepDot,
                    i === 0 && styles.stepDone,
                    i === 1 && styles.stepActive,
                  ]}
                />
                {i < 3 && (
                  <View
                    style={[styles.stepLine, i === 0 && styles.stepLineDone]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
          <Text style={styles.stepLabel}>STEP 2 OF 4</Text>
        </View>

        <Text style={styles.title}>Professional Identity</Text>
        <Text style={styles.subtitle}>
          Complete your driver profile to start
        </Text>

        {/* Avatar */}
        <Pressable style={styles.avatarSection} onPress={handlePickPhoto}>
          <View style={styles.avatarCircle}>
            {photoUri ? (
              <Image source={{uri: photoUri}} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarIcon}>👤</Text>
            )}
            <View style={styles.cameraBtn}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </View>
          <Text style={styles.avatarLabel}>
            {photoUri ? 'Photo Selected ✓' : 'Upload Profile Photo'}
          </Text>
          <Text style={styles.avatarHint}>PNG, JPG or GIF. Max 5MB.</Text>
        </Pressable>

        {/* API Error */}
        {error ? (
          <View style={styles.apiErrorBox}>
            <Text style={styles.apiErrorText}>{error}</Text>
          </View>
        ) : null}

        {/* Full Legal Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>FULL LEGAL NAME</Text>
          <TextInput
            autoCapitalize="words"
            onChangeText={v => {
              setName(v);
              clearErr('name');
            }}
            placeholder="Enter your full name"
            placeholderTextColor="#9CA4B0"
            style={[styles.input, fieldErrors.name ? styles.inputError : null]}
            value={name}
          />
          {fieldErrors.name ? (
            <Text style={styles.inlineError}>{fieldErrors.name}</Text>
          ) : null}
        </View>

        {/* Driving Licence */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DRIVING LICENSE NUMBER</Text>
          <TextInput
            autoCapitalize="characters"
            onChangeText={v => {
              setLicenceNumber(v);
              clearErr('licenceNumber');
            }}
            placeholder="ABC-1234567-8"
            placeholderTextColor="#9CA4B0"
            style={[
              styles.input,
              fieldErrors.licenceNumber ? styles.inputError : null,
            ]}
            value={licenceNumber}
          />
          {fieldErrors.licenceNumber ? (
            <Text style={styles.inlineError}>{fieldErrors.licenceNumber}</Text>
          ) : null}
        </View>

        {/* Vehicle Category */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>VEHICLE CATEGORY</Text>
          <View style={styles.vehicleGrid}>
            {VEHICLES.map(v => (
              <Pressable
                key={v.key}
                onPress={() => {
                  setVehicleType(v.key);
                  clearErr('vehicleType');
                }}
                style={[
                  styles.vehicleChip,
                  vehicleType === v.key && styles.vehicleChipActive,
                ]}>
                <Text style={styles.vehicleIcon}>{v.icon}</Text>
                <Text
                  style={[
                    styles.vehicleLabel,
                    vehicleType === v.key && styles.vehicleLabelActive,
                  ]}>
                  {v.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {fieldErrors.vehicleType ? (
            <Text style={styles.inlineError}>{fieldErrors.vehicleType}</Text>
          ) : null}
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>Document Verification</Text>
            <Text style={styles.infoDesc}>
              We'll ask for photos of your physical license in the next step.
            </Text>
          </View>
        </View>

        <Pressable
          disabled={loading}
          onPress={onSubmit}
          style={[styles.continueBtn, loading && styles.continueBtnDisabled]}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueBtnText}>
              Continue to Verification →
            </Text>
          )}
        </Pressable>

        <Pressable onPress={onSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
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
  safeArea: {flex: 1, backgroundColor: '#F4F7FB'},
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: 48,
  },

  stepRow: {alignItems: 'center', marginBottom: 28},
  stepTrack: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D1D9E6',
  },
  stepDone: {backgroundColor: colors.accent},
  stepActive: {
    backgroundColor: colors.accent,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#AECEF5',
  },
  stepLine: {width: 40, height: 2, backgroundColor: '#D1D9E6'},
  stepLineDone: {backgroundColor: colors.accent},
  stepLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  title: {color: colors.ink, fontSize: 28, fontWeight: '900', marginBottom: 6},
  subtitle: {color: '#525863', fontSize: 16, lineHeight: 24, marginBottom: 28},

  avatarSection: {alignItems: 'center', marginBottom: 28},
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#C8DCF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  avatarImage: {width: 96, height: 96, borderRadius: 48},
  avatarIcon: {fontSize: 44},
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F4F7FB',
  },
  cameraIcon: {fontSize: 13},
  avatarLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  avatarHint: {color: colors.inkSoft, fontSize: 12},

  apiErrorBox: {
    backgroundColor: '#FFF1EF',
    borderColor: '#F3B4B0',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: 16,
  },
  apiErrorText: {color: colors.danger, fontSize: 14, fontWeight: '700'},

  fieldGroup: {marginBottom: 20},
  fieldLabel: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D0DB',
    borderWidth: 1.5,
    borderRadius: radius.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.ink,
  },
  inputError: {borderColor: colors.danger},
  inlineError: {color: colors.danger, fontSize: 12, marginTop: 4},

  vehicleGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  vehicleChip: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D0DB',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  vehicleChipActive: {
    backgroundColor: '#EAF3FD',
    borderColor: colors.accent,
    borderWidth: 2,
  },
  vehicleIcon: {fontSize: 22},
  vehicleLabel: {color: colors.inkSoft, fontSize: 12, fontWeight: '700'},
  vehicleLabelActive: {color: colors.accent, fontWeight: '900'},

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EAF3FD',
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: 24,
  },
  infoIcon: {fontSize: 18},
  infoTextWrap: {flex: 1},
  infoTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  infoDesc: {color: colors.inkSoft, fontSize: 13, lineHeight: 19},

  continueBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  continueBtnDisabled: {opacity: 0.7},
  continueBtnText: {color: '#fff', fontSize: 17, fontWeight: '800'},
  skipBtn: {alignItems: 'center', paddingVertical: 14},
  skipText: {color: colors.inkSoft, fontSize: 14, fontWeight: '700'},
  terms: {
    textAlign: 'center',
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  termsLink: {color: colors.accent, fontWeight: '700'},
});

export default ProfileSetupScreen;
