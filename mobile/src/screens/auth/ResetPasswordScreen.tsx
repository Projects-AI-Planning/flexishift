import React, {useRef, useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppInput from '../../components/common/AppInput';
import {colors, radius, spacing} from '../../theme';

interface ResetPasswordScreenProps {
  email: string;
  authLoading: boolean;
  authError: string | null;
  onReset: (otp: string, newPassword: string) => void;
  onBack: () => void;
  onResend: () => void;
}

const OTP_LENGTH = 6;

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  email,
  authLoading,
  authError,
  onReset,
  onBack,
  onResend,
}) => {
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));

  const handleDigitChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const otp = otpDigits.join('');
    if (otp.length < OTP_LENGTH) {errs.otp = 'Enter all 6 digits';}
    if (newPassword.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(newPassword)) {
      errs.password = 'Password must contain an uppercase letter';
    } else if (!/\d/.test(newPassword)) {
      errs.password = 'Password must contain a number';
    }
    if (newPassword !== confirmPassword) {errs.confirm = 'Passwords do not match';}
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onReset(otpDigits.join(''), newPassword);
  };

  const otpComplete = otpDigits.join('').length === OTP_LENGTH;

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🔒</Text>
          </View>

          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{' '}
            <Text style={styles.emailHighlight}>{email}</Text>
            {', then set your new password.'}
          </Text>

          {authError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          ) : null}

          {/* OTP row */}
          <Text style={styles.sectionLabel}>Reset Code</Text>
          <View style={styles.otpRow}>
            {Array(OTP_LENGTH).fill(null).map((_, i) => (
              <TextInput
                key={i}
                ref={ref => {inputs.current[i] = ref;}}
                style={[styles.otpBox, otpDigits[i] ? styles.otpBoxFilled : null]}
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
          {errors.otp ? <Text style={styles.fieldError}>{errors.otp}</Text> : null}

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive it? </Text>
            <Pressable onPress={onResend} disabled={authLoading}>
              <Text style={styles.resendLink}>Resend Code</Text>
            </Pressable>
          </View>

          {/* New password */}
          <AppInput
            label="New Password"
            onChangeText={v => {
              setNewPassword(v);
              if (errors.password) {setErrors(p => ({...p, password: ''}));}
            }}
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            secureTextEntry
            value={newPassword}
            error={errors.password}
          />

          <AppInput
            label="Confirm Password"
            onChangeText={v => {
              setConfirmPassword(v);
              if (errors.confirm) {setErrors(p => ({...p, confirm: ''}));}
            }}
            placeholder="Re-enter your password"
            secureTextEntry
            value={confirmPassword}
            error={errors.confirm}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={authLoading || !otpComplete}
            style={[styles.resetBtn, (authLoading || !otpComplete) && styles.resetBtnDisabled]}>
            <Text style={styles.resetBtnText}>
              {authLoading ? 'Resetting...' : 'Reset Password →'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},
  backBtn: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.sm,
  },
  backText: {color: colors.navy, fontSize: 16, fontWeight: '800'},
  scroll: {paddingBottom: 40},
  content: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.xl, marginTop: spacing.sm,
    borderRadius: radius.xl, padding: spacing.xxl,
    shadowColor: '#0B1320', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EEF5FB', alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  iconText: {fontSize: 32},
  title: {
    color: colors.navy, fontSize: 26, fontWeight: '900',
    textAlign: 'center', marginBottom: 12,
  },
  subtitle: {
    color: colors.inkSoft, fontSize: 14, lineHeight: 22,
    textAlign: 'center', marginBottom: 24,
  },
  emailHighlight: {color: colors.accent, fontWeight: '700'},
  errorBox: {
    backgroundColor: '#FFF1EF', borderColor: '#F3B4B0', borderWidth: 1,
    borderRadius: radius.md, padding: spacing.md, marginBottom: 16,
  },
  errorText: {color: colors.danger, fontSize: 13, fontWeight: '700', textAlign: 'center'},
  sectionLabel: {
    color: colors.navy, fontSize: 12, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8,
  },
  otpBox: {
    flex: 1, height: 56, borderWidth: 1.5, borderColor: '#C9D0DB',
    borderRadius: radius.md, fontSize: 22, fontWeight: '900',
    color: colors.navy, backgroundColor: '#FAFBFD',
  },
  otpBoxFilled: {borderColor: '#C2410C', backgroundColor: '#FFF7ED'},
  resendRow: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    marginBottom: 20,
  },
  resendLabel: {color: colors.inkSoft, fontSize: 13},
  resendLink: {color: colors.accent, fontSize: 13, fontWeight: '800'},
  fieldWrap: {marginBottom: 16},
  pwRow: {flexDirection: 'row', alignItems: 'center'},
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#C9D0DB',
    borderRadius: radius.md, minHeight: 54,
    paddingHorizontal: spacing.md, fontSize: 15,
    color: colors.ink, backgroundColor: '#FAFBFD',
  },
  inputError: {borderColor: colors.danger},
  eyeBtn: {
    position: 'absolute', right: 14, height: 54,
    justifyContent: 'center',
  },
  eyeText: {fontSize: 18},
  fieldError: {color: colors.danger, fontSize: 12, marginTop: 4, fontWeight: '700'},
  resetBtn: {
    backgroundColor: '#1066B1', borderRadius: radius.lg,
    minHeight: 56, justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  resetBtnDisabled: {opacity: 0.5},
  resetBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '900'},
});

export default ResetPasswordScreen;
