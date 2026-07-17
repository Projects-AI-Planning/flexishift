import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {MailIcon} from '../../components/common/FieldIcon';
import AppInput from '../../components/common/AppInput';
import {colors, radius, shadow, spacing} from '../../theme';

interface ForgotPasswordScreenProps {
  authLoading: boolean;
  authError: string | null;
  onSendCode: (email: string) => void;
  onBack: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  authLoading,
  authError,
  onSendCode,
  onBack,
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    onSendCode(email.trim());
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.background}>

            <View style={styles.topBar}>
              <Pressable onPress={onBack} style={styles.backBtn}>
                <Text style={styles.backIcon}>{'←'}</Text>
              </Pressable>
            </View>

            <View style={styles.hero}>
              <View style={styles.logoMark}>
                <LockKeyIcon />
              </View>
              <Text style={styles.brandKicker}>Account Recovery</Text>
              <Text style={styles.brand}>Forgot Password?</Text>
              <Text style={styles.tagline}>
                Enter your registered email and we'll send you a one-time password to reset your account.
              </Text>
            </View>

            {(authError || emailError) ? (
              <View style={styles.errorBanner}>
                <View style={styles.errorDot}>
                  <Text style={styles.errorDotText}>!</Text>
                </View>
                <Text style={styles.errorText}>{authError || emailError}</Text>
              </View>
            ) : null}

            <View style={styles.formCard}>
              <AppInput
                label="Email Address"
                leftIcon={<MailIcon size={20} color="#9CA4B0" />}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={v => {
                  setEmail(v);
                  if (emailError) {setEmailError('');}
                }}
                placeholder="driver.77@flexishift.com"
                value={email}
                error={emailError || undefined}
                containerStyle={styles.inputGroup}
              />

              <Pressable
                onPress={handleSubmit}
                disabled={authLoading}
                style={[styles.primaryButton, authLoading && styles.primaryButtonDisabled]}>
                <Text style={styles.primaryButtonText}>
                  {authLoading ? 'Sending OTP...' : 'Resend OTP'}
                  {'  '}{'↪'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.noteRow}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>
                OTP expires in 10 minutes. Check spam if you don't see it.
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Remembered your password? </Text>
              <Pressable onPress={onBack}>
                <Text style={styles.footerLink}>Back to Login</Text>
              </Pressable>
            </View>

            <View style={styles.bottomBar}>
              <Text style={styles.bottomCopy}>
                © 2026 FreightFlow Systems. All rights reserved.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const LockKeyIcon = () => (
  <View style={{width: 48, height: 48, alignItems: 'center', justifyContent: 'center'}}>
    {/* Shackle arch */}
    <View style={{
      position: 'absolute', top: 0, left: 10, right: 10, height: 24,
      borderTopWidth: 4, borderLeftWidth: 4, borderRightWidth: 4,
      borderColor: '#FFFFFF', borderTopLeftRadius: 14, borderTopRightRadius: 14,
    }} />
    {/* Lock body */}
    <View style={{
      position: 'absolute', bottom: 0, left: 4, right: 4, height: 26,
      backgroundColor: '#FFFFFF', borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Keyhole circle */}
      <View style={{
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: colors.navy, marginBottom: 2,
      }} />
      {/* Keyhole stem */}
      <View style={{width: 3, height: 5, backgroundColor: colors.navy, marginTop: -3}} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  background: {
    flexGrow: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: colors.navy,
    fontSize: 26,
    fontWeight: '800',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  logoMark: {
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 4,
  },
  brandKicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  brand: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  tagline: {
    color: '#4F5560',
    fontSize: 15,
    maxWidth: 300,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F3B4B0',
    backgroundColor: colors.dangerSoft,
    padding: spacing.lg,
  },
  errorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorDotText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: '900',
    marginTop: -1,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  formCard: {
    marginHorizontal: spacing.xl,
    borderRadius: 28,
    backgroundColor: colors.card,
    padding: spacing.xl,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#D6DCE5',
    borderRadius: 18,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#F8FAFD',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: colors.ink,
    paddingVertical: 0,
  },
  inputError: {
    borderColor: colors.danger,
  },
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: '#1066B1',
    borderRadius: 18,
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    gap: 10,
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  noteDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
    flexShrink: 0,
  },
  noteText: {
    flex: 1,
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  footerText: {
    color: '#5A606B',
    fontSize: 15,
  },
  footerLink: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '900',
  },
  bottomBar: {
    marginTop: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  bottomCopy: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
