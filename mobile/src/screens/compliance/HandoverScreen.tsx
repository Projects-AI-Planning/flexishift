import React, {useEffect, useRef, useState, forwardRef, useImperativeHandle} from 'react';
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
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {launchCamera, launchImageLibrary, Asset} from 'react-native-image-picker';
import {colors, radius, spacing} from '../../theme';
import ActiveJobMap from '../../components/map/ActiveJobMap';
import {driverApi} from '../../api/driverApi';
import {isMeaningfulSignature, segmentsToSmoothPath} from '../../utils/signature';
import Svg, {Path} from 'react-native-svg';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HandoverScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (checklist: any, photos: any[]) => Promise<void>;
  onProceed: () => void;
  onVerifyLoadCode: (code: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  vehicleUnit?: string;
  haulierSigned?: boolean;
  haulierSignedAt?: string | null;
  /** Driver's saved e-signature (JSON segments string) — pre-fills the signing box */
  savedSignature?: string | null;
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
          if (isMeaningfulSignature(segmentsRef.current)) {
            onSignRef.current(true);
          }
        },
        onPanResponderRelease: () => {
          lastPoint.current = null;
        },
      }),
    ).current;

    return (
      <View style={sigPadStyles.canvas} {...panResponder.panHandlers}>
        {/* One SVG path instead of hundreds of rotated <View>s — keeps drawing smooth. */}
        <Svg width="100%" height="100%" pointerEvents="none" style={{position: 'absolute', top: 0, left: 0}}>
          {segments.length > 0 && (
            <Path
              d={segmentsToSmoothPath(segments)}
              stroke="#1C2E45"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </Svg>
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
  onProceed,
  onVerifyLoadCode,
  loading,
  error,
  vehicleUnit = 'VOL-882',
  haulierSigned: haulierSignedProp = false,
  haulierSignedAt,
  savedSignature,
}) => {
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    lightsSignals: false,
    tirePressure: false,
    fluidLevels: false,
    bodyDamage: false,
  });
  const [photos, setPhotos] = useState<Asset[]>([]);
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [driverSigned, setDriverSigned] = useState(false);
  const [showDriverSigModal, setShowDriverSigModal] = useState(false);
  const [driverHasSig, setDriverHasSig] = useState(false);
  const [sigBoxWidth, setSigBoxWidth] = useState(0);


  const driverSigRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (!jobId) {return;}
    driverApi.jobs.getDetails(jobId)
      .then(data => setJob(data as Record<string, unknown>))
      .catch(() => setJob(null));
  }, [jobId]);

  // If the driver has already submitted this handover (e.g. re-entering from "My Jobs"
  // → Start Trip), show the waiting/proceed state AND pre-fill the previously submitted
  // data (checklist ticks, photos, signature) so they can see what they filled.
  const [prefilledSig, setPrefilledSig] = useState<string | null>(null);
  useEffect(() => {
    if (!jobId) {return;}
    driverApi.compliance.getHandoverStatus(jobId)
      .then((s: any) => {
        if (s?.driverSigned) {
          setDriverSigned(true);
          setSubmitted(true);
          // Checklist ticks
          const cd = s.checklistData;
          if (cd && typeof cd === 'object') {
            setChecklist({
              lightsSignals: !!cd.lightsSignals,
              tirePressure:  !!cd.tirePressure,
              fluidLevels:   !!cd.fluidLevels,
              bodyDamage:    !!cd.bodyDamage,
            });
          }
          // Photos (server URLs)
          const urls: string[] = Array.isArray(s.conditionPhotos) ? s.conditionPhotos : [];
          if (urls.length > 0) {
            setPhotos(urls.map(u => ({uri: u} as Asset)));
          }
          // Submitted signature
          if (s.driverSignatureUrl) {
            setPrefilledSig(String(s.driverSignatureUrl));
          }
        }
      })
      .catch(() => undefined);
  }, [jobId]);

  // Reset submitted state if an error occurs so the driver can retry
  useEffect(() => {
    if (error) {setSubmitted(false);}
  }, [error]);

  const toggleItem = (key: ChecklistKey) => {
    setChecklist(prev => ({...prev, [key]: !prev[key]}));
  };

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Choose photo source', [
      {
        text: '📷  Camera',
        onPress: () => {
          launchCamera(
            {mediaType: 'photo', cameraType: 'back', quality: 0.8, saveToPhotos: false},
            response => {
              if (response.didCancel || response.errorCode) {return;}
              const asset = response.assets?.[0];
              if (asset?.uri) {setPhotos(prev => [...prev, asset]);}
            },
          );
        },
      },
      {
        text: '🖼  Gallery',
        onPress: () => {
          launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 0}, response => {
            if (response.didCancel || response.errorCode) {return;}
            const assets = (response.assets ?? []).filter(a => a?.uri);
            if (assets.length) {setPhotos(prev => [...prev, ...assets]);}
          });
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const isComplete = driverSigned;

  const pickup   = String(job?.pickupLocation  ?? job?.pickupAddress  ?? '—');
  const drop     = String(job?.dropLocation    ?? job?.dropAddress    ?? '—');
  const jobDate  = String(job?.jobDate         ?? '—');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerCenter} />
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

        {/* ── Photo Evidence ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F2F6'}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Text style={{fontSize: 18, color: '#1C2E45'}}>📷</Text>
              <Text style={{fontSize: 15, fontWeight: '700', color: '#1C2E45'}}>
                Photo Evidence{photos.length > 0 ? ` (${photos.length})` : ''}
              </Text>
            </View>
            {photos.length > 0 && (
              <Pressable
                onPress={handleAddPhoto}
                style={{backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#BFDBFE'}}>
                <Text style={{color: '#1066B1', fontSize: 12, fontWeight: '800'}}>+ Add</Text>
              </Pressable>
            )}
          </View>

          {photos.length === 0 ? (
            <Pressable onPress={handleAddPhoto} style={styles.photoPlaceholder}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.photoPlaceholderTitle}>Add Photos</Text>
              <Text style={styles.photoPlaceholderSub}>Optional — tap to add handover photos</Text>
            </Pressable>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map((asset, index) => (
                <View key={`${asset.uri}-${index}`} style={styles.photoBox}>
                  <Image source={{uri: asset.uri!}} style={styles.photoThumb} resizeMode="cover" />
                  <Pressable
                    onPress={() => handleRemovePhoto(index)}
                    style={styles.photoRemoveBtn}
                    hitSlop={6}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
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

          {/* ── Case A: Saved signature available & not yet signed ── */}
          {!driverSigned && savedSignature ? (() => {
            let segs: {x1:number;y1:number;x2:number;y2:number}[] = [];
            let storedW = 300;
            let storedH = 160;
            try {
              const p = JSON.parse(savedSignature);
              segs    = p.segments ?? [];
              storedW = p.width    ?? 300;
              storedH = p.height   ?? 160;
            } catch { /* ignore */ }
            const hasSegs = segs.length > 0;

            return (
              <>
                {/* Saved-sig preview box */}
                <View
                  onLayout={e => setSigBoxWidth(e.nativeEvent.layout.width)}
                  style={{
                    height: 110, backgroundColor: '#EFF6FF',
                    borderRadius: 12, borderWidth: 1.5, borderColor: '#93C5FD',
                    overflow: 'hidden', marginBottom: 10,
                  }}>
                  {hasSegs && sigBoxWidth > 0 && (() => {
                    const scaleX = sigBoxWidth / storedW;
                    const scaleY = 110 / storedH;
                    const scaled = segs.map(s => ({
                      x1: s.x1 * scaleX, y1: s.y1 * scaleY,
                      x2: s.x2 * scaleX, y2: s.y2 * scaleY,
                    }));
                    return (
                      <Svg width="100%" height="100%" pointerEvents="none" style={{position: 'absolute', top: 0, left: 0}}>
                        <Path d={segmentsToSmoothPath(scaled)} stroke="#1C2E45" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </Svg>
                    );
                  })()}
                  {(!hasSegs || sigBoxWidth === 0) && (
                    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                      <Text style={{fontSize: 24, marginBottom: 4}}>✍️</Text>
                      <Text style={{fontSize: 12, color: '#6B7280'}}>Saved Signature</Text>
                    </View>
                  )}
                  {/* Saved badge */}
                  <View style={{
                    position: 'absolute', top: 8, right: 8,
                    backgroundColor: '#DBEAFE', borderRadius: 6,
                    paddingHorizontal: 8, paddingVertical: 3,
                  }}>
                    <Text style={{fontSize: 10, fontWeight: '800', color: '#1E40AF', letterSpacing: 0.5}}>
                      SAVED
                    </Text>
                  </View>
                </View>

                {/* Use saved profile e-signature (drawing disabled) */}
                <Pressable
                  style={{
                    backgroundColor: '#1066B1', borderRadius: 10,
                    paddingVertical: 13, alignItems: 'center',
                  }}
                  onPress={() => {
                    setDriverSigned(true);
                    setDriverHasSig(true);
                  }}>
                  <Text style={{fontSize: 14, fontWeight: '800', color: '#fff'}}>
                    ✓  Use This Signature
                  </Text>
                </Pressable>
              </>
            );
          })() : !driverSigned ? (
            /* ── Case B: No saved e-signature — must add one in profile ── */
            <View style={[styles.sigBox, {borderColor: '#FCD34D', backgroundColor: '#FFFBEB'}]}>
              <Text style={styles.sigTapIcon}>✍</Text>
              <Text style={[styles.sigHint, {color: '#B45309', textAlign: 'center', paddingHorizontal: 16}]}>
                Add your e-signature in your profile to sign the handover.
              </Text>
            </View>
          ) : (
            /* ── Case C: Signed — show the submitted signature ── */
            (() => {
              // Try to render the previously submitted signature (segments JSON or image)
              let segs: {x1:number;y1:number;x2:number;y2:number}[] = [];
              let storedW = 300; let storedH = 160;
              const src = prefilledSig ?? '';
              const isImage = src.startsWith('data:image') || src.startsWith('http');
              if (!isImage && src) {
                try {
                  const p = JSON.parse(src);
                  segs    = p.segments ?? [];
                  storedW = p.width    ?? 300;
                  storedH = p.height   ?? 160;
                } catch { /* ignore */ }
              }
              if (isImage) {
                return (
                  <View style={[styles.sigBox, styles.sigBoxSigned, {height: 110, overflow: 'hidden'}]}>
                    <Image source={{uri: src}} style={{width: '100%', height: '100%'}} resizeMode="contain" />
                  </View>
                );
              }
              if (segs.length > 0) {
                return (
                  <View
                    onLayout={e => setSigBoxWidth(e.nativeEvent.layout.width)}
                    style={[styles.sigBox, styles.sigBoxSigned, {height: 110, overflow: 'hidden'}]}>
                    {sigBoxWidth > 0 && (() => {
                      const sx = sigBoxWidth / storedW; const sy = 110 / storedH;
                      const scaled = segs.map(s => ({
                        x1: s.x1 * sx, y1: s.y1 * sy, x2: s.x2 * sx, y2: s.y2 * sy,
                      }));
                      return (
                        <Svg width="100%" height="100%" pointerEvents="none" style={{position: 'absolute', top: 0, left: 0}}>
                          <Path d={segmentsToSmoothPath(scaled)} stroke="#1C2E45" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </Svg>
                      );
                    })()}
                  </View>
                );
              }
              return (
                <View style={[styles.sigBox, styles.sigBoxSigned]}>
                  <Text style={styles.sigDoneText}>~ Signed ~</Text>
                </View>
              );
            })()
          )}

          <Text style={styles.sigConfirmText}>
            I CONFIRM THAT I HAVE INSPECTED THE VEHICLE AND LOAD.
          </Text>
        </View>


        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* ── Submit / Waiting / Proceed ─────────────────────────────────── */}
        {!submitted ? (
          <Pressable
            onPress={() => {
              setSubmitted(true);
              const sigSegments = driverSigRef.current?.getSegments() ?? [];
              const driverSignatureData = isMeaningfulSignature(sigSegments)
                ? JSON.stringify(sigSegments)
                : (savedSignature ?? 'driver_signed');
              onSubmit({...checklist, __driverSignature: driverSignatureData}, photos);
            }}
            disabled={loading || !isComplete}
            style={[
              styles.confirmBtn,
              (loading || !isComplete) && styles.confirmBtnDisabled,
            ]}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>
                🔒{'  '}Submit Handover
              </Text>
            )}
          </Pressable>
        ) : loading ? (
          <View style={styles.waitingCard}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.waitingTitle}>Submitting…</Text>
          </View>
        ) : haulierSignedProp ? (
          <View style={styles.proceedCard}>
            <View style={styles.proceedIconCircle}>
              <Text style={styles.proceedIconText}>✓</Text>
            </View>
            <Text style={styles.proceedTitle}>Haulier Has Confirmed</Text>
            <Text style={styles.proceedSub}>
              The haulier signed at {haulierSignedAt ? new Date(haulierSignedAt).toLocaleString() : '—'}.
              {'\n'}You can now start your trip.
            </Text>
            <Pressable onPress={onProceed} style={styles.proceedBtn}>
              <Text style={styles.proceedBtnText}>Start Trip →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.waitingCard}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.waitingTitle}>Waiting for Haulier Signature</Text>
            <Text style={styles.waitingSub}>
              Your handover has been submitted.{'\n'}
              The haulier will sign from their dashboard.{'\n'}
              This screen updates automatically.
            </Text>
            <View style={styles.waitingInfoRow}>
              <Text style={styles.waitingInfoDot}>●</Text>
              <Text style={styles.waitingInfoText}>
                Route: {pickup} → {drop}
              </Text>
            </View>
            <View style={styles.waitingInfoRow}>
              <Text style={styles.waitingInfoDot}>●</Text>
              <Text style={styles.waitingInfoText}>Date: {jobDate}</Text>
            </View>
          </View>
        )}

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

            {/* Use saved sig shortcut inside modal */}
            {savedSignature && (
              <Pressable
                style={{
                  backgroundColor: '#EFF6FF', borderRadius: 10,
                  borderWidth: 1.5, borderColor: '#93C5FD',
                  paddingVertical: 11, paddingHorizontal: 14,
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'center', gap: 8, marginBottom: 12,
                }}
                onPress={() => {
                  setDriverSigned(true);
                  setDriverHasSig(true);
                  setShowDriverSigModal(false);
                }}>
                <Text style={{fontSize: 16}}>✍️</Text>
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 13, fontWeight: '800', color: '#1E40AF'}}>
                    Use Saved Signature
                  </Text>
                  <Text style={{fontSize: 11, color: '#6B7280', marginTop: 1}}>
                    Tap to apply your profile signature
                  </Text>
                </View>
                <Text style={{fontSize: 18, color: '#1066B1', fontWeight: '900'}}>›</Text>
              </Pressable>
            )}

            <Text style={styles.sigModalHint}>
              {savedSignature ? '— or draw a new one below —' : 'Draw your signature in the box below'}
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
  photoPlaceholder: {
    borderWidth: 2,
    borderColor: '#CAD0DA',
    borderStyle: 'dashed',
    borderRadius: 14,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFBFC',
  },
  photoPlaceholderTitle: {color: '#1C2E45', fontSize: 14, fontWeight: '800'},
  photoPlaceholderSub: {fontSize: 12, color: '#6B7280', textAlign: 'center'},
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoBox: {
    width: '47.5%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E8EEF6',
  },
  photoThumb: {width: '100%', height: '100%'},
  photoRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {color: '#fff', fontSize: 11, fontWeight: '900'},
  cameraIcon: {fontSize: 32},

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

  /* Load Code */
  lcInput: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#F8FAFD',
    marginBottom: 10,
  },
  lcErrorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  lcVerifyBtn: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lcVerifyBtnDisabled: {opacity: 0.45},
  lcVerifyBtnText: {color: '#fff', fontSize: 15, fontWeight: '900'},
  lcVerifiedBadge: {
    marginLeft: 'auto' as any,
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  lcVerifiedText: {
    fontSize: 14,
    color: '#15803D',
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
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
    backgroundColor: '#1066B1',
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnDisabled: {opacity: 0.45},
  confirmBtnText: {color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2},

  /* Waiting card */
  waitingCard: {
    backgroundColor: '#F0F6FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  waitingTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E3A5F',
    textAlign: 'center',
  },
  waitingSub: {
    fontSize: 13,
    color: '#3B5E8C',
    textAlign: 'center',
    lineHeight: 20,
  },
  waitingInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    alignSelf: 'stretch',
    paddingHorizontal: 8,
  },
  waitingInfoDot: {fontSize: 8, color: '#6B9EC8', marginTop: 5},
  waitingInfoText: {fontSize: 12, color: '#4A6FA5', flex: 1},

  /* Proceed card */
  proceedCard: {
    backgroundColor: '#F0F6FF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1066B1',
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  proceedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1066B1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proceedIconText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },
  proceedTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1E3A5F',
    textAlign: 'center',
  },
  proceedSub: {
    fontSize: 13,
    color: '#3B5E8C',
    textAlign: 'center',
    lineHeight: 20,
  },
  proceedBtn: {
    backgroundColor: '#1066B1',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  proceedBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

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
