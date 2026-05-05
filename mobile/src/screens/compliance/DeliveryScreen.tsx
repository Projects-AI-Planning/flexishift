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
import {colors, radius, shadow, spacing} from '../../theme';

interface DeliveryScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (proofData: any, photos: any[]) => Promise<void>;
  onBack?: () => void;
  loading: boolean;
  error: string | null;
}

const DeliveryScreen: React.FC<DeliveryScreenProps> = ({
  jobId,
  jobReference,
  onSubmit,
  onBack,
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
          setPhotos(prev => ({...prev, [type]: {uri: 'mock-uri', type}}));
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const isComplete = receiverName.length > 2 && Object.keys(photos).length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>{'\u2190'} Tracking</Text>
          </Pressable>
          <Text style={styles.title}>Step 3: Delivery Report</Text>
          <Text style={styles.brand}>LOGIFLOW</Text>
        </View>

        <View style={styles.stepper}>
          <View style={styles.stepNodeDone}>
            <Text style={styles.stepNodeDoneText}>{'\u2713'}</Text>
          </View>
          <View style={styles.stepLineDone} />
          <View style={styles.stepNodeDone}>
            <Text style={styles.stepNodeDoneText}>{'\u2713'}</Text>
          </View>
          <View style={styles.stepLineCurrent} />
          <View style={styles.stepNodeCurrent}>
            <Text style={styles.stepNodeCurrentText}>3</Text>
          </View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={styles.stepLabel}>Arrived</Text>
          <Text style={styles.stepLabel}>Unload</Text>
          <Text style={styles.stepLabelCurrent}>Delivery</Text>
        </View>

        <Text style={styles.headerTitle}>Confirm Delivery</Text>
        <View style={styles.refPill}>
          <Text style={styles.refText}># {jobReference}</Text>
        </View>

        <Card title="Upload Delivery Photo" variant="default">
          <Pressable
            onPress={() => handlePickPhoto('delivery')}
            style={styles.photoBoxLarge}>
            <Text style={styles.photoLargeIcon}>
              {photos.delivery ? '\u2713' : '\uD83D\uDCF7'}
            </Text>
            <Text style={styles.photoLargeTitle}>Upload Delivery Photo</Text>
            <Text style={styles.photoLargeSubtitle}>
              Proof of cargo placement at site
            </Text>
          </Pressable>
        </Card>

        <Card title="Recipient Signature" variant="default">
          <View style={styles.signatureHeader}>
            <Text style={styles.signatureTitle}>RECIPIENT SIGNATURE</Text>
            <Pressable onPress={() => Alert.alert('Signature capture', 'Signature pad is not connected yet.')}>
              <Text style={[styles.clearText, {color: '#B42318'}]}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureHint}>Sign here...</Text>
          </View>
        </Card>

        <Card title="Recipient Name" variant="default">
          <TextInput
            style={styles.input}
            placeholder="Full name of the receiver"
            placeholderTextColor="#98A2B3"
            value={receiverName}
            onChangeText={setReceiverName}
          />
        </Card>

        <Card title="Delivery Notes (Optional)" variant="default">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add details about cargo condition, gate codes, or site access..."
            placeholderTextColor="#98A2B3"
            multiline
            numberOfLines={5}
            value={notes}
            onChangeText={setNotes}
          />
        </Card>

        <View style={styles.nextStepCard}>
          <Text style={styles.nextStepLabel}>After submit</Text>
          <Text style={styles.nextStepTitle}>Delivery review and payment release</Text>
          <Text style={styles.nextStepText}>
            Once the report is submitted, the haulier reviews the delivery and payment moves to the release stage.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={() => onSubmit({receiverName, notes}, Object.values(photos))}
          disabled={loading || !isComplete}
          style={[
            styles.primaryButton,
            (loading || !isComplete) && styles.disabledButton,
          ]}>
          <Text style={styles.primaryButtonText}>
            {'\u2713'} {loading ? 'Submitting...' : 'Complete Job & Submit Report'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
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
  brand: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepNodeDone: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1D2D44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNodeDoneText: {
    color: colors.card,
    fontSize: 24,
    fontWeight: '900',
  },
  stepLineDone: {
    flex: 1,
    height: 3,
    backgroundColor: '#1D2D44',
  },
  stepLineCurrent: {
    flex: 1,
    height: 3,
    backgroundColor: colors.accent,
  },
  stepNodeCurrent: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNodeCurrentText: {
    color: colors.card,
    fontSize: 24,
    fontWeight: '900',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  stepLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#364152',
    fontSize: 16,
    fontWeight: '700',
  },
  stepLabelCurrent: {
    flex: 1,
    textAlign: 'center',
    color: colors.navy,
    fontSize: 16,
    fontWeight: '800',
  },
  headerTitle: {
    color: colors.navy,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: spacing.md,
  },
  refPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8EBF0',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  refText: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  photoBoxLarge: {
    borderWidth: 3,
    borderColor: '#CAD0DA',
    borderStyle: 'dashed',
    borderRadius: 22,
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.card,
  },
  photoLargeIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#9ECBFB',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 58,
    marginBottom: spacing.md,
    color: '#0B5CAD',
    overflow: 'hidden',
    lineHeight: 120,
  },
  photoLargeTitle: {
    color: '#1F2937',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  photoLargeSubtitle: {
    color: '#4B5563',
    fontSize: 18,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  signatureTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '700',
  },
  signatureBox: {
    borderWidth: 1,
    borderColor: '#CAD1DB',
    borderRadius: 16,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FBFCFE',
  },
  signatureHint: {
    color: '#D1D5DB',
    fontSize: 26,
  },
  input: {
    backgroundColor: '#F8FAFD',
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1,
    borderColor: '#D6DCE5',
  },
  textArea: {
    minHeight: 160,
    textAlignVertical: 'top',
    paddingTop: spacing.lg,
  },
  nextStepCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: 4,
  },
  nextStepLabel: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nextStepTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  nextStepText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
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
    fontSize: 24,
    fontWeight: '900',
  },
});

export default DeliveryScreen;
