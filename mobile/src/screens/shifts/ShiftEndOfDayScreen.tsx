import React, {useMemo, useState} from 'react';
import {
  Alert,
  GestureResponderEvent,
  Image,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {launchCamera, launchImageLibrary, Asset} from 'react-native-image-picker';
import AppInput from '../../components/common/AppInput';
import {colors, radius, spacing} from '../../theme';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ShiftEndOfDayData {
  notes:          string;
  recipientName:  string;
  proofPhotoUrl?: string;
  signatureData?: string;
  photoAssets:    Asset[];
}

interface ShiftEndOfDayScreenProps {
  shiftId:   string;
  shiftRef:  string;
  dayNumber: number;
  totalDays: number;
  onSubmit:  (data: ShiftEndOfDayData) => Promise<void>;
  loading:   boolean;
  error:     string | null;
  onBack:    () => void;
}

// ── Signature helpers ─────────────────────────────────────────────────────────

type Point  = {x: number; y: number};
type Stroke = Point[];

function dist(a: Point, b: Point) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function lineStyle(a: Point, b: Point) {
  const width = Math.max(dist(a, b), 1);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return {
    position: 'absolute' as const,
    left: a.x, top: a.y, width, height: 3,
    backgroundColor: colors.navy ?? '#102235',
    borderRadius: 999,
    transform: [
      {translateX: -width / 2},
      {translateY: -1.5},
      {rotate: `${angle}deg`},
    ],
  };
}

const NODE_SIZE = 40;

// ── Component ──────────────────────────────────────────────────────────────────

const ShiftEndOfDayScreen: React.FC<ShiftEndOfDayScreenProps> = ({
  shiftRef,
  dayNumber,
  totalDays,
  onSubmit,
  loading,
  error,
  onBack,
}) => {
  const [notes,           setNotes]           = useState('');
  const [recipientName,   setRecipientName]   = useState('');
  const [photos,          setPhotos]          = useState<Asset[]>([]);
  const [signatureStrokes, setSignatureStrokes] = useState<Stroke[]>([]);
  const [currentStroke,   setCurrentStroke]   = useState<Stroke>([]);

  const isLastDay = dayNumber >= totalDays;

  // ── Photo helpers ─────────────────────────────────────────────────────────

  const addPhoto = () => {
    Alert.alert('Add Proof Photo', 'Choose source', [
      {
        text: '📷  Camera',
        onPress: () =>
          launchCamera(
            {mediaType: 'photo', cameraType: 'back', quality: 0.8, saveToPhotos: false},
            res => {
              if (res.didCancel || res.errorCode) {return;}
              const asset = res.assets?.[0];
              if (asset?.uri) {setPhotos(prev => [...prev, asset]);}
            },
          ),
      },
      {
        text: '🖼  Gallery',
        onPress: () =>
          launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 0}, res => {
            if (res.didCancel || res.errorCode) {return;}
            const assets = (res.assets ?? []).filter(a => a?.uri);
            if (assets.length) {setPhotos(prev => [...prev, ...assets]);}
          }),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const removePhoto = (i: number) => setPhotos(prev => prev.filter((_, idx) => idx !== i));

  // ── Signature helpers ─────────────────────────────────────────────────────

  const clearSignature = () => {
    setSignatureStrokes([]);
    setCurrentStroke([]);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder:  () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const {locationX, locationY} = evt.nativeEvent;
          setCurrentStroke([{x: locationX, y: locationY}]);
        },
        onPanResponderMove: (evt: GestureResponderEvent, _: PanResponderGestureState) => {
          const {locationX, locationY} = evt.nativeEvent;
          const point = {x: locationX, y: locationY};
          setCurrentStroke(prev => {
            const last = prev[prev.length - 1];
            if (last && dist(last, point) < 2) {return prev;}
            return [...prev, point];
          });
        },
        onPanResponderRelease: () => {
          setCurrentStroke(prev => {
            if (!prev.length) {return prev;}
            setSignatureStrokes(strokes => [...strokes, prev]);
            return [];
          });
        },
        onPanResponderTerminate: () => {
          setCurrentStroke(prev => {
            if (!prev.length) {return prev;}
            setSignatureStrokes(strokes => [...strokes, prev]);
            return [];
          });
        },
      }),
    [],
  );

  const signaturePoints   = [...signatureStrokes, ...(currentStroke.length ? [currentStroke] : [])];
  const signatureSegments = signaturePoints.flatMap(stroke =>
    stroke.slice(1).map((pt, idx) => lineStyle(stroke[idx], pt)),
  );

  const isComplete = recipientName.trim().length > 1 && photos.length > 0 && signatureSegments.length > 0;

  const handleSubmit = () => {
    const sigData = signatureSegments.length > 0
      ? JSON.stringify(signaturePoints)
      : undefined;
    onSubmit({
      notes,
      recipientName,
      signatureData: sigData,
      photoAssets:   photos,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{shiftRef}</Text>
          <Text style={styles.headerSub}>End of Day {dayNumber}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Step row ──────────────────────────────────────────────────────── */}
        <View style={styles.stepperRow}>
          {['Start', 'Handover', 'Work Day', 'End of Day'].map((label, idx) => {
            const done   = idx < 3;
            const active = idx === 3;
            return (
              <React.Fragment key={label}>
                {idx > 0 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
                <View style={styles.stepCol}>
                  <View style={[styles.stepNode, done ? styles.stepNodeDone : active ? styles.stepNodeActive : styles.stepNodeFuture]}>
                    <Text style={done ? styles.stepNodeDoneText : active ? styles.stepNodeActiveText : styles.stepNodeFutureText}>
                      {done ? '✓' : String(idx + 1)}
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* ── Ref pill ──────────────────────────────────────────────────────── */}
        <View style={styles.refRow}>
          <View style={styles.refPill}><Text style={styles.refText}>{shiftRef}</Text></View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {isLastDay ? 'FINAL DAY' : `DAY ${dayNumber} / ${totalDays}`}
            </Text>
          </View>
        </View>

        {/* ── Proof photo ───────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>📷</Text>
            <Text style={styles.cardHeaderTitle}>
              Proof Photo{photos.length > 0 ? ` (${photos.length})` : ''}
            </Text>
            {photos.length > 0 && (
              <Pressable onPress={addPhoto} style={styles.addMoreBtn}>
                <Text style={styles.addMoreText}>+ Add</Text>
              </Pressable>
            )}
          </View>

          {photos.length === 0 ? (
            <Pressable onPress={addPhoto} style={styles.photoPlaceholder}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.photoTitle}>Add End-of-Day Photo</Text>
              <Text style={styles.photoSubtitle}>Capture proof of work completion</Text>
            </Pressable>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map((asset, i) => (
                <View key={`${asset.uri}-${i}`} style={styles.photoTile}>
                  <Image source={{uri: asset.uri!}} style={styles.photoTileImage} resizeMode="cover" />
                  <Pressable onPress={() => removePhoto(i)} style={styles.photoRemoveBtn} hitSlop={6}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Signature ─────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sigHeader}>
            <Text style={styles.sigTitle}>RECIPIENT / SITE SIGNATURE</Text>
            <Pressable onPress={clearSignature} disabled={!signaturePoints.length}>
              <Text style={[styles.clearText, !signaturePoints.length && styles.clearTextDisabled]}>
                Clear
              </Text>
            </Pressable>
          </View>
          <View style={styles.sigBox} {...panResponder.panHandlers}>
            {signatureSegments.length ? (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {signatureSegments.map((seg, i) => (
                  <View key={`seg-${i}`} style={seg} />
                ))}
              </View>
            ) : (
              <Text style={styles.sigHint}>Sign here</Text>
            )}
          </View>
          <Text style={styles.sigHintSub}>
            Have the site contact or recipient sign above.
          </Text>
        </View>

        {/* ── Recipient name ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>Recipient / Site Contact Name</Text>
          </View>
          <AppInput
            placeholder="Full name"
            value={recipientName}
            onChangeText={setRecipientName}
            containerStyle={{marginBottom: 0}}
          />
        </View>

        {/* ── Notes ─────────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>Day Notes</Text>
            <Text style={styles.optionalTag}>Optional</Text>
          </View>
          <AppInput
            placeholder="Work completed, any issues, mileage…"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            containerStyle={{marginBottom: 0}}
          />
        </View>

        {/* ── Info card ─────────────────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>NEXT STEP</Text>
          <Text style={styles.infoTitle}>
            {isLastDay
              ? 'Shift complete — haulier will process final payment'
              : `Day ${dayNumber} done — haulier confirms & pays for Day ${dayNumber + 1}`}
          </Text>
          <Text style={styles.infoText}>
            {isLastDay
              ? 'Once the haulier approves, your final payment will be released. You can then leave a rating.'
              : 'Once the haulier processes Day payment, you can start Day ' + (dayNumber + 1) + '.'}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading || !isComplete}
          style={[styles.submitBtn, (loading || !isComplete) && styles.submitBtnDisabled]}>
          <Text style={styles.submitBtnText}>
            {loading ? 'Submitting…' : `✓  Submit Day ${dayNumber} Report`}
          </Text>
        </Pressable>

        <Text style={styles.requiredNote}>
          * Proof photo, signature, and recipient name are required.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content:   {padding: 16, paddingBottom: 48},

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn:      {width: 40, alignItems: 'flex-start', justifyContent: 'center'},
  backIcon:     {fontSize: 22, color: colors.ink, fontWeight: '700'},
  headerCenter: {flex: 1, alignItems: 'center'},
  headerTitle:  {fontSize: 17, fontWeight: '900', color: colors.navy ?? colors.ink},
  headerSub:    {fontSize: 12, fontWeight: '600', color: colors.inkSoft, marginTop: 2},

  stepperRow:   {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, marginTop: 4},
  stepCol:      {alignItems: 'center', gap: 4},
  stepLine:     {flex: 1, height: 3, backgroundColor: '#E5E9F0', marginTop: NODE_SIZE / 2 - 1.5},
  stepLineDone: {backgroundColor: '#2563EB'},
  stepNode:     {width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, justifyContent: 'center', alignItems: 'center'},
  stepNodeDone: {backgroundColor: '#2563EB'},
  stepNodeDoneText:   {color: '#fff', fontSize: 16, fontWeight: '900'},
  stepNodeActive:     {backgroundColor: colors.accent},
  stepNodeActiveText: {color: '#fff', fontSize: 16, fontWeight: '900'},
  stepNodeFuture:     {backgroundColor: '#E5E9F0'},
  stepNodeFutureText: {color: '#9AA4B2', fontSize: 14, fontWeight: '700'},
  stepLabel:     {fontSize: 11, color: '#9AA4B2', fontWeight: '500'},
  stepLabelActive:{fontSize: 11, color: colors.navy ?? colors.ink, fontWeight: '800'},

  refRow:     {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16},
  refPill:    {backgroundColor: '#E8EBF0', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6},
  refText:    {color: '#1F2937', fontSize: 14, fontWeight: '800', letterSpacing: 0.5},
  badge:      {backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4},
  badgeText:  {color: '#FFFFFF', fontSize: 10, fontWeight: '900'},

  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: '#E5E9F0', padding: 16, marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F2F6',
  },
  cardHeaderIcon:  {fontSize: 16},
  cardHeaderTitle: {flex: 1, fontSize: 15, fontWeight: '700', color: colors.navy ?? colors.ink},
  optionalTag: {
    fontSize: 11, fontWeight: '700', color: colors.inkSoft,
    backgroundColor: '#F0F2F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  addMoreBtn:  {backgroundColor: '#EFF6FF', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#BFDBFE'},
  addMoreText: {color: colors.accent, fontSize: 12, fontWeight: '800'},

  photoPlaceholder: {
    borderWidth: 2, borderColor: '#CAD0DA', borderStyle: 'dashed',
    borderRadius: 14, minHeight: 120, justifyContent: 'center',
    alignItems: 'center', gap: 6, backgroundColor: '#FAFBFC',
  },
  cameraIcon:  {fontSize: 32},
  photoTitle:  {color: colors.navy ?? colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'center'},
  photoSubtitle:{color: colors.inkSoft, fontSize: 13, textAlign: 'center', paddingHorizontal: 16},
  photoGrid:   {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  photoTile:   {width: '47.5%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E8EEF6'},
  photoTileImage:{width: '100%', height: '100%'},
  photoRemoveBtn:{
    position: 'absolute', top: 6, right: 6, width: 26, height: 26,
    borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoRemoveText:{color: '#fff', fontSize: 11, fontWeight: '900'},

  sigHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  sigTitle:  {fontSize: 13, fontWeight: '800', color: colors.navy ?? colors.ink, letterSpacing: 0.5},
  clearText: {fontSize: 14, fontWeight: '700', color: '#2563EB'},
  clearTextDisabled: {opacity: 0.35},
  sigBox: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12,
    height: 160, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8FAFB', overflow: 'hidden',
  },
  sigHint:    {color: '#94A3B8', fontSize: 18, fontWeight: '700', fontStyle: 'italic'},
  sigHintSub: {marginTop: spacing.sm, color: colors.inkSoft, fontSize: 12},

  infoCard: {
    backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1,
    borderRadius: radius.xl, padding: spacing.lg, gap: 4, marginBottom: 16,
  },
  infoLabel: {color: colors.accent, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8},
  infoTitle: {color: colors.navy ?? colors.ink, fontSize: 15, fontWeight: '800'},
  infoText:  {color: colors.inkSoft, fontSize: 12, lineHeight: 18},

  errorText: {
    color: colors.danger, fontSize: 13, fontWeight: '700',
    marginBottom: spacing.md, textAlign: 'center',
  },

  submitBtn: {backgroundColor: colors.accent, borderRadius: 14, height: 58, justifyContent: 'center', alignItems: 'center'},
  submitBtnDisabled: {opacity: 0.45},
  submitBtnText: {color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2},

  requiredNote: {color: colors.inkSoft, fontSize: 11, textAlign: 'center', marginTop: spacing.sm},
});

export default ShiftEndOfDayScreen;
