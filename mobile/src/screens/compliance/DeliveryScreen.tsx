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
  TextInput,
  View,
} from 'react-native';
import {launchCamera, launchImageLibrary, Asset} from 'react-native-image-picker';
import Card from '../../components/common/Card';
import {colors, radius, shadow, spacing} from '../../theme';

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

const DeliveryScreen: React.FC<DeliveryScreenProps> = ({
  jobId: _jobId,
  jobReference,
  onSubmit,
  loading,
  error,
}) => {
  const [notes, setNotes] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [photos, setPhotos] = useState<Record<string, Asset>>({});
  const [signatureStrokes, setSignatureStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);

  const handlePickPhoto = (type: string) => {
    Alert.alert('Delivery Photo', 'Choose photo source', [
      {
        text: '📷  Camera',
        onPress: () => {
          launchCamera(
            {mediaType: 'photo', cameraType: 'back', quality: 0.8, saveToPhotos: false},
            response => {
              if (response.didCancel || response.errorCode) {return;}
              const asset = response.assets?.[0];
              if (asset?.uri) {
                setPhotos(prev => ({...prev, [type]: asset}));
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
              setPhotos(prev => ({...prev, [type]: asset}));
            }
          });
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
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
          const point = {x: locationX, y: locationY};
          setCurrentStroke([point]);
        },
        onPanResponderMove: (evt: GestureResponderEvent, _gesture: PanResponderGestureState) => {
          const {locationX, locationY} = evt.nativeEvent;
          const point = {x: locationX, y: locationY};
          setCurrentStroke(prev => {
            const last = prev[prev.length - 1];
            if (last && dist(last, point) < 2) {
              return prev;
            }
            return [...prev, point];
          });
        },
        onPanResponderRelease: () => {
          setCurrentStroke(prev => {
            if (!prev.length) {
              return prev;
            }
            setSignatureStrokes(strokes => [...strokes, prev]);
            return [];
          });
        },
        onPanResponderTerminate: () => {
          setCurrentStroke(prev => {
            if (!prev.length) {
              return prev;
            }
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
    Boolean(photos.delivery?.uri) &&
    signatureSegments.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
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

        <View style={styles.refPill}>
          <Text style={styles.refText}># {jobReference}</Text>
        </View>

        <Card title="Upload Delivery Photo" variant="default">
          <Pressable onPress={() => handlePickPhoto('delivery')} style={styles.photoBoxLarge}>
            {photos.delivery?.uri ? (
              <Image
                source={{uri: photos.delivery.uri}}
                style={{width: '100%', height: 260, borderRadius: 18, resizeMode: 'cover'}}
              />
            ) : (
              <>
                <Text style={styles.photoLargeIcon}>{'\uD83D\uDCF7'}</Text>
                <Text style={styles.photoLargeTitle}>Upload Delivery Photo</Text>
                <Text style={styles.photoLargeSubtitle}>Proof of cargo placement at site</Text>
              </>
            )}
          </Pressable>
        </Card>

        <Card title="Recipient Signature" variant="default">
          <View style={styles.signatureHeader}>
            <Text style={styles.signatureTitle}>RECIPIENT SIGNATURE</Text>
            <Pressable onPress={clearSignature} disabled={!signaturePoints.length}>
              <Text style={[styles.clearText, !signaturePoints.length && styles.clearTextDisabled]}>
                Clear
              </Text>
            </Pressable>
          </View>
          <View style={styles.signatureBox} {...panResponder.panHandlers}>
            {signatureSegments.length ? (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {signatureSegments.map((segment, idx) => (
                  <View key={`${idx}`} style={segment} />
                ))}
              </View>
            ) : (
              <Text style={styles.signatureHint}>Sign here</Text>
            )}
          </View>
          <Text style={styles.signatureHintSub}>
            Draw the recipient signature with your finger.
          </Text>
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
          onPress={() =>
            onSubmit(
              {
                receiverName,
                notes,
                recipientSignature: signaturePoints,
              },
              Object.values(photos),
            )
          }
          disabled={loading || !isComplete}
          style={[styles.primaryButton, (loading || !isComplete) && styles.disabledButton]}>
          <Text style={styles.primaryButtonText}>
            {'\u2713'} {loading ? 'Submitting...' : 'Complete Job & Submit Report'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F7FB'},
  content: {padding: spacing.xl, paddingBottom: 120},
  topBar: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl},
  brand: {color: colors.navy, fontSize: 28, fontWeight: '900'},
  stepper: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs},
  stepNodeDone: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1D2D44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNodeDoneText: {color: colors.card, fontSize: 24, fontWeight: '900'},
  stepLineDone: {flex: 1, height: 3, backgroundColor: '#1D2D44'},
  stepLineCurrent: {flex: 1, height: 3, backgroundColor: colors.accent},
  stepNodeCurrent: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNodeCurrentText: {color: colors.card, fontSize: 24, fontWeight: '900'},
  stepLabels: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl},
  stepLabel: {flex: 1, textAlign: 'center', color: '#364152', fontSize: 16, fontWeight: '700'},
  stepLabelCurrent: {flex: 1, textAlign: 'center', color: colors.navy, fontSize: 16, fontWeight: '800'},
  refPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8EBF0',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  refText: {color: '#1F2937', fontSize: 18, fontWeight: '800', letterSpacing: 1},
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
  photoLargeTitle: {color: '#1F2937', fontSize: 30, fontWeight: '900', textAlign: 'center'},
  photoLargeSubtitle: {color: '#4B5563', fontSize: 18, textAlign: 'center', marginTop: spacing.sm},
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
  clearText: {fontSize: 16, fontWeight: '700', color: '#B42318'},
  clearTextDisabled: {opacity: 0.35},
  signatureBox: {
    borderWidth: 1,
    borderColor: '#CAD1DB',
    borderRadius: 16,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FBFCFE',
    overflow: 'hidden',
  },
  signatureHint: {color: '#94A3B8', fontSize: 26, fontWeight: '700'},
  signatureHintSub: {marginTop: spacing.sm, color: colors.inkSoft, fontSize: 13},
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
  nextStepTitle: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  nextStepText: {color: colors.inkSoft, fontSize: 12, lineHeight: 18},
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
  disabledButton: {opacity: 0.5},
  primaryButtonText: {color: colors.card, fontSize: 24, fontWeight: '900'},
});

export default DeliveryScreen;
