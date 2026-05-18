import React, {useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {AccountIcon, MailIcon, PhoneIcon, LockIcon, LockCheckIcon} from '../../components/common/FieldIcon';
import AppInput from '../../components/common/AppInput';
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Brand Header */}
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandIcon}>⛟</Text>
          </View>
          <Text style={styles.brandName}>FLEXISHIFT</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.title}>Create Account</Text>
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
          <AppInput
            leftIcon={<AccountIcon size={20} color="#9CA4B0" />}
            autoCapitalize="words"
            onChangeText={update('name')}
            placeholder="Full Name"
            value={registerForm.name}
            error={fieldErrors.name}
            containerStyle={{marginBottom: 0}}
          />

          {/* Email Address */}
          <AppInput
            leftIcon={<MailIcon size={20} color="#9CA4B0" />}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={update('email')}
            placeholder="Email Address"
            value={registerForm.email}
            error={fieldErrors.email}
            containerStyle={{marginBottom: 0}}
          />

          {/* Phone Number */}
          <AppInput
            leftIcon={<PhoneIcon size={20} color="#9CA4B0" />}
            keyboardType="phone-pad"
            onChangeText={update('phone')}
            placeholder="Phone Number"
            value={registerForm.phone}
            error={fieldErrors.phone}
            containerStyle={{marginBottom: 0}}
          />

          {/* Password */}
          <AppInput
            leftIcon={<LockIcon size={20} color="#9CA4B0" />}
            onChangeText={update('password')}
            placeholder="Password"
            secureTextEntry
            value={registerForm.password}
            error={fieldErrors.password}
            containerStyle={{marginBottom: 0}}
          />

          {/* Confirm Password */}
          <View>
            <AppInput
              leftIcon={<LockCheckIcon size={20} color="#9CA4B0" />}
              onChangeText={handleConfirmChange}
              placeholder="Confirm Password"
              secureTextEntry
              value={confirmPassword}
              error={fieldErrors.confirmPassword}
              containerStyle={{marginBottom: 0}}
            />
            {!fieldErrors.confirmPassword && confirmPassword.length > 0 && confirmPassword === registerForm.password ? (
              <Text style={styles.matchText}>✓ Passwords match</Text>
            ) : null}
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
  safeArea: {flex: 1, backgroundColor: colors.bg},

  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: 16,
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
  fieldIcon: {marginRight: 10},
  input: {color: colors.ink, flex: 1, fontSize: 16, paddingVertical: 0},
  eyeBtn: {paddingLeft: 8},
  inlineError: {color: colors.danger, fontSize: 12, marginLeft: 4, marginTop: 4},
  inlineErrorTerms: {marginLeft: 34},
  matchText: {color: '#1066B1', fontSize: 12, marginLeft: 4, marginTop: 4, fontWeight: '700'},

  // Password strength
  strengthRow: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: -4,
  },
  strengthPill: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  strengthPillMet: {backgroundColor: '#DBEAFE', borderColor: '#93C5FD'},
  strengthPillText: {fontSize: 11, fontWeight: '700', color: '#94A3B8'},
  strengthPillTextMet: {color: '#1066B1'},

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
    marginTop: 12,
  },
  footerText: {color: colors.inkSoft, fontSize: 15},
  footerLink: {color: colors.accent, fontSize: 15, fontWeight: '800'},
});

export default RegisterScreen;
