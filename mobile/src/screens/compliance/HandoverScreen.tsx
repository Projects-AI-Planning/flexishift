import React, {useEffect, useState, useRef, forwardRef, useImperativeHandle} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
  Modal,
  Image,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import {launchCamera, launchImageLibrary, Asset} from 'react-native-image-picker';
import {colors, radius, spacing} from '../../theme';
import ActiveJobMap from '../../components/map/ActiveJobMap';
import {driverApi} from '../../api/driverApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HandoverScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (checklist: any, photos: any[]) => Promise<void>;
  loading: boolean;
  error: string | null;
  vehicleUnit?: string;
  haulierSigned?: boolean;
  haulierSignedAt?: string | null;
}

type ChecklistKey = 'lightsSignals' | 'tirePressure' | 'fluidLevels' | 'bodyDamage';

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const checklistItems: ReadonlyArray<{
  key: ChecklistKey;
  label: string;
  description: string;
}> = [
  {key: 'lightsSignals', label: 'Lights & Signals', description: 'Headlamps, indicators, brake lights'},
  {key: 'tirePressure', label: 'Tire Pressure', description: 'All axles within operating PSI'},
  {key: 'fluidLevels', label: 'Fluid Levels', description: 'Oil, coolant, and wiper fluid'},
  {key: 'bodyDamage', label: 'Body Damage', description: 'No new dents, cracks, or loose panels'},
];

const photoSlots: {key: string; label: string}[] = [
  {key: 'front', label: 'Vehicle Front'},
  {key: 'side', label: 'Vehicle Side'},
  {key: 'rear', label: 'Vehicle Rear'},
  {key: 'cargo', label: 'Cargo Secure'},
];

// ── SignaturePad ──────────────────────────────────────────────────────────────

interface SignaturePadHandle {
  clear: () => void;
  getSegments: () => Segment[];
}

interface SignaturePadProps {
  onSign: (hasSig: boolean) => void;
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({onSign}, ref) => {
    const [segments, setSegments] = useState<Segment[]>([]);
    const segmentsRef = useRef<Segment[]>([]);
    const lastPoint = useRef<{x: number; y: number} | null>(null);
    const onSignRef = useRef(onSign);
    onSignRef.current = onSign;

    useImperativeHandle(ref, () => ({
      clear: () => {
        segmentsRef.current = [];
        setSegments([]);
        onSignRef.current(false);
      },
      getSegments: () => segmentsRef.current,
    }));

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          lastPoint.current = {
            x: e.nativeEvent.locationX,
            y: e.nativeEvent.locationY,
          };
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const {locationX, locationY} = e.nativeEvent;
          const prev = lastPoint.current;
          if (!prev) return;
          const seg: Segment = {
            x1: prev.x,
            y1: prev.y,
            x2: locationX,
            y2: locationY,
          };
          lastPoint.current = {x: locationX, y: locationY};
          segmentsRef.current = [...segmentsRef.current, seg];
          setSegments(s => [...s, seg]);
          onSignRef.current(true);
        },
        onPanResponderRelease: () => {
          lastPoint.current = null;
        },
      }),
    ).current;

    return (
      <View style={sigPadStyles.canvas} {...panResponder.panHandlers}>
        {segments.map((seg, i) => {
          const dx = seg.x2 - seg.x1;
          const dy = seg.y2 - seg.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1) {return null;}
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const cx = (seg.x1 + seg.x2) / 2;
          const cy = (seg.y1 + seg.y2) / 2;
          return (
            <View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: cx - len / 2,
                top: cy - 1.5,
                width: len,
                height: 3,
                backgroundColor: '#1C2E45',
                borderRadius: 1.5,
                transform: [{rotate: `${angle}deg`}],
              }}
            />
          );
        })}
      </View>
    );
  },
);
SignaturePad.displayName = 'SignaturePad';

const sigPadStyles = StyleSheet.create({
  canvas: {
    height: 170,
    backgroundColor: '#F8FAFB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
});

// ── Main Component ────────────────────────────────────────────────────────────

const HandoverScreen: React.FC<HandoverScreenProps> = ({
  jobId,
  jobReference: _jobReference,
  onSubmit,
  loading,
  error,
  vehicleUnit = 'VOL-882',
  haulierSigned: haulierSignedProp = false,
  haulierSignedAt,
}) => {
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    lightsSignals: false,
    tirePressure: false,
    fluidLevels: false,
    bodyDamage: false,
  });
  const [photos, setPhotos] = useState<Record<string, Asset>>({});
  const [job, setJob] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!jobId) {return;}
    driverApi.jobs.getDetails(jobId)
      .then(data => setJob(data as Record<string, unknown>))
      .catch(() => setJob(null));
  }, [jobId]);

  // Signature state
  const [driverSigned, setDriverSigned] = useState(false);
  const [haulierLocalSigned, setHaulierLocalSigned] = useState(haulierSignedProp);
  const [showDriverSigModal, setShowDriverSigModal] = useState(false);
  const [showHaulierSigModal, setShowHaulierSigModal] = useState(false);
  const [driverHasSig, setDriverHasSig] = useState(false);
  const [haulierHasSig, setHaulierHasSig] = useState(false);

  const driverSigRef = useRef<SignaturePadHandle>(null);
  const haulierSigRef = useRef<SignaturePadHandle>(null);

  const toggleItem = (key: ChecklistKey) => {
    setChecklist(prev => ({...prev, [key]: !prev[key]}));
  };

  const handlePickPhoto = (key: string, label: string) => {
    Alert.alert(label, 'Choose photo source', [
      {
        text: '📷  Camera',
        onPress: () => {
          launchCamera(
            {mediaType: 'photo', cameraType: 'back', quality: 0.8, saveToPhotos: false},
            response => {
              if (response.didCancel || response.errorCode) {return;}
              const asset = response.assets?.[0];
              if (asset?.uri) {
                setPhotos(prev => ({...prev, [key]: asset}));
              }
            },
          );
        },
      },
      {
        text: '🖼  Gallery',
        onPress: () => {
          launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
            if (response.didCancel || response.errorCode) {return;}
            const asset = response.assets?.[0];
            if (asset?.uri) {
              setPhotos(prev => ({...prev, [key]: asset}));
            }
          });
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleRaiseIssue = () => {
    Alert.alert('Raise Issue', 'Report a vehicle or load issue before departure.');
  };

  const haulierSigned = haulierSignedProp || haulierLocalSigned;
  const allChecked = Object.values(checklist).every(v => v);
  const allPhotos = Object.keys(photos).length >= 4;
  const isComplete = allChecked && allPhotos && driverSigned;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerCenter} />
          <Pressable onPress={handleRaiseIssue} style={styles.raiseBtn}>
            <Text style={styles.raiseIcon}>⚠</Text>
            <Text style={styles.raiseBtnText}>Raise{'\n'}Issue</Text>
          </Pressable>
          <View style={styles.unitPill}>
            <Text style={styles.unitText}>Unit: {vehicleUnit}</Text>
          </View>
        </View>

        {/* ── Progress Stepper ───────────────────────────────────────────── */}
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

        {/* ── Route Map ──────────────────────────────────────────────────── */}
        <ActiveJobMap
          pickupLocation={String(job?.pickupLocation ?? job?.pickupAddress ?? '')}
          dropLocation={String(job?.dropLocation ?? job?.dropAddress ?? '')}
          pickupCoords={
            job?.pickupLat != null && job?.pickupLng != null
              ? {latitude: Number(job.pickupLat), longitude: Number(job.pickupLng)}
              : null
          }
          dropCoords={
            job?.dropLat != null && job?.dropLng != null
              ? {latitude: Number(job.dropLat), longitude: Number(job.dropLng)}
              : null
          }
        />

        {/* ── Vehicle Checklist ──────────────────────────────────────────── */}
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
                style={[
                  styles.checkRow,
                  idx < checklistItems.length - 1 && styles.checkRowBorder,
                ]}>
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

        {/* ── Required Photo Evidence ────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Required Photo Evidence</Text>
        <View style={styles.photoGrid}>
          {photoSlots.map(slot => {
            const asset = photos[slot.key];
            const taken = !!asset;
            return (
              <Pressable
                key={slot.key}
                onPress={() => handlePickPhoto(slot.key, slot.label)}
                style={[styles.photoBox, taken && styles.photoBoxDone]}>
                {taken ? (
                  <>
                    <Image
                      source={{uri: asset.uri!}}
                      style={styles.photoThumb}
                      resizeMode="cover"
                    />
                    <View style={styles.photoTickBadge}>
                      <Text style={styles.photoTickText}>✓</Text>
                    </View>
                    <Text style={styles.photoLabelDone}>{slot.label}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.cameraIcon}>📷</Text>
                    <Text style={styles.photoLabel}>{slot.label}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ── Driver Signature ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sigHeader}>
            <Text style={styles.sigTitle}>DRIVER SIGNATURE</Text>
            {driverSigned && (
              <Pressable
                onPress={() => {
                  setDriverSigned(false);
                  setDriverHasSig(false);
                  driverSigRef.current?.clear();
                }}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => !driverSigned && setShowDriverSigModal(true)}
            style={[styles.sigBox, driverSigned && styles.sigBoxSigned]}>
            {driverSigned ? (
              <Text style={styles.sigDoneText}>~ Signed ~</Text>
            ) : (
              <>
                <Text style={styles.sigTapIcon}>✍</Text>
                <Text style={styles.sigHint}>Tap to Sign</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.sigConfirmText}>
            I CONFIRM THAT I HAVE INSPECTED THE VEHICLE AND LOAD.
          </Text>
        </View>

        {/* ── Haulier Signature ──────────────────────────────────────────── */}
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
            <Pressable
              onPress={() => setShowHaulierSigModal(true)}
              style={styles.sigBox}>
              <Text style={styles.sigTapIcon}>✍</Text>
              <Text style={styles.sigHint}>Tap to Sign</Text>
            </Pressable>
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

        {/* ── Confirm Button ─────────────────────────────────────────────── */}
        <Pressable
          onPress={() => {
            const sigSegments = driverSigRef.current?.getSegments() ?? [];
            const driverSignatureData = sigSegments.length > 0
              ? JSON.stringify(sigSegments)
              : 'driver_signed';
            onSubmit({...checklist, __driverSignature: driverSignatureData}, Object.values(photos));
          }}
          disabled={loading || !isComplete}
          style={[
            styles.confirmBtn,
            (loading || !isComplete) && styles.confirmBtnDisabled,
          ]}>
          <Text style={styles.confirmBtnText}>
            🔒{'  '}{loading ? 'Submitting...' : 'Confirm & Start Trip'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── Driver Signature Modal ────────────────────────────────────────── */}
      <Modal
        visible={showDriverSigModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDriverSigModal(false)}>
        <View style={styles.sigModalOverlay}>
          <View style={styles.sigModalCard}>
            <View style={styles.sigModalHeader}>
              <Text style={styles.sigModalTitle}>Driver Signature</Text>
              <Pressable onPress={() => driverSigRef.current?.clear()}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>
            <Text style={styles.sigModalHint}>
              Draw your signature in the box below
            </Text>
            <SignaturePad ref={driverSigRef} onSign={setDriverHasSig} />
            <View style={styles.sigModalActions}>
              <Pressable
                style={styles.sigModalCancel}
                onPress={() => {
                  driverSigRef.current?.clear();
                  setShowDriverSigModal(false);
                }}>
                <Text style={styles.sigModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sigModalConfirm,
                  !driverHasSig && styles.sigModalConfirmDisabled,
                ]}
                onPress={() => {
                  if (driverHasSig) {
                    setDriverSigned(true);
                    setShowDriverSigModal(false);
                  }
                }}
                disabled={!driverHasSig}>
                <Text style={styles.sigModalConfirmText}>Confirm Signature</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Haulier Signature Modal ───────────────────────────────────────── */}
      <Modal
        visible={showHaulierSigModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHaulierSigModal(false)}>
        <View style={styles.sigModalOverlay}>
          <View style={styles.sigModalCard}>
            <View style={styles.sigModalHeader}>
              <Text style={styles.sigModalTitle}>Haulier Signature</Text>
              <Pressable onPress={() => haulierSigRef.current?.clear()}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>
            <Text style={styles.sigModalHint}>
              Haulier: draw your signature in the box below
            </Text>
            <SignaturePad ref={haulierSigRef} onSign={setHaulierHasSig} />
            <View style={styles.sigModalActions}>
              <Pressable
                style={styles.sigModalCancel}
                onPress={() => {
                  haulierSigRef.current?.clear();
                  setShowHaulierSigModal(false);
                }}>
                <Text style={styles.sigModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sigModalConfirm,
                  !haulierHasSig && styles.sigModalConfirmDisabled,
                ]}
                onPress={() => {
                  if (haulierHasSig) {
                    setHaulierLocalSigned(true);
                    setShowHaulierSigModal(false);
                  }
                }}
                disabled={!haulierHasSig}>
                <Text style={styles.sigModalConfirmText}>Confirm Signature</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const NODE_SIZE = 44;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: 16, paddingBottom: 48},

  /* Header */
  header: {flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8},
  headerCenter: {flex: 1},
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
  raiseIcon: {fontSize: 13, color: '#E8732A'},
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
  unitText: {color: '#8796AA', fontWeight: '700', fontSize: 12},

  /* Stepper */
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepCol: {alignItems: 'center', gap: 6},
  stepNode: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNodeDone: {backgroundColor: '#2563EB'},
  stepNodeDoneText: {color: '#fff', fontSize: 18, fontWeight: '900'},
  stepNodeActive: {backgroundColor: '#2563EB'},
  stepNodeActiveText: {color: '#fff', fontSize: 18, fontWeight: '900'},
  stepNodeIdle: {backgroundColor: '#C9D1DC'},
  stepNodeIdleText: {color: '#6B7280', fontSize: 18, fontWeight: '700'},
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
  stepLabelDone: {fontSize: 13, color: '#4B5563', fontWeight: '500'},
  stepLabelActive: {fontSize: 13, color: colors.navy, fontWeight: '800'},
  stepLabelIdle: {fontSize: 13, color: '#9CA3AF', fontWeight: '500'},

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
  cardHeaderIcon: {fontSize: 18, color: colors.navy},
  cardHeaderTitle: {fontSize: 15, fontWeight: '700', color: colors.navy},

  /* Checklist */
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  checkRowBorder: {borderBottomWidth: 1, borderBottomColor: '#F0F2F6'},
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
  checkboxChecked: {backgroundColor: '#2563EB', borderColor: '#2563EB'},
  checkboxTick: {color: '#fff', fontSize: 13, fontWeight: '900'},
  checkCopy: {flex: 1},
  checkTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  checkSubtitle: {fontSize: 13, color: '#6B7280', marginTop: 2},

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
    overflow: 'hidden',
  },
  photoBoxDone: {
    borderStyle: 'solid',
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  photoThumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  photoTickBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  photoTickText: {color: '#fff', fontSize: 14, fontWeight: '900'},
  cameraIcon: {fontSize: 32},
  photoLabel: {fontSize: 13, color: '#6B7280', fontWeight: '500'},
  photoLabelDone: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    backgroundColor: 'rgba(37,99,235,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 1,
  },

  /* Signature card */
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
  clearText: {fontSize: 14, fontWeight: '700', color: '#2563EB'},
  sigBox: {
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F0F4FA',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  sigBoxSigned: {backgroundColor: '#EFF6FF', borderColor: '#93C5FD'},
  sigTapIcon: {fontSize: 24},
  sigHint: {fontSize: 15, color: '#C4CAD4', fontStyle: 'italic'},
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
  signedBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  signedBadgeText: {color: '#1066B1', fontSize: 12, fontWeight: '800'},

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
    backgroundColor: '#1066B1',
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnDisabled: {opacity: 0.45},
  confirmBtnText: {color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2},

  /* Signature Modal */
  sigModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sigModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  sigModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sigModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.navy,
  },
  sigModalHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },
  sigModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  sigModalCancel: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sigModalCancelText: {fontSize: 15, fontWeight: '700', color: '#374151'},
  sigModalConfirm: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#1066B1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sigModalConfirmDisabled: {opacity: 0.4},
  sigModalConfirmText: {fontSize: 15, fontWeight: '900', color: '#fff'},
});

export default HandoverScreen;
