import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import {MailIcon, LockIcon} from '../../components/common/FieldIcon';
import AppInput from '../../components/common/AppInput';
import {colors, fonts, radius, shadow, spacing} from '../../theme';

interface LoginScreenProps {
  loginForm: any;
  setLoginForm: (form: any) => void;
  handleLogin: () => void;
  authLoading: boolean;
  authError: string | null;
  setAuthMode: (mode: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  loginForm,
  setLoginForm,
  handleLogin,
  authLoading,
  authError,
  setAuthMode,
}) => {
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
            <View style={styles.hero}>
              <View style={styles.logoMark}>
                <Text style={styles.logoIcon}>{'\uD83D\uDE9A'}</Text>
              </View>
              <Text style={styles.brandKicker}>Driver Portal</Text>
              <Text style={styles.brand}>FlexiShift</Text>
              <Text style={styles.tagline}>
                Secure access for drivers, dispatch, and delivery operations.
              </Text>
            </View>

            {authError ? (
              <View style={styles.errorBanner}>
                <View style={styles.errorDot}>
                  <Text style={styles.errorDotText}>!</Text>
                </View>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            ) : null}

            <View style={styles.formCard}>
              <AppInput
                label="Email Address"
                leftIcon={<MailIcon size={20} color="#9CA4B0" />}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                onChangeText={email =>
                  setLoginForm((current: any) => ({...current, email}))
                }
                placeholder="driver.77@flexishift.com"
                value={loginForm.email}
                containerStyle={styles.inputGroup}
              />

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Password</Text>
                  <Pressable onPress={() => setAuthMode('forgot')}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </Pressable>
                </View>
                <AppInput
                  leftIcon={<LockIcon size={20} color="#9CA4B0" />}
                  onChangeText={password =>
                    setLoginForm((current: any) => ({...current, password}))
                  }
                  placeholder="••••••••••"
                  secureTextEntry
                  value={loginForm.password}
                  containerStyle={{marginBottom: 0}}
                />
              </View>

              <Pressable onPress={handleLogin} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {authLoading ? 'Logging in...' : 'Login'}
                  {'  '}
                  {'\u21AA'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Pressable onPress={() => setAuthMode('register')}>
                <Text style={styles.footerLink}>Create Account</Text>
              </Pressable>
            </View>

            <View style={styles.bottomBar}>
              <Text style={styles.bottomCopy}>
                © 2026 FlexiShift Systems. All rights reserved.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
    overflow: 'hidden',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  logoMark: {
    width: 104,
    height: 104,
    borderRadius: 28,
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
  logoIcon: {
    color: colors.card,
    fontSize: 46,
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
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  tagline: {
    color: '#4F5560',
    fontSize: 17,
    marginTop: 10,
    maxWidth: 280,
    textAlign: 'center',
    lineHeight: 24,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorDotText: {
    color: colors.card,
    fontSize: 22,
    fontWeight: '900',
    marginTop: -2,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 16,
    lineHeight: 22,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.navy,
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  forgotText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#D6DCE5',
    borderRadius: 18,
    minHeight: 66,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#F8FAFD',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: colors.ink,
    paddingVertical: 0,
  },
  inputError: {
    borderColor: colors.danger,
  },
  primaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 18,
    minHeight: 66,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 22,
    fontWeight: '900',
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
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  bottomCopy: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
});

export default LoginScreen;
