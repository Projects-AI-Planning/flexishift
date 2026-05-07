import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface HandoverScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (checklist: any, photos: any[]) => Promise<void>;
  onBack?: () => void;
  loading: boolean;
  error: string | null;
  vehicleUnit?: string;
  haulierSigned?: boolean;
  haulierSignedAt?: string | null;
}

const checklistItems = [
  {
    key: 'lightsSignals',
    label: 'Lights & Signals',
    description: 'Headlamps, indicators, brake lights',
  },
  {
    key: 'tirePressure',
    label: 'Tire Pressure',
    description: 'All axles within operating PSI',
  },
  {
    key: 'fluidLevels',
    label: 'Fluid Levels',
    description: 'Oil, coolant, and wiper fluid',
  },
  {
    key: 'bodyDamage',
    label: 'Body Damage',
    description: 'No new dents, cracks, or loose panels',
  },
] as const;

type ChecklistKey = 'lightsSignals' | 'tirePressure' | 'fluidLevels' | 'bodyDamage';

const photoSlots: {key: string; label: string}[] = [
  {key: 'front', label: 'Vehicle Front'},
  {key: 'side', label: 'Vehicle Side'},
  {key: 'rear', label: 'Vehicle Rear'},
  {key: 'cargo', label: 'Cargo Secure'},
];

const HandoverScreen: React.FC<HandoverScreenProps> = ({
  jobId: _jobId,
  jobReference: _jobReference,
  onSubmit,
  onBack,
  loading,
  error,
  vehicleUnit = 'VOL-882',
  haulierSigned = false,
  haulierSignedAt,
}) => {
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    lightsSignals: false,
    tirePressure: false,
    fluidLevels: false,
    bodyDamage: false,
  });
  const [photos, setPhotos] = useState<Record<string, any>>({});
  const [driverSigned, setDriverSigned] = useState(false);

  const toggleItem = (key: ChecklistKey) => {
    setChecklist(prev => ({...prev, [key]: !prev[key]}));
  };

  const handlePickPhoto = (key: string, label: string) => {
    Alert.alert('Capture Photo', `Take a photo: ${label}`, [
      {
        text: 'Capture',
        onPress: () => setPhotos(prev => ({...prev, [key]: {uri: 'mock-uri', key}})),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleRaiseIssue = () => {
    Alert.alert('Raise Issue', 'Report a vehicle or load issue before departure.');
  };

  const handleDriverSign = () => {
    setDriverSigned(true);
  };

  const allChecked = Object.values(checklist).every(v => v === true);
  const allPhotos = Object.keys(photos).length >= 4;
  const isComplete = allChecked && allPhotos && driverSigned;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Step 2: Handover</Text>
            <Text style={styles.headerTitle}>Check</Text>
          </View>

          <Pressable onPress={handleRaiseIssue} style={styles.raiseBtn}>
            <Text style={styles.raiseIcon}>⚠</Text>
            <Text style={styles.raiseBtnText}>Raise{'\n'}Issue</Text>
          </Pressable>

          <View style={styles.unitPill}>
            <Text style={styles.unitText}>Unit: {vehicleUnit}</Text>
          </View>
        </View>

        {/* ── Progress Stepper ─────────────────────────────────────────────── */}
        <View style={styles.stepperRow}>
          <View style={styles.stepCol}>
            <View style={[styles.stepNode, styles.stepNodeDone]}>
              <Text style={styles.stepNodeDoneText}>✓</Text>
            </View>
            <Text style={styles.stepLabelDone}>Arrival</Text>
          </View>

          <View style={styles.stepLineDone} />

          <View style={styles.stepCol}>
            <View style={[styles.stepNode, styles.stepNodeActive]}>
              <Text style={styles.stepNodeActiveText}>2</Text>
            </View>
            <Text style={styles.stepLabelActive}>Handover</Text>
          </View>

          <View style={styles.stepLineIdle} />

          <View style={styles.stepCol}>
            <View style={[styles.stepNode, styles.stepNodeIdle]}>
              <Text style={styles.stepNodeIdleText}>3</Text>
            </View>
            <Text style={styles.stepLabelIdle}>Departure</Text>
          </View>
        </View>

        {/* ── Vehicle Checklist ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>☑</Text>
            <Text style={styles.cardHeaderTitle}>Vehicle Checklist</Text>
          </View>

          {checklistItems.map((item, idx) => {
            const checked = checklist[item.key];
            return (
              <Pressable
                key={item.key}
                onPress={() => toggleItem(item.key)}
                style={[styles.checkRow, idx < checklistItems.length - 1 && styles.checkRowBorder]}>
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <View style={styles.checkCopy}>
                  <Text style={styles.checkTitle}>{item.label}</Text>
                  <Text style={styles.checkSubtitle}>{item.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Required Photo Evidence ───────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Required Photo Evidence</Text>
        <View style={styles.photoGrid}>
          {photoSlots.map(slot => {
            const taken = !!photos[slot.key];
            const isCargo = slot.key === 'cargo';
            return (
              <Pressable
                key={slot.key}
                onPress={() => handlePickPhoto(slot.key, slot.label)}
                style={[styles.photoBox, taken && styles.photoBoxDone]}>
                {taken ? (
                  isCargo ? (
                    <View style={styles.cargoGraphic}>
                      <View style={styles.cargoBox}>
                        <Text style={styles.cargoCheck}>✓</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.photoDoneIcon}>
                      <Text style={styles.photoDoneTick}>✓</Text>
                    </View>
                  )
                ) : (
                  <Text style={styles.cameraIcon}>📷</Text>
                )}
                <Text style={[styles.photoLabel, taken && styles.photoLabelDone]}>
                  {slot.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Driver Signature ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sigHeader}>
            <Text style={styles.sigTitle}>DRIVER SIGNATURE</Text>
            <Pressable onPress={() => setDriverSigned(false)}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={handleDriverSign}
            style={[styles.sigBox, driverSigned && styles.sigBoxSigned]}>
            {driverSigned ? (
              <Text style={styles.sigDoneText}>~ Signature ~</Text>
            ) : (
              <Text style={styles.sigHint}>Sign Here</Text>
            )}
          </Pressable>
          <Text style={styles.sigConfirmText}>
            I CONFIRM THAT I HAVE INSPECTED THE VEHICLE AND LOAD.
          </Text>
        </View>

        {/* ── Haulier Signature ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sigHeader}>
            <Text style={styles.sigTitle}>HAULIER SIGNATURE</Text>
            {haulierSigned && (
              <View style={styles.signedBadge}>
                <Text style={styles.signedBadgeText}>✓ Signed</Text>
              </View>
            )}
          </View>
          {haulierSigned ? (
            <View style={[styles.sigBox, styles.sigBoxSigned]}>
              <Text style={styles.sigDoneText}>~ Authorised ~</Text>
            </View>
          ) : (
            <View style={[styles.sigBox, styles.sigBoxPending]}>
              <Text style={styles.pendingIcon}>⏳</Text>
              <Text style={styles.sigHint}>Awaiting Signature...</Text>
              <Text style={styles.pendingSubtext}>Haulier signs from their dashboard</Text>
            </View>
          )}
          {haulierSigned && haulierSignedAt ? (
            <Text style={styles.sigConfirmText}>
              SIGNED AT {new Date(haulierSignedAt).toLocaleString()}
            </Text>
          ) : (
            <Text style={styles.sigConfirmText}>
              DISPATCH OFFICER CONFIRMATION OF VEHICLE RELEASE.
            </Text>
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* ── Confirm Button ────────────────────────────────────────────────── */}
        <Pressable
          onPress={() => onSubmit(checklist, Object.values(photos))}
          disabled={loading || !isComplete}
          style={[styles.confirmBtn, (loading || !isComplete) && styles.confirmBtnDisabled]}>
          <Text style={styles.confirmBtnText}>
            🔒  {loading ? 'Submitting...' : 'Confirm & Start Trip'}
          </Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
};

const NODE_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  backArrow: {
    fontSize: 22,
    color: colors.navy,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
    lineHeight: 22,
  },
  raiseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8732A',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  raiseIcon: {
    fontSize: 13,
    color: '#E8732A',
  },
  raiseBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E8732A',
    textAlign: 'center',
    lineHeight: 14,
  },
  unitPill: {
    backgroundColor: '#E6EBF2',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unitText: {
    color: '#8796AA',
    fontWeight: '700',
    fontSize: 12,
  },

  /* Stepper */
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepCol: {
    alignItems: 'center',
    gap: 6,
  },
  stepNode: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNodeDone: {
    backgroundColor: '#2563EB',
  },
  stepNodeDoneText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  stepNodeActive: {
    backgroundColor: '#2563EB',
  },
  stepNodeActiveText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  stepNodeIdle: {
    backgroundColor: '#C9D1DC',
  },
  stepNodeIdleText: {
    color: '#6B7280',
    fontSize: 18,
    fontWeight: '700',
  },
  stepLineDone: {
    flex: 1,
    height: 3,
    backgroundColor: '#2563EB',
    marginTop: NODE_SIZE / 2 - 1.5,
  },
  stepLineIdle: {
    flex: 1,
    height: 3,
    backgroundColor: '#C9D1DC',
    marginTop: NODE_SIZE / 2 - 1.5,
  },
  stepLabelDone: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  stepLabelActive: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: '800',
  },
  stepLabelIdle: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  /* Card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F6',
  },
  cardHeaderIcon: {
    fontSize: 18,
    color: colors.navy,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },

  /* Checklist rows */
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  checkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F6',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#C9D1DC',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  checkCopy: {
    flex: 1,
  },
  checkTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  checkSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  /* Photo grid */
  sectionHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  photoBox: {
    width: '47.5%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#C9D1DC',
    borderStyle: 'dashed',
    backgroundColor: '#FAFBFC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoBoxDone: {
    borderStyle: 'solid',
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  cameraIcon: {
    fontSize: 32,
    color: '#9CA3AF',
  },
  photoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  photoLabelDone: {
    color: '#2563EB',
    fontWeight: '700',
  },
  photoDoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoDoneTick: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  cargoGraphic: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cargoBox: {
    width: 48,
    height: 36,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cargoCheck: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '900',
  },

  /* Signature */
  sigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sigTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  sigBox: {
    height: 130,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F0F4FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sigBoxSigned: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  sigHint: {
    fontSize: 16,
    color: '#C4CAD4',
    fontStyle: 'italic',
  },
  sigDoneText: {
    fontSize: 22,
    color: '#2563EB',
    fontStyle: 'italic',
    fontWeight: '700',
  },
  sigConfirmText: {
    marginTop: 8,
    fontSize: 10,
    color: '#6B7280',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sigBoxPending: {
    gap: 4,
  },
  pendingIcon: {
    fontSize: 22,
  },
  pendingSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  signedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  signedBadgeText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Error */
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: spacing.md,
  },

  /* Confirm button */
  confirmBtn: {
    backgroundColor: colors.navy,
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

export default HandoverScreen;
