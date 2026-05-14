import React, {useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface RegisterScreenProps {
  registerForm: {email: string; name: string; password: string; phone: string};
  setRegisterForm: (updater: (prev: any) => any) => void;
  handleRegister: () => void;
  authLoading: boolean;
  authError: string | null;
  setAuthMode: (mode: any) => void;
  onViewTerms: () => void;
  onViewPrivacy: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(
  form: {email: string; name: string; password: string; phone: string},
  confirmPassword: string,
  agreed: boolean,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.name.trim() || form.name.trim().length < 2) {
    e.name = 'Full name must be at least 2 characters.';
  }
  if (!EMAIL_RE.test(form.email.trim())) {
    e.email = 'Enter a valid email address.';
  }
  if (form.phone.replace(/\D/g, '').length < 10) {
    e.phone = 'Enter a valid phone number (min 10 digits).';
  }
  if (form.password.length < 8) {
    e.password = 'Password must be at least 8 characters.';
  } else if (!/[A-Z]/.test(form.password)) {
    e.password = 'Password must contain at least one uppercase letter.';
  } else if (!/\d/.test(form.password)) {
    e.password = 'Password must contain at least one number.';
  }
  if (!confirmPassword) {
    e.confirmPassword = 'Please confirm your password.';
  } else if (confirmPassword !== form.password) {
    e.confirmPassword = 'Passwords do not match.';
  }
  if (!agreed) {
    e.terms = 'You must agree to the Terms of Service and Privacy Policy.';
  }
  return e;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({
  registerForm,
  setRegisterForm,
  handleRegister,
  authLoading,
  authError,
  setAuthMode,
  onViewTerms,
  onViewPrivacy,
}) => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const clearErr = (field: string) =>
    setFieldErrors(prev => {
      const next = {...prev};
      delete next[field];
      return next;
    });

  const update = (field: string) => (value: string) => {
    setRegisterForm((prev: any) => ({...prev, [field]: value}));
    clearErr(field);
  };

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    clearErr('confirmPassword');
  };

  const onSubmit = () => {
    const errs = validate(registerForm, confirmPassword, agreedToTerms);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    handleRegister();
  };

  const toggleTerms = () => {
    setAgreedToTerms(p => !p);
    clearErr('terms');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Back button — fixed at top */}
      <Pressable onPress={() => setAuthMode('login')} style={styles.backBtn}>
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Brand Header */}
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandIcon}>⛟</Text>
          </View>
          <Text style={styles.brandName}>FREIGHTFLEX</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.subtitle}>
            Start managing your logistics pipeline today.
          </Text>
        </View>

        {/* API Error Banner */}
        {authError ? (
          <View style={styles.apiErrorBox}>
            <View style={styles.apiErrorDot}>
              <Text style={styles.apiErrorDotText}>!</Text>
            </View>
            <Text style={styles.apiErrorText}>{authError}</Text>
          </View>
        ) : null}

        {/* Form Fields */}
        <View style={styles.form}>

          {/* Full Name */}
          <View>
            <View style={[styles.fieldWrap, fieldErrors.name ? styles.fieldWrapError : null]}>
              <Text style={styles.fieldIcon}>👤</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={update('name')}
                placeholder="Full Name"
                placeholderTextColor="#9CA4B0"
                style={styles.input}
                value={registerForm.name}
              />
            </View>
            {fieldErrors.name ? <Text style={styles.inlineError}>{fieldErrors.name}</Text> : null}
          </View>

          {/* Email Address */}
          <View>
            <View style={[styles.fieldWrap, fieldErrors.email ? styles.fieldWrapError : null]}>
              <Text style={styles.fieldIcon}>📧</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={update('email')}
                placeholder="Email Address"
                placeholderTextColor="#9CA4B0"
                style={styles.input}
                value={registerForm.email}
              />
            </View>
            {fieldErrors.email ? <Text style={styles.inlineError}>{fieldErrors.email}</Text> : null}
          </View>

          {/* Phone Number */}
          <View>
            <View style={[styles.fieldWrap, fieldErrors.phone ? styles.fieldWrapError : null]}>
              <Text style={styles.fieldIcon}>☎</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={update('phone')}
                placeholder="Phone Number"
                placeholderTextColor="#9CA4B0"
                style={styles.input}
                value={registerForm.phone}
              />
            </View>
            {fieldErrors.phone ? <Text style={styles.inlineError}>{fieldErrors.phone}</Text> : null}
          </View>

          {/* Password */}
          <View>
            <View style={[styles.fieldWrap, fieldErrors.password ? styles.fieldWrapError : null]}>
              <Text style={styles.fieldIcon}>🔒</Text>
              <TextInput
                onChangeText={update('password')}
                placeholder="Password"
                placeholderTextColor="#9CA4B0"
                secureTextEntry={!showPassword}
                style={styles.input}
                value={registerForm.password}
              />
              <Pressable hitSlop={8} onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>
            {fieldErrors.password ? (
              <Text style={styles.inlineError}>{fieldErrors.password}</Text>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View>
            <View style={[styles.fieldWrap, fieldErrors.confirmPassword ? styles.fieldWrapError : null]}>
              <Text style={styles.fieldIcon}>🔐</Text>
              <TextInput
                onChangeText={handleConfirmChange}
                placeholder="Confirm Password"
                placeholderTextColor="#9CA4B0"
                secureTextEntry={!showConfirm}
                style={styles.input}
                value={confirmPassword}
              />
              <Pressable hitSlop={8} onPress={() => setShowConfirm(p => !p)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>
            {fieldErrors.confirmPassword ? (
              <Text style={styles.inlineError}>{fieldErrors.confirmPassword}</Text>
            ) : (
              confirmPassword.length > 0 && confirmPassword === registerForm.password ? (
                <Text style={styles.matchText}>✓ Passwords match</Text>
              ) : null
            )}
          </View>

          {/* Password strength hint */}
          {registerForm.password.length > 0 && (
            <View style={styles.strengthRow}>
              {['8+ chars', 'Uppercase', 'Number'].map((rule, i) => {
                const met =
                  i === 0 ? registerForm.password.length >= 8 :
                  i === 1 ? /[A-Z]/.test(registerForm.password) :
                  /\d/.test(registerForm.password);
                return (
                  <View key={rule} style={[styles.strengthPill, met && styles.strengthPillMet]}>
                    <Text style={[styles.strengthPillText, met && styles.strengthPillTextMet]}>
                      {met ? '✓ ' : ''}{rule}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Terms of Service */}
          <View style={styles.termsBlock}>
            <Pressable
              hitSlop={6}
              onPress={toggleTerms}
              style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms ? <Text style={styles.checkmark}>✓</Text> : null}
            </Pressable>
            <Text style={styles.termsText}>
              {'I agree to the '}
              <Text style={styles.termsLink} onPress={onViewTerms}>
                Terms of Service
              </Text>
              {' and '}
              <Text style={styles.termsLink} onPress={onViewPrivacy}>
                Privacy Policy
              </Text>
              {'.'}
            </Text>
          </View>
          {fieldErrors.terms ? (
            <Text style={[styles.inlineError, styles.inlineErrorTerms]}>
              {fieldErrors.terms}
            </Text>
          ) : null}

          {/* Sign Up Button */}
          <Pressable
            disabled={authLoading}
            onPress={onSubmit}
            style={[styles.signUpBtn, authLoading && styles.signUpBtnDisabled]}>
            <Text style={styles.signUpBtnText}>
              {authLoading ? 'Creating Account...' : 'Sign Up  →'}
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => setAuthMode('login')}>
            <Text style={styles.footerLink}>Login here</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#FFFFFF'},

  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backArrow: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  backText: {color: colors.navy, fontSize: 15, fontWeight: '800'},

  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: 48,
  },

  // Brand
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  brandBadge: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  brandIcon: {color: '#fff', fontSize: 16},
  brandName: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Hero
  hero: {marginBottom: 24},
  title: {color: colors.ink, fontSize: 30, fontWeight: '400', letterSpacing: -0.3},
  subtitle: {color: '#525863', fontSize: 16, lineHeight: 24, marginTop: 8},

  // API Error
  apiErrorBox: {
    alignItems: 'center',
    backgroundColor: '#FFF1EF',
    borderColor: '#F3B4B0',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: 20,
    padding: spacing.lg,
  },
  apiErrorDot: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 18,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  apiErrorDotText: {color: '#fff', fontSize: 16, fontWeight: '900'},
  apiErrorText: {color: colors.danger, flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20},

  // Form
  form: {gap: 12},
  fieldWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D0DB',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  fieldWrapError: {borderColor: colors.danger},
  fieldIcon: {fontSize: 16, marginRight: 10, textAlign: 'center', width: 24},
  input: {color: colors.ink, flex: 1, fontSize: 16, paddingVertical: 0},
  eyeBtn: {paddingLeft: 8},
  eyeIcon: {fontSize: 15, color: '#6E7685'},
  inlineError: {color: colors.danger, fontSize: 12, marginLeft: 4, marginTop: 4},
  inlineErrorTerms: {marginLeft: 34},
  matchText: {color: '#15803D', fontSize: 12, marginLeft: 4, marginTop: 4, fontWeight: '700'},

  // Password strength
  strengthRow: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: -4,
  },
  strengthPill: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  strengthPillMet: {backgroundColor: '#DCFCE7', borderColor: '#86EFAC'},
  strengthPillText: {fontSize: 11, fontWeight: '700', color: '#94A3B8'},
  strengthPillTextMet: {color: '#15803D'},

  // Terms
  termsBlock: {alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginTop: 4},
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#C9D0DB',
    borderRadius: 5,
    borderWidth: 1.5,
    flexShrink: 0,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxChecked: {backgroundColor: colors.accent, borderColor: colors.accent},
  checkmark: {color: '#fff', fontSize: 13, fontWeight: '900'},
  termsText: {color: '#525863', flex: 1, fontSize: 14, lineHeight: 21},
  termsLink: {color: colors.accent, fontWeight: '700'},

  // Sign Up
  signUpBtn: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    elevation: 4,
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 60,
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  signUpBtnDisabled: {opacity: 0.7},
  signUpBtnText: {color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3},

  // Footer
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {color: colors.inkSoft, fontSize: 15},
  footerLink: {color: colors.accent, fontSize: 15, fontWeight: '800'},
});

export default RegisterScreen;
