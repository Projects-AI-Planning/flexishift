import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Card from '../../components/common/Card';

interface RatingSubmissionScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
}

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
          <View style={styles.header}>
            <Pressable onPress={onCancel} style={styles.backBtn}>
              <Text style={styles.backBtnText}>✕ Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Rate Your Experience</Text>
            <Text style={styles.subtitle}>
              How was your interaction with the shipper for job {jobReference}?
            </Text>
          </View>

          <Card title="Star Rating">
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starBtn}>
                  <Text style={[styles.starIcon, rating >= star && styles.starActive]}>
                    {rating >= star ? '⭐' : '☆'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingHint}>
              {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1] || 'Select stars'}
            </Text>
          </Card>

          <Card title="Detailed Feedback">
            <Text style={styles.label}>Your Review</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Share your experience (e.g., promptness, cargo handling, professionalism)..."
              placeholderTextColor="#8A94A0"
              multiline
              numberOfLines={6}
              value={comment}
              onChangeText={setComment}
            />
          </Card>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.footer}>
            <Pressable
              onPress={() => onSubmit(rating, comment)}
              disabled={loading || rating === 0}
              style={[
                styles.primaryButton,
                (loading || rating === 0) && styles.disabledButton,
              ]}>
              <Text style={styles.primaryButtonText}>
                {loading ? 'Submitting...' : 'Submit Rating'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1E8',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DFA622',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#5B6671',
    lineHeight: 21,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 12,
  },
  starBtn: {
    padding: 4,
  },
  starIcon: {
    fontSize: 40,
    color: '#E4DED0',
  },
  starActive: {
    color: '#DFA622',
  },
  ratingHint: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#102235',
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102235',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#F4F1E8',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: '#18232F',
    borderWidth: 1,
    borderColor: '#E4DED0',
    height: 140,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#A53A32',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    marginTop: 32,
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#102235',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});

export default RatingSubmissionScreen;
