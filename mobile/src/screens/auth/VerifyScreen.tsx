import React, {useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';
import Icon from '../../components/common/Icon';

interface VerifyScreenProps {
  verifyForm: {email: string; otp: string};
  setVerifyForm: (updater: (prev: any) => any) => void;
  handleVerify: () => void;
  handleResendOtp: () => void;
  authLoading: boolean;
  authError: string | null;
  setAuthMode: (mode: any) => void;
}

const OTP_LENGTH = 6;

const VerifyScreen: React.FC<VerifyScreenProps> = ({
  verifyForm,
  setVerifyForm,
  handleVerify,
  handleResendOtp,
  authLoading,
  authError,
  setAuthMode,
}) => {
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));

  const handleDigitChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    const otp = next.join('');
    setVerifyForm((prev: any) => ({...prev, otp}));
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onVerify = () => {
    handleVerify();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable onPress={() => setAuthMode('register')} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Icon name="mail" size={32} color="#0B1320" strokeWidth={1.8} />
          <View style={styles.iconDot} />
        </View>

        <Text style={styles.subtitle}>
          {'We\'ve sent a 6-digit code to your email '}
          <Text style={styles.emailHighlight}>{verifyForm.email}</Text>
          {'. Please enter it below to verify your account.'}
        </Text>

        {/* Error */}
        {authError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {Array(OTP_LENGTH).fill(null).map((_, i) => (
            <TextInput
              key={i}
              ref={ref => {inputs.current[i] = ref;}}
              style={[
                styles.otpBox,
                otpDigits[i] ? styles.otpBoxFilled : null,
              ]}
              value={otpDigits[i]}
              onChangeText={text => handleDigitChange(text, i)}
              onKeyPress={({nativeEvent}) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
              caretHidden
            />
          ))}
        </View>

        {/* Verify button */}
        <Pressable
          onPress={onVerify}
          disabled={authLoading || otpDigits.join('').length < OTP_LENGTH}
          style={[
            styles.verifyBtn,
            (authLoading || otpDigits.join('').length < OTP_LENGTH) && styles.verifyBtnDisabled,
          ]}>
          <Text style={styles.verifyBtnText}>
            {authLoading ? 'Verifying...' : 'Verify & Continue  →'}
          </Text>
        </Pressable>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive the code? </Text>
          <Pressable onPress={handleResendOtp} disabled={authLoading}>
            <Text style={styles.resendLink}>Resend Code</Text>
          </Pressable>
        </View>

      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.bg},
  flex: {flex: 1},
  scrollContent: {paddingBottom: 40},
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.sm,
  },
  backText: {color: colors.navy, fontSize: 16, fontWeight: '800'},
  content: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.xl, marginTop: spacing.sm,
    borderRadius: radius.xl, padding: spacing.xxl,
    shadowColor: '#0B1320', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },

  // Icon
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E8F1FA', alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, position: 'relative',
  },
  iconDot: {
    position: 'absolute', top: 10, right: 10,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.danger, borderWidth: 2, borderColor: '#fff',
  },

  // Text
  title: {color: colors.navy, fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 12},
  subtitle: {color: colors.inkSoft, fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24},
  emailHighlight: {color: colors.accent, fontWeight: '700'},

  // Error
  errorBox: {
    backgroundColor: '#FFF1EF', borderColor: '#F3B4B0', borderWidth: 1,
    borderRadius: radius.md, padding: spacing.md, marginBottom: 16,
  },
  errorText: {color: colors.danger, fontSize: 13, fontWeight: '700', textAlign: 'center'},

  // OTP boxes
  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    gap: 8, marginBottom: 28,
  },
  otpBox: {
    flex: 1, height: 60, borderWidth: 1.5, borderColor: '#C9D0DB',
    borderRadius: radius.md, fontSize: 22, fontWeight: '900',
    color: colors.navy, backgroundColor: '#FAFBFD', textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.accent, backgroundColor: '#EAF3FD',
  },

  // Verify button
  verifyBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    minHeight: 58, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  verifyBtnDisabled: {opacity: 0.5},
  verifyBtnText: {color: '#fff', fontSize: 17, fontWeight: '800'},

  // Resend
  resendRow: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center'},
  resendLabel: {color: colors.inkSoft, fontSize: 14},
  resendLink: {color: colors.accent, fontSize: 14, fontWeight: '800'},

});

export default VerifyScreen;
