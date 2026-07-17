import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import {Asset, launchImageLibrary} from 'react-native-image-picker';
import {colors, radius, spacing} from '../../theme';
import Icon, {IconName} from '../../components/common/Icon';

interface IncidentReportScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (type: string, description: string, photos: Asset[]) => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

const INCIDENT_TYPES = [
  {id: 'accident', icon: 'alert-triangle', label: 'Accident'},
  {id: 'breakdown', icon: 'settings', label: 'Breakdown'},
  {id: 'delay', icon: 'clock', label: 'Delay'},
  {id: 'cargo_damage', icon: 'package', label: 'Cargo Issue'},
  {id: 'route_change', icon: 'map', label: 'Route Change'},
  {id: 'other', icon: 'info', label: 'Other'},
] satisfies Array<{id: string; icon: IconName; label: string}>;

const IncidentReportScreen: React.FC<IncidentReportScreenProps> = ({
  jobReference,
  onSubmit,
  onBack,
  loading,
  error,
}) => {
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<Asset[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = Boolean(selectedType && description.trim().length > 10);

  const handleSubmit = async () => {
    if (!canSubmit) {return;}
    await onSubmit(selectedType, description.trim(), photos);
    setSubmitted(true);
  };

  const pickPhotos = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 0,
    });
    if (result.didCancel) {return;}
    const selectedAssets = (result.assets ?? []).filter(asset => asset.uri);
    if (selectedAssets.length) {
      setPhotos(current => [...current, ...selectedAssets].slice(0, 10));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(current => current.filter((_, idx) => idx !== index));
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.topTitle}>Report Submitted</Text>
          <View style={{width: 60}} />
        </View>
        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <Icon name="check" size={38} color={colors.accent} strokeWidth={3} />
          </View>
          <Text style={styles.successTitle}>Issue Reported</Text>
          <Text style={styles.successSub}>
            The haulier has been notified. Continue updating your trip status from the tracking screen.
          </Text>
          <Pressable onPress={onBack} style={styles.returnBtn}>
            <Text style={styles.returnBtnText}>Return to Tracking</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const selected = INCIDENT_TYPES.find(t => t.id === selectedType);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.topTitle}>Report Issue</Text>
        <View style={styles.jobRefPill}>
          <Text style={styles.jobRefText}>{jobReference}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Icon name={selected?.icon ?? 'alert-triangle'} size={24} color={colors.accent} strokeWidth={2.2} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Job Issue Report</Text>
            <Text style={styles.summaryTitle}>{selected ? selected.label : 'Select an issue type'}</Text>
            <Text style={styles.summarySub}>
              This creates a dispute visible to the haulier and admin team.
            </Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Icon name="info" size={18} color={colors.warning} strokeWidth={2.4} />
          <Text style={styles.noticeText}>
            For emergencies, call 112 first. Submit this report after immediate safety steps are handled.
          </Text>
        </View>

        {/* Issue type */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Issue Type</Text>
          <Text style={styles.sectionHint}>Select the category that best describes the problem</Text>
          <View style={styles.typeGrid}>
            {INCIDENT_TYPES.map(type => {
              const isSelected = selectedType === type.id;
              return (
                <Pressable
                  key={type.id}
                  onPress={() => setSelectedType(type.id)}
                  style={[
                    styles.typeCard,
                    isSelected && styles.typeCardSelected,
                  ]}>
                  <View style={[styles.typeIconBox, isSelected && styles.typeIconBoxSelected]}>
                    <Icon
                      name={type.icon}
                      size={22}
                      color={isSelected ? '#fff' : colors.accent}
                      strokeWidth={2.3}
                    />
                  </View>
                  <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>{type.label}</Text>
                  {isSelected && (
                    <View style={styles.checkDot}>
                      <Icon name="check" size={12} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.sectionHint}>Include location, time, and any immediate actions taken</Text>
          <View style={styles.textAreaWrap}>
            <TextInput
              style={styles.textArea}
              placeholder="Describe what happened in detail…"
              placeholderTextColor="#9AA4B2"
              multiline
              numberOfLines={Platform.OS === 'ios' ? undefined : 5}
              textAlignVertical="top"
              maxLength={500}
              value={description}
              onChangeText={setDescription}
            />
            <Text style={[
              styles.charCount,
              description.length > 450 && styles.charCountWarn,
            ]}>
              {description.length} / 500
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionLabel}>Issue Images</Text>
              <Text style={styles.sectionHint}>Add photos of damage, delays, route issues, or vehicle condition</Text>
            </View>
            <Text style={styles.photoCount}>{photos.length} / 10</Text>
          </View>

          <Pressable onPress={pickPhotos} disabled={loading || photos.length >= 10} style={styles.photoPicker}>
            <View style={styles.photoPickerIcon}>
              <Icon name="camera" size={22} color={colors.accent} strokeWidth={2.2} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.photoPickerTitle}>Add images</Text>
              <Text style={styles.photoPickerSub}>Choose one or more photos from gallery</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.inkSoft} strokeWidth={2.2} />
          </Pressable>

          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`} style={styles.photoThumbWrap}>
                  <Image source={{uri: photo.uri}} style={styles.photoThumb} />
                  <Pressable onPress={() => removePhoto(index)} style={styles.photoRemove}>
                    <Icon name="x" size={12} color="#fff" strokeWidth={3} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading || !canSubmit}
          style={[styles.submitBtn, (!canSubmit || loading) && styles.submitBtnDisabled]}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Issue Report</Text>
          )}
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.bg},

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {width: 60},
  backText: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  topTitle: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  jobRefPill: {
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 80,
  },
  jobRefText: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },

  content: {padding: spacing.xl, paddingBottom: 48, gap: spacing.md},

  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {flex: 1},
  summaryLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  summaryTitle: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  summarySub: {color: colors.inkSoft, fontSize: 13, lineHeight: 19, marginTop: 4},

  noticeCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F5D48C',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noticeText: {flex: 1, color: '#7A4E00', fontSize: 12, lineHeight: 18, fontWeight: '700'},

  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHint: {color: colors.inkSoft, fontSize: 12, lineHeight: 17, marginTop: -2},
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  photoCount: {color: colors.accent, fontSize: 12, fontWeight: '900'},

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  typeCard: {
    width: '48%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    position: 'relative',
  },
  typeCardSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: '#F6FBFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  typeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconBoxSelected: {backgroundColor: colors.accent},
  typeLabel: {color: colors.navy, fontSize: 13, fontWeight: '800', textAlign: 'center'},
  typeLabelSelected: {color: colors.accent},
  checkDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textAreaWrap: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  textArea: {
    fontSize: 15,
    color: colors.ink,
    minHeight: 120,
    lineHeight: 22,
  },
  charCount: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  charCountWarn: {color: '#D97706'},

  photoPicker: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  photoPickerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerTitle: {color: colors.navy, fontSize: 14, fontWeight: '900'},
  photoPickerSub: {color: colors.inkSoft, fontSize: 12, marginTop: 2},
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoThumbWrap: {
    width: 74,
    height: 74,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.neutralSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoThumb: {width: '100%', height: '100%'},
  photoRemove: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(4, 22, 39, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  errorIcon: {fontSize: 16, marginTop: 1},
  errorText: {flex: 1, color: colors.danger, fontSize: 13, fontWeight: '700', lineHeight: 19},

  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {opacity: 0.4, shadowOpacity: 0},
  submitBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},

  successWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    gap: spacing.xl,
  },
  successIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#86EFAC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {color: colors.navy, fontSize: 26, fontWeight: '900', textAlign: 'center'},
  successSub: {
    color: colors.inkSoft,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  returnBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  returnBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},
});

export default IncidentReportScreen;
