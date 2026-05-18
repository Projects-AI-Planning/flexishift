import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import AppInput from '../../components/common/AppInput';
import {colors, radius, shadow, spacing} from '../../theme';

interface IncidentReportScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (type: string, description: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

const INCIDENT_TYPES = [
  {id: 'accident', label: '🚨 Accident', color: '#FEE2E2', textColor: '#B91C1C'},
  {id: 'breakdown', label: '🔧 Breakdown', color: '#FEF9C3', textColor: '#92400E'},
  {id: 'delay', label: '⏱ Delay', color: '#EFF6FF', textColor: '#1D4ED8'},
  {id: 'cargo_damage', label: '📦 Cargo Issue', color: '#FEF3C7', textColor: '#D97706'},
  {id: 'route_change', label: '🗺 Route Change', color: '#EFF6FF', textColor: '#1066B1'},
  {id: 'other', label: '❓ Other', color: '#F1F5F9', textColor: '#475569'},
];

const IncidentReportScreen: React.FC<IncidentReportScreenProps> = ({
  jobId,
  jobReference,
  onSubmit,
  onBack,
  loading,
  error,
}) => {
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = selectedType && description.trim().length > 10;

  const handleSubmit = async () => {
    if (!canSubmit) {return;}
    await onSubmit(selectedType, description.trim());
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successWrap}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Incident Reported</Text>
          <Text style={styles.successSub}>
            The haulier has been notified. Continue updating your trip status.
          </Text>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Return to Tracking</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack} style={styles.topBack}>
          <Text style={styles.topBackText}>← Back to Tracking</Text>
        </Pressable>

        <View style={styles.pageHeader}>
          <View style={styles.refPill}>
            <Text style={styles.refText}>{jobReference}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Incident Type</Text>
        <View style={styles.typeGrid}>
          {INCIDENT_TYPES.map(type => (
            <Pressable
              key={type.id}
              onPress={() => setSelectedType(type.id)}
              style={[
                styles.typeCard,
                {backgroundColor: type.color},
                selectedType === type.id && styles.typeCardSelected,
              ]}>
              <Text style={[styles.typeLabel, {color: type.textColor}]}>
                {type.label}
              </Text>
              {selectedType === type.id && (
                <View style={[styles.typeCheck, {backgroundColor: type.textColor}]}>
                  <Text style={styles.typeCheckText}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Description</Text>
        <AppInput
          placeholder="Describe what happened in detail. Include location, time, and any immediate actions taken..."
          multiline
          numberOfLines={6}
          value={description}
          onChangeText={setDescription}
          containerStyle={{marginBottom: 0}}
        />
        <Text style={styles.charCount}>{description.length} / 500</Text>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ In case of emergency or accident, call emergency services (112) first before reporting here.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading || !canSubmit}
          style={[styles.submitBtn, (!canSubmit || loading) && styles.submitBtnDisabled]}>
          {loading ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={styles.submitBtnText}>Notify Haulier Now</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: spacing.xl, paddingBottom: 100, gap: spacing.lg},
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  successIcon: {fontSize: 56},
  successTitle: {color: colors.navy, fontSize: 26, fontWeight: '900', textAlign: 'center'},
  successSub: {
    color: colors.inkSoft,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
  },
  backBtn: {
    backgroundColor: '#1066B1',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  backBtnText: {color: colors.card, fontSize: 16, fontWeight: '900'},
  topBack: {alignSelf: 'flex-start'},
  topBackText: {color: colors.accent, fontSize: 15, fontWeight: '800'},
  pageHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  pageTitle: {color: colors.navy, fontSize: 28, fontWeight: '900'},
  refPill: {
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  refText: {color: colors.inkSoft, fontSize: 12, fontWeight: '800'},
  sectionLabel: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    width: '48%',
    justifyContent: 'space-between',
  },
  typeCardSelected: {
    borderColor: colors.navy,
  },
  typeLabel: {fontSize: 14, fontWeight: '800'},
  typeCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeCheckText: {color: '#fff', fontSize: 11, fontWeight: '900'},
  textArea: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    minHeight: 140,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    fontSize: 15,
    color: colors.ink,
  },
  charCount: {color: colors.inkSoft, fontSize: 11, textAlign: 'right'},
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {color: '#92400E', fontSize: 13, lineHeight: 20},
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {color: colors.danger, fontSize: 13, fontWeight: '700'},
  submitBtn: {
    backgroundColor: colors.danger,
    borderRadius: radius.xl,
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {opacity: 0.45},
  submitBtnText: {color: colors.card, fontSize: 18, fontWeight: '900'},
});

export default IncidentReportScreen;
