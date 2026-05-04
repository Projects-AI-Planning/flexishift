import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {colors, radius, shadow, spacing} from '../../theme';

interface LoginScreenProps {
  loginForm: any;
  setLoginForm: (form: any) => void;
  handleLogin: () => void;
  authLoading: boolean;
  authError: string | null;
  setAuthMode: (mode: any) => void;
  onBackToSplash: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  loginForm,
  setLoginForm,
  handleLogin,
  authLoading,
  authError,
  setAuthMode,
  onBackToSplash,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.background}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
        <View style={styles.topBar}>
          <Pressable onPress={onBackToSplash} style={styles.backBtn}>
            <Text style={styles.backIcon}>{'\u2190'}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Text style={styles.logoIcon}>{'\uD83D\uDE9A'}</Text>
          </View>
          <Text style={styles.brandKicker}>Driver Portal</Text>
          <Text style={styles.brand}>FreightFlex</Text>
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
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={email =>
                setLoginForm((current: any) => ({...current, email}))
              }
              placeholder="driver.77@freightflex.com"
              placeholderTextColor="#9AA4B2"
              style={[styles.input, authError ? styles.inputError : null]}
              value={loginForm.email}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <Pressable onPress={() => setAuthMode('forgot')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            </View>
            <TextInput
              onChangeText={password =>
                setLoginForm((current: any) => ({...current, password}))
              }
              placeholder="••••••••••"
              placeholderTextColor="#9AA4B2"
              secureTextEntry
              style={[styles.input, authError ? styles.inputError : null]}
              value={loginForm.password}
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
          <Text style={styles.footerText}>Need help? </Text>
          <Pressable>
            <Text style={styles.footerLink}>Contact Support</Text>
          </Pressable>
        </View>

        <View style={styles.bottomBar}>
          <Text style={styles.bottomCopy}>
            © 2024 FreightFlow Systems. All rights reserved.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  background: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(223, 166, 34, 0.18)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 80,
    left: -90,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(16, 34, 53, 0.08)',
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
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  forgotText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    borderWidth: 3,
    borderColor: '#D6DCE5',
    borderRadius: 18,
    minHeight: 66,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    color: colors.ink,
    backgroundColor: '#F8FAFD',
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
    textDecorationLine: 'underline',
  },
  bottomBar: {
    marginTop: 'auto',
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
