import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, shadow, spacing} from '../../theme';

interface HandoverScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (checklist: any, photos: any[]) => Promise<void>;
  onBack?: () => void;
  loading: boolean;
  error: string | null;
}

const checklistItems = [
  {
    key: 'vehicleClean',
    label: 'Lights & Signals',
    description: 'Headlamps, indicators, brake lights',
  },
  {
    key: 'noVisibleDamage',
    label: 'Tire Pressure',
    description: 'All axles within operating PSI',
  },
  {
    key: 'safetyGearReady',
    label: 'Fluid Levels',
    description: 'Oil, coolant, and wiper fluid',
  },
  {
    key: 'documentsReceived',
    label: 'Body Damage',
    description: 'No new dents, cracks, or loose panels',
  },
] as const;

const photoSides = ['Front', 'Rear', 'Left', 'Right'] as const;

const HandoverScreen: React.FC<HandoverScreenProps> = ({
  jobId,
  jobReference,
  onSubmit,
  onBack,
  loading,
  error,
}) => {
  const [checklist, setChecklist] = useState({
    vehicleClean: false,
    noVisibleDamage: false,
    safetyGearReady: false,
    documentsReceived: false,
  });
  const [photos, setPhotos] = useState<Record<string, any>>({});

  const handlePickPhoto = (side: string) => {
    Alert.alert('Capture Photo', `Take a photo of the ${side.toLowerCase()} of the vehicle`, [
      {
        text: 'Capture',
        onPress: () => {
          setPhotos(prev => ({...prev, [side]: {uri: 'mock-uri', side}}));
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const toggleItem = (key: keyof typeof checklist) => {
    setChecklist(prev => ({...prev, [key]: !prev[key]}));
  };

  const isComplete =
    Object.values(checklist).every(value => value === true) &&
    Object.keys(photos).length >= 4;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>{'\u2190'} Load Code</Text>
          </Pressable>
          <View style={styles.topTitleWrap}>
            <Text style={styles.stepTitle}>Step 2: Handover Check</Text>
            <Text style={styles.stepSubtitle}>Verify the truck before leaving pickup.</Text>
          </View>
          <View style={styles.unitPill}>
            <Text style={styles.unitText}>Unit: VOL-882</Text>
          </View>
        </View>

        <View style={styles.stepper}>
          <View style={styles.stepNodeActive}>
            <Text style={styles.stepNodeActiveText}>{'\u2713'}</Text>
          </View>
          <View style={styles.stepLineActive} />
          <View style={styles.stepNodeCurrent}>
            <Text style={styles.stepNodeCurrentText}>2</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepNodeIdle}>
            <Text style={styles.stepNodeIdleText}>3</Text>
          </View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={styles.stepLabel}>Arrival</Text>
          <Text style={styles.stepLabelCurrent}>Handover</Text>
          <Text style={styles.stepLabel}>Departure</Text>
        </View>

        <Card title="Vehicle Checklist" variant="default">
          {checklistItems.map(item => {
            const checked = checklist[item.key];
            return (
              <Pressable
                key={item.key}
                onPress={() => toggleItem(item.key)}
                style={styles.checkCard}>
                <View style={styles.checkCopy}>
                  <Text style={styles.checkTitle}>{item.label}</Text>
                  <Text style={styles.checkSubtitle}>{item.description}</Text>
                </View>
                <Switch
                  value={checked}
                  onValueChange={() => toggleItem(item.key)}
                  trackColor={{false: '#C9D1DD', true: colors.accent}}
                  thumbColor={colors.card}
                />
              </Pressable>
            );
          })}
        </Card>

        <Text style={styles.sectionHeading}>Required Photo Evidence</Text>
        <View style={styles.photoGrid}>
          {photoSides.map(side => (
            <Pressable
              key={side}
              onPress={() => handlePickPhoto(side)}
              style={[styles.photoBox, photos[side] ? styles.photoBoxActive : null]}>
              <Text style={styles.photoIcon}>
                {photos[side] ? '\u2713' : '\uD83D\uDCF7'}
              </Text>
              <Text style={styles.photoLabel}>{side} Vehicle</Text>
            </Pressable>
          ))}
        </View>

        <Card title="Driver Signature" variant="default">
          <View style={styles.signatureHeader}>
            <Text style={styles.signatureTitle}>DRIVER SIGNATURE</Text>
            <Pressable onPress={() => Alert.alert('Signature capture', 'Signature pad is not connected yet.')}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureHint}>Sign Here</Text>
          </View>
          <Text style={styles.confirmText}>
            I CONFIRM THAT I HAVE INSPECTED THE VEHICLE AND LOAD.
          </Text>
        </Card>

        <Card title="Haulier Signature" variant="default">
          <View style={styles.signatureHeader}>
            <Text style={styles.signatureTitle}>HAULIER SIGNATURE</Text>
            <Pressable onPress={() => Alert.alert('Signature capture', 'Signature pad is not connected yet.')}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureHint}>Awaiting Signature...</Text>
          </View>
          <Text style={styles.confirmText}>
            DISPATCH OFFICER CONFIRMATION OF VEHICLE RELEASE.
          </Text>
        </Card>

        <View style={styles.nextStepCard}>
          <Text style={styles.nextStepLabel}>Next step</Text>
          <Text style={styles.nextStepTitle}>Start Trip</Text>
          <Text style={styles.nextStepText}>
            After you submit this checklist, the app will open live tracking automatically.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={() => onSubmit(checklist, Object.values(photos))}
          disabled={loading || !isComplete}
          style={[
            styles.primaryButton,
            (loading || !isComplete) && styles.disabledButton,
          ]}>
          <Text style={styles.primaryButtonText}>
            {'\uD83D\uDD12'} {loading ? 'Submitting...' : 'Confirm & Start Trip'}
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
  topTitleWrap: {
    flex: 1,
  },
  stepSubtitle: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -0.6,
  },
  unitPill: {
    backgroundColor: '#E6EBF2',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  unitText: {
    color: '#8796AA',
    fontWeight: '800',
    fontSize: 16,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepNodeActive: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNodeActiveText: {
    color: colors.card,
    fontSize: 28,
    fontWeight: '900',
  },
  stepLineActive: {
    flex: 1,
    height: 3,
    backgroundColor: colors.accent,
  },
  stepNodeCurrent: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.navy,
    borderWidth: 6,
    borderColor: '#FFA84D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNodeCurrentText: {
    color: colors.card,
    fontSize: 28,
    fontWeight: '900',
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#D8DEE7',
  },
  stepNodeIdle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D9DEE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNodeIdleText: {
    color: '#555B66',
    fontSize: 28,
    fontWeight: '900',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingHorizontal: 4,
  },
  stepLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#4A5563',
    fontSize: 18,
    fontWeight: '500',
  },
  stepLabelCurrent: {
    flex: 1,
    textAlign: 'center',
    color: colors.navy,
    fontSize: 18,
    fontWeight: '800',
  },
  checkCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E7EF',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  checkTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  checkSubtitle: {
    color: '#5B6671',
    fontSize: 18,
    marginTop: 4,
  },
  sectionHeading: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '500',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  photoBox: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#D3D7DE',
    borderStyle: 'dashed',
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBoxActive: {
    borderStyle: 'solid',
    borderColor: colors.accent,
    backgroundColor: '#F3F9FF',
  },
  photoIcon: {
    fontSize: 48,
    color: colors.inkSoft,
    marginBottom: spacing.md,
  },
  photoLabel: {
    fontSize: 18,
    color: '#4A5563',
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
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  signatureBox: {
    borderWidth: 1,
    borderColor: '#CAD1DB',
    borderRadius: 16,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FBFCFE',
  },
  signatureHint: {
    color: '#D1D5DB',
    fontSize: 24,
  },
  confirmText: {
    color: '#5B6671',
    fontSize: 13,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  nextStepCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: 4,
  },
  nextStepLabel: {
    color: '#2563EB',
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

export default HandoverScreen;
