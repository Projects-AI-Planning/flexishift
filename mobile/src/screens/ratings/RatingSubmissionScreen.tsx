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
import Card from '../../components/common/Card';
import {colors, radius, shadow, spacing} from '../../theme';

interface RatingSubmissionScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
}

const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const RatingSubmissionScreen: React.FC<RatingSubmissionScreenProps> = ({
  jobId,
  jobReference,
  onSubmit,
  loading,
  error,
  onCancel,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={onCancel} style={styles.backBtn}>
              <Text style={styles.backText}>{'\u2190'}</Text>
            </Pressable>
            <Text style={styles.orderText}>Order #TR-9422</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.profileCircle}>
              <Text style={styles.profileIcon}>{'\uD83D\uDC64'}</Text>
            </View>
            <Text style={styles.companyName}>Atlas Freight Systems</Text>
            <Text style={styles.ratingLine}>
              {'\u2B50'} <Text style={styles.ratingValue}>4.8</Text>{' '}
              <Text style={styles.ratingMeta}>(1,240 reviews)</Text>
            </Text>
            <View style={styles.partnerPill}>
              <Text style={styles.partnerText}>ELITE PARTNER</Text>
            </View>
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Payment Released</Text>
            <Text style={styles.noticeBody}>
              Delivery confirmed. $1,420.00 has been added to your wallet.
            </Text>
          </View>

          <Card title="Overall Satisfaction" variant="default">
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <Text style={[styles.star, rating >= star && styles.starActive]}>
                    {rating >= star ? '\u2B50' : '\u2606'}
                  </Text>
                </Pressable>
              ))}
              <Text style={styles.scoreText}>{rating ? rating.toFixed(1) : '4.0'}</Text>
            </View>
          </Card>

          <Card title="Communication" variant="default">
            <View style={styles.quickStars}>
              {[1, 2, 3, 4, 5].map(star => (
                <Text key={star} style={styles.quickStar}>
                  {'\u2B50'}
                </Text>
              ))}
              <Text style={styles.quickLabel}>Great</Text>
            </View>
          </Card>

          <Card title="Professionalism" variant="default">
            <View style={styles.quickStars}>
              {[1, 2, 3, 4, 5].map(star => (
                <Text key={star} style={styles.quickStarMuted}>
                  {'\u2606'}
                </Text>
              ))}
              <Text style={styles.quickLabel}>Select</Text>
            </View>
          </Card>

          <Card title="Written Review (Optional)" variant="default">
            <AppInput
              placeholder="Tell us about the unloading experience, site access, or staff helpfulness..."
              multiline
              numberOfLines={6}
              value={comment}
              onChangeText={setComment}
              containerStyle={{marginBottom: 0}}
            />
          </Card>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={() => onSubmit(rating, comment)}
            disabled={loading || rating === 0}
            style={[
              styles.primaryButton,
              (loading || rating === 0) && styles.disabledButton,
            ]}>
            <Text style={styles.primaryButtonText}>
              {loading ? 'Submitting...' : 'Submit Review'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  backText: {
    fontSize: 28,
    color: colors.navy,
    fontWeight: '900',
  },
  title: {
    flex: 1,
    color: colors.navy,
    fontSize: 24,
    fontWeight: '900',
  },
  orderText: {
    color: colors.inkSoft,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 4,
  },
  profileCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#151A32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileIcon: {
    fontSize: 52,
  },
  companyName: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  ratingLine: {
    marginTop: spacing.sm,
    fontSize: 22,
    color: colors.accent,
    fontWeight: '900',
  },
  ratingValue: {
    color: colors.navy,
  },
  ratingMeta: {
    color: colors.inkSoft,
    fontWeight: '700',
    fontSize: 18,
  },
  partnerPill: {
    backgroundColor: '#B5C9E0',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  partnerText: {
    color: colors.navy,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  noticeCard: {
    marginBottom: spacing.lg,
    backgroundColor: '#E7F1FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C7DCF7',
    padding: spacing.xl,
  },
  noticeTitle: {
    color: '#1262B3',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  noticeBody: {
    color: '#1262B3',
    fontSize: 18,
    lineHeight: 24,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  star: {
    fontSize: 42,
    color: '#C7CDD8',
  },
  starActive: {
    color: colors.accent,
  },
  scoreText: {
    marginLeft: 'auto',
    color: colors.inkSoft,
    fontSize: 32,
    fontWeight: '900',
  },
  quickStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  quickStar: {
    fontSize: 38,
    color: colors.accent,
  },
  quickStarMuted: {
    fontSize: 38,
    color: '#C7CDD8',
  },
  quickLabel: {
    marginLeft: 'auto',
    color: colors.inkSoft,
    fontSize: 18,
    fontWeight: '800',
  },
  textArea: {
    minHeight: 180,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3E8F0',
    backgroundColor: '#F8FAFD',
    padding: spacing.lg,
    textAlignVertical: 'top',
    color: colors.ink,
    fontSize: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default RatingSubmissionScreen;
