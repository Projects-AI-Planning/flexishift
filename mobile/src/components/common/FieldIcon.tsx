import React from 'react';
import {View, ViewStyle} from 'react-native';

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
