import React from 'react';
import {View, ViewStyle} from 'react-native';
import Svg, {Path} from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const AccountIcon: React.FC<Props> = ({size = 20, color = '#9CA4B0', style}) => (
  <View style={[{width: size, height: size, alignItems: 'center', justifyContent: 'flex-end'}, style]}>
    <View style={{
      width: size * 0.45,
      height: size * 0.45,
      borderRadius: size * 0.225,
      borderWidth: 1.5,
      borderColor: color,
      marginBottom: 2,
    }} />
    <View style={{
      width: size * 0.82,
      height: size * 0.38,
      borderTopWidth: 1.5,
      borderLeftWidth: 1.5,
      borderRightWidth: 1.5,
      borderBottomWidth: 0,
      borderColor: color,
      borderTopLeftRadius: size * 0.41,
      borderTopRightRadius: size * 0.41,
    }} />
  </View>
);

export const MailIcon: React.FC<Props> = ({size = 20, color = '#9CA4B0', style}) => {
  const boxH = size * 0.72;
  // Diagonal from top-corner to center of box
  const lineLen = Math.sqrt((size / 2) ** 2 + (boxH / 2) ** 2);
  const angleDeg = (Math.atan2(boxH / 2, size / 2) * 180) / Math.PI;

  return (
    <View style={[{width: size, height: size, justifyContent: 'center'}, style]}>
      <View style={{
        width: size,
        height: boxH,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        {/* Left diagonal: top-left corner → center */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: lineLen,
          height: 1.5,
          backgroundColor: color,
          transformOrigin: 'left center',
          transform: [{rotate: `${angleDeg}deg`}],
        }} />
        {/* Right diagonal: top-right corner → center */}
        <View style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: lineLen,
          height: 1.5,
          backgroundColor: color,
          transformOrigin: 'right center',
          transform: [{rotate: `${-angleDeg}deg`}],
        }} />
      </View>
    </View>
  );
};

export const PhoneIcon: React.FC<Props> = ({size = 20, color = '#9CA4B0', style}) => (
  <View style={[{width: size, height: size, alignItems: 'center', justifyContent: 'center'}, style]}>
    <View style={{
      width: size * 0.58,
      height: size * 0.88,
      borderWidth: 1.5,
      borderColor: color,
      borderRadius: size * 0.13,
    }} />
    <View style={{
      position: 'absolute',
      bottom: size * 0.12,
      width: size * 0.24,
      height: 1.5,
      backgroundColor: color,
      borderRadius: 1,
    }} />
  </View>
);

export const LockIcon: React.FC<Props> = ({size = 20, color = '#9CA4B0', style}) => {
  const archW = size * 0.48;
  const archH = size * 0.34;
  const bodyW = size * 0.76;
  const bodyH = size * 0.5;
  return (
    <View style={[{width: size, height: size, alignItems: 'center', justifyContent: 'flex-end'}, style]}>
      <View style={{
        width: archW,
        height: archH,
        borderTopWidth: 1.5,
        borderLeftWidth: 1.5,
        borderRightWidth: 1.5,
        borderBottomWidth: 0,
        borderColor: color,
        borderTopLeftRadius: archW / 2,
        borderTopRightRadius: archW / 2,
      }} />
      <View style={{
        width: bodyW,
        height: bodyH,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: size * 0.1,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <View style={{
          width: size * 0.18,
          height: size * 0.18,
          borderRadius: size * 0.09,
          borderWidth: 1.5,
          borderColor: color,
        }} />
      </View>
    </View>
  );
};

export const LockCheckIcon: React.FC<Props> = ({size = 20, color = '#9CA4B0', style}) => (
  <LockIcon size={size} color={color} style={style} />
);

export const EyeIcon: React.FC<Props> = ({size = 20, color = '#9CA4B0', style}) => {
  const eyeW = size;
  const arcH = size * 0.28;
  // Radius of the arc circle so it passes through both tips and the peak
  const R = ((eyeW / 2) ** 2 + arcH ** 2) / (2 * arcH);
  const dia = R * 2;
  const circleLeft = (eyeW - dia) / 2;

  return (
    <View style={[{width: size, height: size, alignItems: 'center', justifyContent: 'center'}, style]}>
      <View style={{width: eyeW, height: arcH * 2}}>
        {/* Top arc: clip large circle to show only the upper cap */}
        <View style={{width: eyeW, height: arcH, overflow: 'hidden'}}>
          <View style={{
            position: 'absolute',
            top: 0,
            left: circleLeft,
            width: dia,
            height: dia,
            borderRadius: R,
            borderWidth: 1.5,
            borderColor: color,
          }} />
        </View>
        {/* Bottom arc: clip large circle to show only the lower cap */}
        <View style={{width: eyeW, height: arcH, overflow: 'hidden'}}>
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: circleLeft,
            width: dia,
            height: dia,
            borderRadius: R,
            borderWidth: 1.5,
            borderColor: color,
          }} />
        </View>
        {/* Pupil */}
        <View style={{
          position: 'absolute',
          top: arcH - size * 0.13,
          left: eyeW / 2 - size * 0.13,
          width: size * 0.26,
          height: size * 0.26,
          borderRadius: size * 0.13,
          backgroundColor: color,
        }} />
      </View>
    </View>
  );
};

export const BellIcon: React.FC<{size?: number; color?: string; style?: ViewStyle}> = ({
  size = 24,
  color = '#1A1A1A',
  style,
}) => (
  <View style={[{width: size, height: size}, style]}>
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6" />
    </Svg>
  </View>
);

export const BoxIcon: React.FC<Props> = ({size = 16, color = '#1A1A1A', style}) => (
  <View style={[{width: size, height: size}, style]}>
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2zm3.564 1.426L5.596 5 8 5.961 14.154 3.5zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z" />
    </Svg>
  </View>
);

export const CalendarIcon: React.FC<Props> = ({size = 16, color = '#1A1A1A', style}) => (
  <View style={[{width: size, height: size}, style]}>
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" />
    </Svg>
  </View>
);

export const MapPinIcon: React.FC<Props> = ({size = 16, color = '#1A1A1A', style}) => (
  <View style={[{width: size, height: size}, style]}>
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
    </Svg>
  </View>
);

export const EyeOffIcon: React.FC<Props> = ({size = 20, color = '#9CA4B0', style}) => {
  const eyeW = size;
  const arcH = size * 0.28;
  const R = ((eyeW / 2) ** 2 + arcH ** 2) / (2 * arcH);
  const dia = R * 2;
  const circleLeft = (eyeW - dia) / 2;

  return (
    <View style={[{width: size, height: size, alignItems: 'center', justifyContent: 'center'}, style]}>
      <View style={{width: eyeW, height: arcH * 2}}>
        {/* Top arc */}
        <View style={{width: eyeW, height: arcH, overflow: 'hidden'}}>
          <View style={{
            position: 'absolute',
            top: 0,
            left: circleLeft,
            width: dia,
            height: dia,
            borderRadius: R,
            borderWidth: 1.5,
            borderColor: color,
          }} />
        </View>
        {/* Bottom arc */}
        <View style={{width: eyeW, height: arcH, overflow: 'hidden'}}>
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: circleLeft,
            width: dia,
            height: dia,
            borderRadius: R,
            borderWidth: 1.5,
            borderColor: color,
          }} />
        </View>
        {/* Pupil */}
        <View style={{
          position: 'absolute',
          top: arcH - size * 0.13,
          left: eyeW / 2 - size * 0.13,
          width: size * 0.26,
          height: size * 0.26,
          borderRadius: size * 0.13,
          backgroundColor: color,
        }} />
        {/* Diagonal slash */}
        <View style={{
          position: 'absolute',
          top: arcH - 0.75,
          left: 0,
          width: eyeW,
          height: 1.5,
          backgroundColor: color,
          transform: [{rotate: '-30deg'}],
        }} />
      </View>
    </View>
  );
};
