import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AppInput from '../../components/common/AppInput';
import {colors, radius, spacing} from '../../theme';

interface RatingSubmissionScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
}

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(star => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          hitSlop={6}
          style={styles.starBtn}>
          <Text style={[styles.star, value >= star && styles.starActive]}>
            {value >= star ? '★' : '☆'}
          </Text>
        </Pressable>
      ))}
      {value > 0 && (
        <Text style={styles.starLabel}>{STAR_LABELS[value]}</Text>
      )}
    </View>
  );
}

const RatingSubmissionScreen: React.FC<RatingSubmissionScreenProps> = ({
  jobReference,
  onSubmit,
  loading,
  error,
  onCancel,
}) => {
  const [overallRating, setOverallRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [comment, setComment] = useState('');

  const canSubmit = overallRating > 0;

  const handleSubmit = () => {
    const subRatings = [
      communicationRating > 0 ? `Communication: ${communicationRating}/5` : null,
      professionalismRating > 0 ? `Professionalism: ${professionalismRating}/5` : null,
    ]
      .filter(Boolean)
      .join(', ');
    const fullComment = [comment.trim(), subRatings].filter(Boolean).join(' | ');
    onSubmit(overallRating, fullComment);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <Text style={styles.screenTitle}>Rate Your Experience</Text>
          <Text style={styles.screenSubtitle}>
            Job <Text style={styles.jobRef}>{jobReference}</Text>
          </Text>

          {/* ── Overall Satisfaction ────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Overall Satisfaction</Text>
            <Text style={styles.cardHint}>How was your overall experience with the haulier?</Text>
            <StarRow value={overallRating} onChange={setOverallRating} />
          </View>

          {/* ── Communication ───────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Communication</Text>
            <Text style={styles.cardHint}>Was the haulier responsive and clear?</Text>
            <StarRow value={communicationRating} onChange={setCommunicationRating} />
          </View>

          {/* ── Professionalism ─────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Professionalism</Text>
            <Text style={styles.cardHint}>Did they handle the job in a professional manner?</Text>
            <StarRow value={professionalismRating} onChange={setProfessionalismRating} />
          </View>

          {/* ── Written Review ───────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Written Review</Text>
            <Text style={styles.cardHint}>Optional — share any additional feedback</Text>
            <AppInput
              placeholder="Describe the experience, loading process, communication..."
              multiline
              numberOfLines={5}
              value={comment}
              onChangeText={setComment}
              containerStyle={{marginBottom: 0, marginTop: spacing.sm}}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* ── Actions ──────────────────────────────────────────────────────── */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading || !canSubmit}
            style={[styles.submitBtn, (loading || !canSubmit) && styles.submitBtnDisabled]}>
            <Text style={styles.submitBtnText}>
              {loading ? 'Submitting…' : '✓  Submit Review'}
            </Text>
          </Pressable>

          <Pressable onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Skip for now</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  flex: {flex: 1},
  content: {padding: 16, paddingBottom: 48},

  /* Header */
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: 20,
  },
  jobRef: {
    fontWeight: '800',
    color: colors.navy,
  },

  /* Card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 12,
    color: colors.inkSoft,
    marginBottom: 14,
    lineHeight: 17,
  },

  /* Stars */
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starBtn: {
    padding: 4,
  },
  star: {
    fontSize: 34,
    color: '#D1D5DB',
  },
  starActive: {
    color: colors.accent,
  },
  starLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },

  /* Error */
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  /* Buttons */
  submitBtn: {
    backgroundColor: '#1066B1',
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  submitBtnDisabled: {opacity: 0.45},
  submitBtnText: {color: '#fff', fontSize: 16, fontWeight: '800'},

  cancelBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  cancelBtnText: {color: colors.inkSoft, fontSize: 14, fontWeight: '700'},
});

export default RatingSubmissionScreen;
