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
import AppInput from '../../components/common/AppInput';
import {launchCamera, launchImageLibrary, Asset} from 'react-native-image-picker';
import {colors, radius, spacing} from '../../theme';

interface DeliveryScreenProps {
  jobId: string;
  jobReference: string;
  onSubmit: (proofData: any, photos: any[]) => Promise<void>;
  loading: boolean;
  error: string | null;
}

type Point = {x: number; y: number};
type Stroke = Point[];

function dist(a: Point, b: Point) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function lineStyle(a: Point, b: Point) {
  const width = Math.max(dist(a, b), 1);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return {
    position: 'absolute' as const,
    left: a.x,
    top: a.y,
    width,
    height: 3,
    backgroundColor: colors.navy,
    borderRadius: 999,
    transform: [{translateX: -width / 2}, {translateY: -1.5}, {rotate: `${angle}deg`}],
  };
}

const NODE_SIZE = 44;

const DeliveryScreen: React.FC<DeliveryScreenProps> = ({
  jobId: _jobId,
  jobReference,
  onSubmit,
  loading,
  error,
}) => {
  const [notes, setNotes] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [deliveryPhotos, setDeliveryPhotos] = useState<Asset[]>([]);
  const [signatureStrokes, setSignatureStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);

  const addPhoto = () => {
    Alert.alert('Add Delivery Photo', 'Choose photo source', [
      {
        text: '📷  Camera',
        onPress: () => {
          launchCamera(
            {mediaType: 'photo', cameraType: 'back', quality: 0.8, saveToPhotos: false},
            response => {
              if (response.didCancel || response.errorCode) {return;}
              const asset = response.assets?.[0];
              if (asset?.uri) {setDeliveryPhotos(prev => [...prev, asset]);}
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
            if (assets.length) {setDeliveryPhotos(prev => [...prev, ...assets]);}
          });
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const removePhoto = (index: number) => {
    setDeliveryPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const clearSignature = () => {
    setSignatureStrokes([]);
    setCurrentStroke([]);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const {locationX, locationY} = evt.nativeEvent;
          setCurrentStroke([{x: locationX, y: locationY}]);
        },
        onPanResponderMove: (evt: GestureResponderEvent, _gesture: PanResponderGestureState) => {
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

  const signaturePoints = [...signatureStrokes, ...(currentStroke.length ? [currentStroke] : [])];
  const signatureSegments = signaturePoints.flatMap(stroke =>
    stroke.slice(1).map((point, idx) => lineStyle(stroke[idx], point)),
  );

  const isComplete =
    receiverName.length > 2 &&
    deliveryPhotos.length > 0 &&
    signatureSegments.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

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
            <View style={[styles.stepNode, styles.stepNodeDone]}>
              <Text style={styles.stepNodeDoneText}>✓</Text>
            </View>
            <Text style={styles.stepLabelDone}>Handover</Text>
          </View>
          <View style={styles.stepLineDone} />
          <View style={styles.stepCol}>
            <View style={[styles.stepNode, styles.stepNodeActive]}>
              <Text style={styles.stepNodeActiveText}>3</Text>
            </View>
            <Text style={styles.stepLabelActive}>Delivery</Text>
          </View>
        </View>

        {/* ── Job Reference ─────────────────────────────────────────────────── */}
        <View style={styles.refRow}>
          <View style={styles.refPill}>
            <Text style={styles.refText}>{jobReference}</Text>
          </View>
          <View style={styles.deliveryBadge}>
            <Text style={styles.deliveryBadgeText}>DELIVERY</Text>
          </View>
        </View>

        {/* ── Delivery Photos ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>📷</Text>
            <Text style={styles.cardHeaderTitle}>
              Delivery Photos
              {deliveryPhotos.length > 0 ? ` (${deliveryPhotos.length})` : ''}
            </Text>
            {deliveryPhotos.length > 0 && (
              <Pressable onPress={addPhoto} style={styles.addMoreBtn}>
                <Text style={styles.addMoreText}>+ Add</Text>
              </Pressable>
            )}
          </View>

          {deliveryPhotos.length === 0 ? (
            <Pressable onPress={addPhoto} style={styles.photoPlaceholder}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.photoTitle}>Upload Delivery Photos</Text>
              <Text style={styles.photoSubtitle}>
                Tap to take or choose photos — you can add multiple
              </Text>
            </Pressable>
          ) : (
            <View style={styles.photoGrid}>
              {deliveryPhotos.map((asset, index) => (
                <View key={`${asset.uri}-${index}`} style={styles.photoTile}>
                  <Image
                    source={{uri: asset.uri!}}
                    style={styles.photoTileImage}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => removePhoto(index)}
                    style={styles.photoRemoveBtn}
                    hitSlop={6}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Recipient Signature ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sigHeader}>
            <Text style={styles.sigTitle}>RECIPIENT SIGNATURE</Text>
            <Pressable onPress={clearSignature} disabled={!signaturePoints.length}>
              <Text style={[styles.clearText, !signaturePoints.length && styles.clearTextDisabled]}>
                Clear
              </Text>
            </Pressable>
          </View>
          <View style={styles.sigBox} {...panResponder.panHandlers}>
            {signatureSegments.length ? (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {signatureSegments.map((segment, idx) => (
                  <View key={`${idx}`} style={segment} />
                ))}
              </View>
            ) : (
              <Text style={styles.sigHint}>Sign here</Text>
            )}
          </View>
          <Text style={styles.sigHintSub}>
            Draw the recipient signature with your finger.
          </Text>
        </View>

        {/* ── Recipient Name ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>Recipient Name</Text>
          </View>
          <AppInput
            placeholder="Full name of the receiver"
            value={receiverName}
            onChangeText={setReceiverName}
            containerStyle={{marginBottom: 0}}
          />
        </View>

        {/* ── Delivery Notes ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>Delivery Notes</Text>
            <Text style={styles.optionalTag}>Optional</Text>
          </View>
          <AppInput
            placeholder="Cargo condition, gate codes, site access..."
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            containerStyle={{marginBottom: 0}}
          />
        </View>

        {/* ── After Submit info ────────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>NEXT STEP</Text>
          <Text style={styles.infoTitle}>Delivery review & payment release</Text>
          <Text style={styles.infoText}>
            Once submitted, the haulier reviews the delivery and payment moves to the release stage.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={() =>
            onSubmit(
              {receiverName, notes, recipientSignature: signaturePoints},
              deliveryPhotos,
            )
          }
          disabled={loading || !isComplete}
          style={[styles.submitBtn, (loading || !isComplete) && styles.submitBtnDisabled]}>
          <Text style={styles.submitBtnText}>
            {loading ? 'Submitting…' : '✓  Complete Job & Submit Report'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: 16, paddingBottom: 48},

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
  stepNodeActive: {backgroundColor: colors.accent},
  stepNodeActiveText: {color: '#fff', fontSize: 18, fontWeight: '900'},
  stepLineDone: {
    flex: 1,
    height: 3,
    backgroundColor: '#2563EB',
    marginTop: NODE_SIZE / 2 - 1.5,
  },
  stepLabelDone: {fontSize: 13, color: '#4B5563', fontWeight: '500'},
  stepLabelActive: {fontSize: 13, color: colors.navy, fontWeight: '800'},

  /* Ref row */
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  refPill: {
    backgroundColor: '#E8EBF0',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  refText: {color: '#1F2937', fontSize: 14, fontWeight: '800', letterSpacing: 0.5},
  deliveryBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deliveryBadgeText: {color: colors.navy, fontSize: 10, fontWeight: '900'},

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
  cardHeaderIcon: {fontSize: 16},
  cardHeaderTitle: {flex: 1, fontSize: 15, fontWeight: '700', color: colors.navy},
  optionalTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSoft,
    backgroundColor: '#F0F2F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },

  /* Photos */
  addMoreBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addMoreText: {color: '#1066B1', fontSize: 12, fontWeight: '800'},
  photoPlaceholder: {
    borderWidth: 2,
    borderColor: '#CAD0DA',
    borderStyle: 'dashed',
    borderRadius: 14,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFBFC',
  },
  cameraIcon: {fontSize: 36},
  photoTitle: {color: colors.navy, fontSize: 15, fontWeight: '800', textAlign: 'center'},
  photoSubtitle: {color: colors.inkSoft, fontSize: 13, textAlign: 'center', paddingHorizontal: 16},
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoTile: {
    width: '47.5%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E8EEF6',
  },
  photoTileImage: {width: '100%', height: '100%'},
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
  clearText: {fontSize: 14, fontWeight: '700', color: '#2563EB'},
  clearTextDisabled: {opacity: 0.35},
  sigBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
    overflow: 'hidden',
  },
  sigHint: {color: '#94A3B8', fontSize: 18, fontWeight: '700', fontStyle: 'italic'},
  sigHintSub: {marginTop: spacing.sm, color: colors.inkSoft, fontSize: 12},

  /* Info card */
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: 4,
    marginBottom: 16,
  },
  infoLabel: {
    color: '#1066B1',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoTitle: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  infoText: {color: colors.inkSoft, fontSize: 12, lineHeight: 18},

  /* Error */
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  /* Submit button */
  submitBtn: {
    backgroundColor: '#1066B1',
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {opacity: 0.45},
  submitBtnText: {color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2},
});

export default DeliveryScreen;
