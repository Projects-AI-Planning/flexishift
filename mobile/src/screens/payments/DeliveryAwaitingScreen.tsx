import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface DeliveryAwaitingScreenProps {
  jobReference?: string;
  amount?: number;
  currency?: string;
}

const DeliveryAwaitingScreen: React.FC<DeliveryAwaitingScreenProps> = ({
  jobReference,
  amount,
  currency,
}) => {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const spinVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1.6,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 1,
            duration: 1000,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

    const spin = Animated.loop(
      Animated.timing(spinVal, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const p1 = createPulse(pulse1, 0);
    const p2 = createPulse(pulse2, 350);
    const p3 = createPulse(pulse3, 700);

    p1.start();
    p2.start();
    p3.start();
    spin.start();

    return () => {
      p1.stop();
      p2.stop();
      p3.stop();
      spin.stop();
    };
  }, [pulse1, pulse2, pulse3, spinVal]);

  const spinInterpolate = spinVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fmtAmount = (amt?: number, cur?: string) => {
    if (!amt) {return '';}
    const sym = cur ?? '';
    return `${sym} ${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Animated pulse rings */}
        <View style={styles.pulseWrap}>
          <Animated.View style={[styles.ring, styles.ring3, {transform: [{scale: pulse3}]}]} />
          <Animated.View style={[styles.ring, styles.ring2, {transform: [{scale: pulse2}]}]} />
          <Animated.View style={[styles.ring, styles.ring1, {transform: [{scale: pulse1}]}]} />

          {/* Spinning arc */}
          <Animated.View style={[styles.spinArc, {transform: [{rotate: spinInterpolate}]}]} />

          {/* Centre icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>⏳</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Awaiting Haulier Approval</Text>
        <Text style={styles.subtitle}>
          Your delivery report has been submitted.{'\n'}
          Waiting for the haulier to confirm and release payment.
        </Text>

        {/* Job info pill */}
        {jobReference ? (
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>JOB REF</Text>
            <Text style={styles.pillValue}>{jobReference}</Text>
          </View>
        ) : null}

        {/* Amount */}
        {amount ? (
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Your Earnings</Text>
            <Text style={styles.amountValue}>{fmtAmount(amount, currency)}</Text>
            <Text style={styles.amountNote}>Released once haulier confirms</Text>
          </View>
        ) : null}

        {/* Steps */}
        <View style={styles.stepsCard}>
          <StepRow done icon="✓" label="Delivery report submitted" />
          <StepConnector />
          <StepRow active icon="…" label="Haulier reviewing & releasing payment" />
          <StepConnector />
          <StepRow icon="💳" label="Payment released to you" />
        </View>

        <Text style={styles.hint}>
          You'll be notified automatically when payment is released.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const StepRow = ({done, active, icon, label}: {done?: boolean; active?: boolean; icon: string; label: string}) => (
  <View style={stepStyles.row}>
    <View style={[stepStyles.dot,
      done   && stepStyles.dotDone,
      active && stepStyles.dotActive,
    ]}>
      <Text style={stepStyles.dotText}>{icon}</Text>
    </View>
    <Text style={[stepStyles.label,
      done   && stepStyles.labelDone,
      active && stepStyles.labelActive,
    ]}>{label}</Text>
  </View>
);

const StepConnector = () => <View style={stepStyles.connector} />;

const stepStyles = StyleSheet.create({
  row:         {flexDirection: 'row', alignItems: 'center', gap: 12},
  dot:         {width: 26, height: 26, borderRadius: 13, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center'},
  dotDone:     {backgroundColor: '#16A34A'},
  dotActive:   {backgroundColor: colors.accent},
  dotText:     {fontSize: 11, fontWeight: '900', color: '#fff'},
  label:       {flex: 1, fontSize: 13, fontWeight: '700', color: '#94A3B8'},
  labelDone:   {color: '#16A34A'},
  labelActive: {color: colors.navy},
  connector:   {width: 2, height: 14, backgroundColor: '#E5E7EB', marginLeft: 12},
});

const styles = StyleSheet.create({
  safe:      {flex: 1, backgroundColor: colors.bg},
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    gap: 20,
  },

  // Pulse
  pulseWrap: {
    width: 130, height: 130,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
  },
  ring1: {
    width: 80, height: 80,
    backgroundColor: `${colors.accent}22`,
  },
  ring2: {
    width: 100, height: 100,
    backgroundColor: `${colors.accent}14`,
  },
  ring3: {
    width: 120, height: 120,
    backgroundColor: `${colors.accent}0A`,
  },
  spinArc: {
    position: 'absolute',
    width: 76, height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: colors.accent,
  },
  iconCircle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.navy,
    justifyContent: 'center', alignItems: 'center',
  },
  iconText: {fontSize: 22},

  // Text
  title: {
    color: colors.navy,
    fontSize: 22, fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 14, lineHeight: 22,
    textAlign: 'center',
  },

  // Pill
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.pill,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  pillLabel: {color: '#1066B1', fontSize: 10, fontWeight: '900', letterSpacing: 0.5},
  pillValue: {color: '#1066B1', fontSize: 13, fontWeight: '900'},

  // Amount
  amountBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: '#BBF7D0',
    paddingHorizontal: 32, paddingVertical: 16,
    alignItems: 'center', gap: 4,
  },
  amountLabel: {color: '#15803D', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5},
  amountValue: {color: '#166534', fontSize: 28, fontWeight: '900'},
  amountNote:  {color: '#22C55E', fontSize: 12, fontWeight: '600'},

  // Steps
  stepsCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl,
    alignSelf: 'stretch',
    gap: 0,
  },

  hint: {
    color: '#94A3B8',
    fontSize: 12, fontWeight: '600',
    textAlign: 'center',
  },
});

export default DeliveryAwaitingScreen;
