import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface IncidentReportScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (type: string, description: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

const INCIDENT_TYPES = [
  {id: 'accident',     emoji: '🚨', label: 'Accident',     bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5'},
  {id: 'breakdown',    emoji: '🔧', label: 'Breakdown',    bg: '#FFFBEB', text: '#92400E', border: '#FDE68A'},
  {id: 'delay',        emoji: '⏱',  label: 'Delay',        bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE'},
  {id: 'cargo_damage', emoji: '📦', label: 'Cargo Issue',  bg: '#FEF3C7', text: '#D97706', border: '#FCD34D'},
  {id: 'route_change', emoji: '🗺',  label: 'Route Change', bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD'},
  {id: 'other',        emoji: '❓', label: 'Other',        bg: '#F8FAFC', text: '#475569', border: '#CBD5E1'},
];

const IncidentReportScreen: React.FC<IncidentReportScreenProps> = ({
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
            <Text style={styles.successIcon}>✅</Text>
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

        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroEmoji}>{selected ? selected.emoji : '⚠️'}</Text>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>
              {selected ? selected.label : 'What happened?'}
            </Text>
            <Text style={styles.heroSub}>
              Select an issue type and describe the situation so the haulier can assist.
            </Text>
          </View>
        </View>

        {/* Emergency notice */}
        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyIcon}>🚒</Text>
          <Text style={styles.emergencyText}>
            Emergency or accident? Call <Text style={styles.emergencyBold}>112</Text> first, then report here.
          </Text>
        </View>

        {/* Issue type */}
        <View style={styles.section}>
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
                    {backgroundColor: type.bg, borderColor: isSelected ? type.text : type.border},
                    isSelected && styles.typeCardSelected,
                  ]}>
                  <Text style={styles.typeEmoji}>{type.emoji}</Text>
                  <Text style={[styles.typeLabel, {color: type.text}]}>{type.label}</Text>
                  {isSelected && (
                    <View style={[styles.checkDot, {backgroundColor: type.text}]}>
                      <Text style={styles.checkDotText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
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
            <>
              <Text style={styles.submitBtnText}>Notify Haulier</Text>
              <Text style={styles.submitBtnSub}>Send issue report immediately</Text>
            </>
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

  content: {padding: spacing.xl, paddingBottom: 48, gap: spacing.lg},

  heroBanner: {
    backgroundColor: '#FFF5F5',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroEmoji: {fontSize: 40},
  heroText: {flex: 1, gap: 4},
  heroTitle: {color: '#7F1D1D', fontSize: 18, fontWeight: '900'},
  heroSub: {color: '#991B1B', fontSize: 13, lineHeight: 18},

  emergencyCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emergencyIcon: {fontSize: 20},
  emergencyText: {flex: 1, color: '#78350F', fontSize: 13, lineHeight: 18},
  emergencyBold: {fontWeight: '900'},

  section: {gap: spacing.sm},
  sectionLabel: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHint: {color: colors.inkSoft, fontSize: 12, lineHeight: 17, marginTop: -2},

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  typeCard: {
    width: '48%',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  typeCardSelected: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  typeEmoji: {fontSize: 28},
  typeLabel: {fontSize: 13, fontWeight: '800', textAlign: 'center'},
  checkDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkDotText: {color: '#fff', fontSize: 11, fontWeight: '900'},

  textAreaWrap: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
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
    backgroundColor: colors.danger,
    borderRadius: radius.xl,
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    shadowColor: colors.danger,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {opacity: 0.4, shadowOpacity: 0},
  submitBtnText: {color: '#fff', fontSize: 17, fontWeight: '900'},
  submitBtnSub: {color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600'},

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
  successIcon: {fontSize: 44},
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
