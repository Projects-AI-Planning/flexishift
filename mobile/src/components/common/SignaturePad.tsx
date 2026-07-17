import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {SigSegment, isMeaningfulSignature, segmentsToSmoothPath} from '../../utils/signature';

export interface SignaturePadHandle {
  getSegments: () => SigSegment[];
  clear: () => void;
}

interface Props {
  /** Fired (once) when the drawing becomes a meaningful signature, and on clear. */
  onValidityChange?: (valid: boolean) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: ViewStyle | ViewStyle[];
  strokeColor?: string;
  /** Hint shown centered while nothing has been drawn yet. */
  placeholder?: string;
}

/**
 * Isolated signature drawing surface. Keeps its own segment state so that
 * drawing re-renders ONLY this small component — not the (often huge) parent
 * screen — which is what makes the pen feel responsive. Renders the live stroke
 * as a single smooth SVG path.
 */
const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  ({onValidityChange, onLayout, style, strokeColor = '#1C2E45', placeholder}, ref) => {
    const [segments, setSegments] = useState<SigSegment[]>([]);
    const segmentsRef = useRef<SigSegment[]>([]);
    const lastPoint = useRef<{x: number; y: number} | null>(null);
    const validRef = useRef(false);
    const cbRef = useRef(onValidityChange);
    cbRef.current = onValidityChange;

    useImperativeHandle(ref, () => ({
      getSegments: () => segmentsRef.current,
      clear: () => {
        segmentsRef.current = [];
        setSegments([]);
        validRef.current = false;
        cbRef.current?.(false);
      },
    }));

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          lastPoint.current = {x: e.nativeEvent.locationX, y: e.nativeEvent.locationY};
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const {locationX, locationY} = e.nativeEvent;
          const prev = lastPoint.current;
          if (!prev) {
            return;
          }
          const seg: SigSegment = {x1: prev.x, y1: prev.y, x2: locationX, y2: locationY};
          lastPoint.current = {x: locationX, y: locationY};
          segmentsRef.current = [...segmentsRef.current, seg];
          setSegments(segmentsRef.current);
          if (!validRef.current && isMeaningfulSignature(segmentsRef.current)) {
            validRef.current = true;
            cbRef.current?.(true);
          }
        },
        onPanResponderRelease: () => {
          lastPoint.current = null;
        },
      }),
    ).current;

    return (
      <View style={style} onLayout={onLayout} {...panResponder.panHandlers}>
        <Svg width="100%" height="100%" pointerEvents="none" style={StyleSheet.absoluteFill}>
          {segments.length > 0 && (
            <Path
              d={segmentsToSmoothPath(segments)}
              stroke={strokeColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </Svg>
        {placeholder && segments.length === 0 && (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, padStyles.placeholderWrap]}>
            <Text style={padStyles.placeholderText}>{placeholder}</Text>
          </View>
        )}
      </View>
    );
  },
);
SignaturePad.displayName = 'SignaturePad';

const padStyles = StyleSheet.create({
  placeholderWrap: {alignItems: 'center', justifyContent: 'center'},
  placeholderText: {fontSize: 13, color: '#9CA3AF'},
});

export default SignaturePad;
