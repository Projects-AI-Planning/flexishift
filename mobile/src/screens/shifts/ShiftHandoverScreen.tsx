import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  GestureResponderEvent,
  Image,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import type {Asset} from 'react-native-image-picker';
import {colors, radius, spacing} from '../../theme';
import {isMeaningfulSignature, segmentsToSmoothPath} from '../../utils/signature';
import Svg, {Path} from 'react-native-svg';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ShiftHandoverScreenProps {
  shiftId:          string;
  shiftRef:         string;
  dayNumber:        number;
  totalDays:        number;
  pickupAddress:    string;
  dropAddress:      string;
  pickupLat?:       number | null;
  pickupLng?:       number | null;
  dropLat?:         number | null;
  dropLng?:         number | null;
  /** Called when driver submits checklist + photos + signature */
  onSubmit:         (checklist: Record<string, boolean>, photos: Asset[]) => Promise<void>;
  /** Called when haulier has signed and driver taps "Start Trip →" */
  onProceed:        () => void;
  loading:          boolean;
  error:            string | null;
  haulierSigned:    boolean;
  haulierSignedAt?: string | null;
  onBack:           () => void;
  /** Driver's saved e-signature (JSON segments string) — pre-fills the signing box */
  savedSignature?:  string | null;
}

type ChecklistKey = 'lightsSignals' | 'tirePressure' | 'fluidLevels' | 'bodyDamage';

interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS: ReadonlyArray<{
  key: ChecklistKey;
  label: string;
  description: string;
}> = [
  {key: 'lightsSignals', label: 'Lights & Signals',  description: 'Headlamps, indicators, brake lights'},
  {key: 'tirePressure',  label: 'Tyre Pressure',     description: 'All axles within operating PSI'},
  {key: 'fluidLevels',   label: 'Fluid Levels',       description: 'Oil, coolant, and wiper fluid'},
  {key: 'bodyDamage',    label: 'Body Damage',         description: 'No new dents, cracks, or loose panels'},
];


// ── SignaturePad ───────────────────────────────────────────────────────────────

interface SignaturePadHandle {
  clear:       () => void;
  getSegments: () => Segment[];
}

interface SignaturePadProps {
  onSign: (hasSig: boolean) => void;
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({onSign}, ref) => {
    const [segments, setSegments] = useState<Segment[]>([]);
    const segmentsRef = useRef<Segment[]>([]);
    const lastPoint   = useRef<{x: number; y: number} | null>(null);
    const onSignRef   = useRef(onSign);
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
        onMoveShouldSetPanResponder:  () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          lastPoint.current = {x: e.nativeEvent.locationX, y: e.nativeEvent.locationY};
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const {locationX, locationY} = e.nativeEvent;
          const prev = lastPoint.current;
          if (!prev) {return;}
          const seg: Segment = {x1: prev.x, y1: prev.y, x2: locationX, y2: locationY};
          lastPoint.current = {x: locationX, y: locationY};
          segmentsRef.current = [...segmentsRef.current, seg];
          setSegments(s => [...s, seg]);
          if (isMeaningfulSignature(segmentsRef.current)) {
            onSignRef.current(true);
          }
        },
        onPanResponderRelease: () => { lastPoint.current = null; },
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
    height: 170, backgroundColor: '#F8FAFB',
    borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D5DB',
    borderStyle: 'dashed', overflow: 'hidden',
  },
});

// ── Main Component ─────────────────────────────────────────────────────────────

const ShiftHandoverScreen: React.FC<ShiftHandoverScreenProps> = ({
  shiftRef,
  dayNumber,
  totalDays,
  pickupAddress,
  dropAddress,
  onSubmit,
  onProceed,
  loading,
  error,
  haulierSigned,
  haulierSignedAt,
  onBack,
  savedSignature,
}) => {
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    lightsSignals: false, tirePressure: false,
    fluidLevels:   false, bodyDamage:   false,
  });
  const [photos,            setPhotos]            = useState<Asset[]>([]);
  const [submitted,         setSubmitted]         = useState(false);
  const [driverSigned,      setDriverSigned]      = useState(false);
  const [showSigModal,      setShowSigModal]      = useState(false);
  const [driverHasSig,      setDriverHasSig]      = useState(false);
  const [sigBoxWidth,       setSigBoxWidth]       = useState(0);

  const driverSigRef = useRef<SignaturePadHandle>(null);

  // Reset "submitted" flag if an error is returned so the driver can retry
  React.useEffect(() => {
    if (error) {setSubmitted(false);}
  }, [error]);

  const toggleItem = (key: ChecklistKey) =>
    setChecklist(prev => ({...prev, [key]: !prev[key]}));

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

  // Submission is unlocked once the driver has signed
  const isComplete = driverSigned;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle}>{shiftRef}</Text>
            <Text style={styles.topBarSub}>Handover</Text>
          </View>
          <View style={{width: 44}} />
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
          {CHECKLIST_ITEMS.map((item, idx) => {
            const checked = checklist[item.key];
            return (
              <Pressable
                key={item.key}
                onPress={() => toggleItem(item.key)}
                style={[styles.checkRow, idx < CHECKLIST_ITEMS.length - 1 && styles.checkRowBorder]}>
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

        {/* ── Photo Evidence ───────────────────────────────────────────────── */}
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
                  <Pressable onPress={() => handleRemovePhoto(index)} style={styles.photoRemoveBtn} hitSlop={6}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Driver Signature ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sigHeader}>
            <Text style={styles.sigTitle}>DRIVER SIGNATURE</Text>
            {driverSigned && (
              <Pressable onPress={() => {
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
            let segs: Segment[] = [];
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
            /* ── Case C: Signed ── */
            <View style={[styles.sigBox, styles.sigBoxSigned]}>
              <Text style={styles.sigDoneText}>~ Signed ~</Text>
            </View>
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
              const segs = driverSigRef.current?.getSegments() ?? [];
              const sigData = isMeaningfulSignature(segs)
                ? JSON.stringify(segs)
                : (savedSignature ?? 'driver_signed');
              void onSubmit(
                {...checklist, __driverSignature: sigData} as any,
                photos,
              );
            }}
            disabled={loading || !isComplete}
            style={[styles.confirmBtn, (loading || !isComplete) && styles.confirmBtnDisabled]}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>🔒  Submit Handover</Text>
            )}
          </Pressable>
        ) : loading ? (
          <View style={styles.waitingCard}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.waitingTitle}>Submitting…</Text>
          </View>
        ) : haulierSigned ? (
          <View style={styles.proceedCard}>
            <View style={styles.proceedIconCircle}>
              <Text style={styles.proceedIconText}>✓</Text>
            </View>
            <Text style={styles.proceedTitle}>Haulier Has Confirmed</Text>
            <Text style={styles.proceedSub}>
              The haulier signed at{' '}
              {haulierSignedAt ? new Date(haulierSignedAt).toLocaleString() : '—'}.
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
                Reporting Location: {pickupAddress || '—'} → Drop: {dropAddress || '—'}
              </Text>
            </View>
            <View style={styles.waitingInfoRow}>
              <Text style={styles.waitingInfoDot}>●</Text>
              <Text style={styles.waitingInfoText}>{shiftRef}</Text>
            </View>
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {/* ── Driver Signature Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showSigModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSigModal(false)}>
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
                  setShowSigModal(false);
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
                  setShowSigModal(false);
                }}>
                <Text style={styles.sigModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.sigModalConfirm, !driverHasSig && styles.sigModalConfirmDisabled]}
                disabled={!driverHasSig}
                onPress={() => {
                  if (driverHasSig) {
                    setDriverSigned(true);
                    setShowSigModal(false);
                  }
                }}>
                <Text style={styles.sigModalConfirmText}>Confirm Signature</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const NODE_SIZE = 44;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content:   {padding: 16, paddingBottom: 48},

  /* Top bar */
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    marginBottom: 16, marginHorizontal: -16, marginTop: -16,
  },
  backBtn:      {width: 40, alignItems: 'flex-start', justifyContent: 'center'},
  backIcon:     {fontSize: 22, color: colors.ink, fontWeight: '700'},
  topBarCenter: {flex: 1, alignItems: 'center'},
  topBarTitle:  {fontSize: 17, fontWeight: '900', color: colors.navy ?? colors.ink},
  topBarSub:    {fontSize: 12, fontWeight: '600', color: colors.inkSoft, marginTop: 2},

  /* Stepper */
  stepperRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20},
  stepCol:    {alignItems: 'center', gap: 6},
  stepNode: {
    width: NODE_SIZE, height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2, justifyContent: 'center', alignItems: 'center',
  },
  stepNodeDone:       {backgroundColor: '#2563EB'},
  stepNodeDoneText:   {color: '#fff', fontSize: 18, fontWeight: '900'},
  stepNodeActive:     {backgroundColor: '#2563EB'},
  stepNodeActiveText: {color: '#fff', fontSize: 18, fontWeight: '900'},
  stepNodeIdle:       {backgroundColor: '#C9D1DC'},
  stepNodeIdleText:   {color: '#6B7280', fontSize: 18, fontWeight: '700'},
  stepLineDone: {
    flex: 1, height: 3, backgroundColor: '#2563EB',
    marginTop: NODE_SIZE / 2 - 1.5,
  },
  stepLineIdle: {
    flex: 1, height: 3, backgroundColor: '#C9D1DC',
    marginTop: NODE_SIZE / 2 - 1.5,
  },
  stepLabelDone:   {fontSize: 13, color: '#4B5563', fontWeight: '500'},
  stepLabelActive: {fontSize: 13, color: colors.navy ?? colors.ink, fontWeight: '800'},
  stepLabelIdle:   {fontSize: 13, color: '#9CA3AF', fontWeight: '500'},

  /* Card */
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E9F0',
    padding: 16, marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F2F6',
  },
  cardHeaderIcon:  {fontSize: 18, color: colors.navy ?? colors.ink},
  cardHeaderTitle: {fontSize: 15, fontWeight: '700', color: colors.navy ?? colors.ink},

  /* Checklist */
  checkRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 12,
  },
  checkRowBorder: {borderBottomWidth: 1, borderBottomColor: '#F0F2F6'},
  checkbox: {
    width: 22, height: 22, borderRadius: 5,
    borderWidth: 2, borderColor: '#C9D1DC', backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  checkboxChecked: {backgroundColor: '#2563EB', borderColor: '#2563EB'},
  checkboxTick:    {color: '#fff', fontSize: 13, fontWeight: '900'},
  checkCopy:       {flex: 1},
  checkTitle:      {fontSize: 15, fontWeight: '700', color: '#111827'},
  checkSubtitle:   {fontSize: 13, color: '#6B7280', marginTop: 2},

  /* Photo grid */
  photoPlaceholder: {
    borderWidth: 2, borderColor: '#CAD0DA', borderStyle: 'dashed',
    borderRadius: 14, minHeight: 120,
    justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#FAFBFC',
  },
  photoPlaceholderTitle: {color: '#1C2E45', fontSize: 14, fontWeight: '800'},
  photoPlaceholderSub:   {fontSize: 12, color: '#6B7280', textAlign: 'center'},
  photoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  photoBox: {
    width: '47.5%', aspectRatio: 1, borderRadius: 12,
    overflow: 'hidden', backgroundColor: '#E8EEF6',
  },
  photoThumb:     {width: '100%', height: '100%'},
  photoRemoveBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoRemoveText: {color: '#fff', fontSize: 11, fontWeight: '900'},
  cameraIcon: {fontSize: 32},

  /* Signature */
  sigHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  sigTitle:   {fontSize: 13, fontWeight: '800', color: colors.navy ?? colors.ink, letterSpacing: 0.5},
  clearText:  {fontSize: 14, fontWeight: '700', color: '#2563EB'},
  sigBox: {
    height: 110, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB',
    backgroundColor: '#F0F4FA', justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  sigBoxSigned:    {backgroundColor: '#EFF6FF', borderColor: '#93C5FD'},
  sigTapIcon:      {fontSize: 24},
  sigHint:         {fontSize: 15, color: '#C4CAD4', fontStyle: 'italic'},
  sigDoneText:     {fontSize: 22, color: '#2563EB', fontStyle: 'italic', fontWeight: '700'},
  sigConfirmText:  {
    marginTop: 8, fontSize: 10, color: '#6B7280',
    letterSpacing: 0.3, textTransform: 'uppercase',
  },

  /* Error */
  errorText: {
    color: colors.danger, fontSize: 13, fontWeight: '700',
    textAlign: 'center', marginVertical: spacing.md,
  },

  /* Submit button */
  confirmBtn: {
    backgroundColor: '#1066B1', borderRadius: 14,
    height: 58, justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  confirmBtnDisabled: {opacity: 0.45},
  confirmBtnText: {color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2},

  /* Waiting card */
  waitingCard: {
    backgroundColor: '#F0F6FF', borderRadius: 16,
    borderWidth: 1, borderColor: '#BFDBFE',
    padding: 24, alignItems: 'center', gap: 12, marginTop: 8,
  },
  waitingTitle: {fontSize: 17, fontWeight: '900', color: '#1E3A5F', textAlign: 'center'},
  waitingSub:   {fontSize: 13, color: '#3B5E8C', textAlign: 'center', lineHeight: 20},
  waitingInfoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    alignSelf: 'stretch', paddingHorizontal: 8,
  },
  waitingInfoDot:  {fontSize: 8, color: '#6B9EC8', marginTop: 5},
  waitingInfoText: {fontSize: 12, color: '#4A6FA5', flex: 1},

  /* Proceed card */
  proceedCard: {
    backgroundColor: '#F0F6FF', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#1066B1',
    padding: 24, alignItems: 'center', gap: 12, marginTop: 8,
  },
  proceedIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#1066B1', justifyContent: 'center', alignItems: 'center',
  },
  proceedIconText: {color: '#fff', fontSize: 30, fontWeight: '900'},
  proceedTitle:    {fontSize: 19, fontWeight: '900', color: '#1E3A5F', textAlign: 'center'},
  proceedSub:      {fontSize: 13, color: '#3B5E8C', textAlign: 'center', lineHeight: 20},
  proceedBtn: {
    backgroundColor: '#1066B1', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32, marginTop: 4,
  },
  proceedBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},

  /* Signature Modal */
  sigModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  sigModalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  sigModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  sigModalTitle:          {fontSize: 18, fontWeight: '900', color: colors.navy ?? colors.ink},
  sigModalHint:           {fontSize: 13, color: '#6B7280', marginBottom: 14},
  sigModalActions:        {flexDirection: 'row', gap: 12, marginTop: 20},
  sigModalCancel: {
    flex: 1, height: 50, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center',
  },
  sigModalCancelText:     {fontSize: 15, fontWeight: '700', color: '#374151'},
  sigModalConfirm: {
    flex: 2, height: 50, borderRadius: 12,
    backgroundColor: '#1066B1', justifyContent: 'center', alignItems: 'center',
  },
  sigModalConfirmDisabled:{opacity: 0.4},
  sigModalConfirmText:    {fontSize: 15, fontWeight: '900', color: '#fff'},
});

export default ShiftHandoverScreen;
