import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  SafeAreaView,
  Alert,
} from 'react-native';
import Card from '../../components/common/Card';

interface DeliveryScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (proofData: any, photos: any[]) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const DeliveryScreen: React.FC<DeliveryScreenProps> = ({
  jobId,
  jobReference,
  onSubmit,
  loading,
  error,
}) => {
  const [notes, setNotes] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [photos, setPhotos] = useState<Record<string, any>>({});

  const handlePickPhoto = (type: string) => {
    Alert.alert('Capture Proof', `Capture ${type}`, [
      {
        text: 'Capture',
        onPress: () => {
          setPhotos(prev => ({...prev, [type]: {uri: 'mock-uri'}}));
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const isComplete = receiverName.length > 2 && Object.keys(photos).length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.stepTitle}>Step 3 of 3</Text>
          <Text style={styles.mainTitle}>Delivery Proof Submission</Text>
          <Text style={styles.subtitle}>
            You've reached your destination. Please capture the final delivery details to complete this job.
          </Text>
        </View>

        <Card title="Proof of Delivery" subtitle={`Ref: ${jobReference}`}>
          <Text style={styles.label}>Receiver's Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Name of the person receiving cargo"
            placeholderTextColor="#8A94A0"
            value={receiverName}
            onChangeText={setReceiverName}
          />
          
          <Text style={[styles.label, {marginTop: 16}]}>Delivery Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any observations or remarks..."
            placeholderTextColor="#8A94A0"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />
        </Card>

        <Card title="Delivery Documentation" subtitle="Upload proof of delivery">
          <View style={styles.photoGrid}>
            <Pressable 
              onPress={() => handlePickPhoto('cargo')}
              style={[styles.photoBox, photos.cargo && styles.photoBoxActive]}
            >
              <Text style={styles.photoIcon}>{photos.cargo ? '✅' : '📸'}</Text>
              <Text style={styles.photoLabel}>Delivered Cargo</Text>
            </Pressable>
            <Pressable 
              onPress={() => handlePickPhoto('pod')}
              style={[styles.photoBox, photos.pod && styles.photoBoxActive]}
            >
              <Text style={styles.photoIcon}>{photos.pod ? '✅' : '📝'}</Text>
              <Text style={styles.photoLabel}>Signed POD</Text>
            </Pressable>
          </View>
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.footer}>
          <Pressable
            onPress={() => onSubmit({receiverName, notes}, Object.values(photos))}
            disabled={loading || !isComplete}
            style={[
              styles.primaryButton,
              (loading || !isComplete) && styles.disabledButton,
            ]}>
            <Text style={styles.primaryButtonText}>
              {loading ? 'Submitting...' : 'Complete Delivery'}
            </Text>
          </Pressable>
          <Text style={styles.completionHint}>
            Completing this delivery will trigger the payment release process.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1E8',
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DFA622',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#5B6671',
    lineHeight: 21,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102235',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F4F1E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#18232F',
    borderWidth: 1,
    borderColor: '#E4DED0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#F4F1E8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4DED0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBoxActive: {
    borderStyle: 'solid',
    borderColor: '#18794E',
    backgroundColor: '#F0F9F4',
  },
  photoIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A94A0',
    textAlign: 'center',
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
    backgroundColor: '#18794E',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  completionHint: {
    fontSize: 12,
    color: '#8A94A0',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default DeliveryScreen;
