import React, {useState, useMemo} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {AccountIcon, MailIcon, PhoneIcon, LockIcon, LockCheckIcon, BoxIcon} from '../../components/common/FieldIcon';
import AppInput from '../../components/common/AppInput';
import {colors, radius, spacing} from '../../theme';
import {COUNTRIES, type Country} from '../../data/countries';

// ─── Country Picker Modal ────────────────────────────────────────────────────

function CountryPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: Country;
  onSelect: (c: Country) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q
      ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.includes(q))
      : COUNTRIES;
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.sheetHeader}>
            <Text style={ms.sheetTitle}>Select Your Country</Text>
            <Pressable onPress={onClose} hitSlop={8} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <View style={ms.searchWrap}>
            <TextInput
              style={ms.searchInput}
              placeholder="Search country..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.name}
            keyboardShouldPersistTaps="handled"
            renderItem={({item}) => (
              <Pressable
                style={[
                  ms.countryRow,
                  item.name === selected.name && ms.countryRowActive,
                ]}
                onPress={() => {onSelect(item); onClose(); setQuery('');}}>
                <Text style={ms.countryFlag}>{item.flag}</Text>
                <Text style={ms.countryName}>{item.name}</Text>
                <Text style={ms.countryCode}>{item.code}</Text>
                {item.name === selected.name && (
                  <Text style={ms.checkmark}>✓</Text>
                )}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={ms.sep} />}
            contentContainerStyle={{paddingBottom: 32}}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Form validation ──────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePhone(localNumber: string, country: Country): string | null {
  const digits = localNumber.replace(/\D/g, '');
  if (digits.length === 0) return 'Phone number is required.';
  if (digits.length < country.minDigits)
    return `Enter a valid ${country.name} number (${country.minDigits} digits after country code).`;
  if (digits.length > country.maxDigits)
    return `Number too long for ${country.name} (max ${country.maxDigits} digits).`;
  return null;
}

function validate(
  form: {email: string; name: string; password: string; phone: string; fSkatNumber?: string},
  localPhone: string,
  selectedCountry: Country,
  confirmPassword: string,
  agreed: boolean,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.name.trim() || form.name.trim().length < 2)
    e.name = 'Full name must be at least 2 characters.';
  if (!EMAIL_RE.test(form.email.trim()))
    e.email = 'Enter a valid email address.';
  const phoneErr = validatePhone(localPhone, selectedCountry);
  if (phoneErr) e.phone = phoneErr;
  if (form.password.length < 8)
    e.password = 'Password must be at least 8 characters.';
  else if (!/[A-Z]/.test(form.password))
    e.password = 'Password must contain at least one uppercase letter.';
  else if (!/\d/.test(form.password))
    e.password = 'Password must contain at least one number.';
  if (!confirmPassword)
    e.confirmPassword = 'Please confirm your password.';
  else if (confirmPassword !== form.password)
    e.confirmPassword = 'Passwords do not match.';
  if (!form.fSkatNumber?.trim())
    e.fSkatNumber = 'F-Skat number is required.';
  if (!agreed)
    e.terms = 'You must agree to the Terms of Service and Privacy Policy.';
  return e;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface RegisterScreenProps {
  registerForm: {email: string; name: string; password: string; phone: string; fSkatNumber?: string};
  setRegisterForm: (updater: (prev: any) => any) => void;
  handleRegister: () => void;
  authLoading: boolean;
  authError: string | null;
  setAuthMode: (mode: any) => void;
  onViewTerms: () => void;
  onViewPrivacy: () => void;
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
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [hasVat, setHasVat] = useState<'yes' | 'no' | ''>('');

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

  const handleLocalPhoneChange = (value: string) => {
    const sanitized = value.replace(/[^\d\s\-]/g, '');
    setLocalPhone(sanitized);
    const full = `${selectedCountry.code}${sanitized.replace(/\D/g, '')}`;
    setRegisterForm((prev: any) => ({...prev, phone: full}));
    clearErr('phone');
  };

  // Country selection drives phone dial code, country (ISO) and currency
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    const digits = localPhone.replace(/\D/g, '');
    const full = `${country.code}${digits}`;
    setRegisterForm((prev: any) => ({
      ...prev,
      phone: full,
      country: country.iso,
      currency: country.currency,
    }));
    clearErr('phone');
  };

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    clearErr('confirmPassword');
  };

  const onSubmit = () => {
    const errs = validate(registerForm, localPhone, selectedCountry, confirmPassword, agreedToTerms);
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

        <View style={styles.form}>

          {/* Full Name */}
          <View>
            <Text style={styles.fieldLabel}>Full Name <Text style={styles.requiredStar}>*</Text></Text>
            <AppInput
              leftIcon={<AccountIcon size={20} color="#9CA4B0" />}
              autoCapitalize="words"
              onChangeText={update('name')}
              placeholder="Full Name"
              value={registerForm.name}
              error={fieldErrors.name}
              containerStyle={{marginBottom: 0}}
            />
          </View>

          {/* Email Address */}
          <View>
            <Text style={styles.fieldLabel}>Email Address <Text style={styles.requiredStar}>*</Text></Text>
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
          </View>

          {/* ── Country Selector (dedicated field) ── */}
          <View>
            <Text style={styles.fieldLabel}>Country <Text style={styles.requiredStar}>*</Text></Text>
            <Pressable
              style={styles.countrySelector}
              onPress={() => setCountryPickerVisible(true)}>
              <Text style={styles.countrySelectorFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countrySelectorName}>{selectedCountry.name}</Text>
              <Text style={styles.countrySelectorCode}>{selectedCountry.code}</Text>
              <Text style={styles.countrySelectorChevron}>▾</Text>
            </Pressable>
          </View>

          {/* ── Phone Number (dial code auto-filled from country) ── */}
          <View>
            <Text style={styles.fieldLabel}>Phone Number <Text style={styles.requiredStar}>*</Text></Text>
            <View style={[styles.phoneRow, fieldErrors.phone ? styles.phoneRowError : null]}>
              <PhoneIcon size={20} color="#9CA4B0" />
              <View style={styles.dialCodeBadge}>
                <Text style={styles.dialCodeText}>{selectedCountry.code}</Text>
              </View>
              <View style={styles.phoneDivider} />
              <TextInput
                style={styles.phoneInput}
                keyboardType="phone-pad"
                onChangeText={handleLocalPhoneChange}
                placeholder={`Local number (${selectedCountry.minDigits} digits)`}
                placeholderTextColor="#9CA4B0"
                value={localPhone}
              />
            </View>
            {fieldErrors.phone ? (
              <Text style={styles.inlineError}>{fieldErrors.phone}</Text>
            ) : localPhone.replace(/\D/g, '').length > 0 ? (
              <Text style={styles.phonePreview}>
                Full: {selectedCountry.code}{localPhone.replace(/\D/g, '')}
              </Text>
            ) : null}
          </View>

          {/* Password */}
          <View>
            <Text style={styles.fieldLabel}>Password <Text style={styles.requiredStar}>*</Text></Text>
            <AppInput
              leftIcon={<LockIcon size={20} color="#9CA4B0" />}
              onChangeText={update('password')}
              placeholder="Password"
              secureTextEntry
              value={registerForm.password}
              error={fieldErrors.password}
              containerStyle={{marginBottom: 0}}
            />
          </View>

          {/* Confirm Password */}
          <View>
            <Text style={styles.fieldLabel}>Confirm Password <Text style={styles.requiredStar}>*</Text></Text>
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

          {/* Password strength */}
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

          {/* F-Skat Number */}
          <View>
            <Text style={styles.fieldLabel}>F-Skat Number <Text style={styles.requiredStar}>*</Text></Text>
            <AppInput
            leftIcon={<BoxIcon size={20} color="#9CA4B0" />}
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={update('fSkatNumber')}
            placeholder="F-Skat Number"
            value={registerForm.fSkatNumber ?? ''}
            error={fieldErrors.fSkatNumber}
            containerStyle={{marginBottom: 0}}
            />
          </View>

          {/* VAT Number question */}
          <View style={styles.vatCard}>
            <Text style={styles.vatQuestion}>Do you have a VAT number?</Text>
            <View style={styles.vatToggleRow}>
              <Text style={[styles.vatOptionText, hasVat !== 'yes' && styles.vatOptionTextActive]}>No</Text>
              <Switch
                value={hasVat === 'yes'}
                onValueChange={val => setHasVat(val ? 'yes' : 'no')}
                trackColor={{false: '#E2E8F0', true: '#1066B1'}}
                thumbColor="#ffffff"
              />
              <Text style={[styles.vatOptionText, hasVat === 'yes' && styles.vatOptionTextActive]}>Yes</Text>
            </View>
          </View>

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
              <Text style={styles.termsLink} onPress={onViewTerms}>Terms of Service</Text>
              {' and '}
              <Text style={styles.termsLink} onPress={onViewPrivacy}>Privacy Policy</Text>
              {'.'}
            </Text>
          </View>
          {fieldErrors.terms ? (
            <Text style={[styles.inlineError, styles.inlineErrorTerms]}>{fieldErrors.terms}</Text>
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

      {/* Country Picker Modal */}
      <CountryPickerModal
        visible={countryPickerVisible}
        selected={selectedCountry}
        onSelect={handleCountrySelect}
        onClose={() => setCountryPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.bg},
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: 16,
  },

  brandRow: {alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 24},
  brandBadge: {
    alignItems: 'center', backgroundColor: colors.navy,
    borderRadius: radius.sm, height: 36, justifyContent: 'center', width: 36,
  },
  brandIcon: {color: '#fff', fontSize: 16},
  brandName: {color: colors.navy, fontSize: 22, fontWeight: '900', letterSpacing: 1},

  hero: {marginBottom: 24},
  title: {color: colors.ink, fontSize: 30, fontWeight: '400', letterSpacing: -0.3},
  subtitle: {color: '#525863', fontSize: 16, lineHeight: 24, marginTop: 8},

  apiErrorBox: {
    alignItems: 'center', backgroundColor: '#FFF1EF', borderColor: '#F3B4B0',
    borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row',
    gap: spacing.md, marginBottom: 20, padding: spacing.lg,
  },
  apiErrorDot: {
    alignItems: 'center', backgroundColor: colors.danger,
    borderRadius: 18, height: 30, justifyContent: 'center', width: 30,
  },
  apiErrorDotText: {color: '#fff', fontSize: 16, fontWeight: '900'},
  apiErrorText: {color: colors.danger, flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20},

  form: {gap: 12},

  fieldLabel: {
    color: '#6B7280', fontSize: 12, fontWeight: '700',
    letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase',
  },
  requiredStar: {color: '#EF4444', fontWeight: '900'},

  // Dedicated country selector
  countrySelector: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D0DB',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  countrySelectorFlag: {fontSize: 22},
  countrySelectorName: {color: colors.ink, flex: 1, fontSize: 15, fontWeight: '600'},
  countrySelectorCode: {color: '#6B7280', fontSize: 14, fontWeight: '700'},
  countrySelectorChevron: {color: colors.inkSoft, fontSize: 12, marginLeft: 4},

  // Phone row (dial code is read-only, derived from country)
  phoneRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D0DB',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  phoneRowError: {borderColor: colors.danger},
  dialCodeBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dialCodeText: {color: colors.ink, fontSize: 14, fontWeight: '700'},
  phoneDivider: {backgroundColor: '#C9D0DB', height: 22, marginHorizontal: 2, width: 1},
  phoneInput: {color: colors.ink, flex: 1, fontSize: 16, paddingVertical: 0},
  phonePreview: {color: '#1066B1', fontSize: 11, fontWeight: '700', marginLeft: 4, marginTop: 4},

  inlineError: {color: colors.danger, fontSize: 12, marginLeft: 4, marginTop: 4},
  inlineErrorTerms: {marginLeft: 34},
  matchText: {color: '#1066B1', fontSize: 12, marginLeft: 4, marginTop: 4, fontWeight: '700'},

  strengthRow: {flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: -4},
  strengthPill: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  strengthPillMet: {backgroundColor: '#DBEAFE', borderColor: '#93C5FD'},
  strengthPillText: {fontSize: 11, fontWeight: '700', color: '#94A3B8'},
  strengthPillTextMet: {color: '#1066B1'},

  termsBlock: {alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginTop: 4},
  checkbox: {
    alignItems: 'center', backgroundColor: '#fff', borderColor: '#C9D0DB',
    borderRadius: 5, borderWidth: 1.5, flexShrink: 0,
    height: 22, justifyContent: 'center', marginTop: 1, width: 22,
  },
  checkboxChecked: {backgroundColor: colors.accent, borderColor: colors.accent},
  checkmark: {color: '#fff', fontSize: 13, fontWeight: '900'},
  termsText: {color: '#525863', flex: 1, fontSize: 14, lineHeight: 21},
  termsLink: {color: colors.accent, fontWeight: '700'},

  signUpBtn: {
    alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.lg,
    elevation: 4, justifyContent: 'center', marginTop: 6, minHeight: 60,
    shadowColor: colors.accent, shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  signUpBtnDisabled: {opacity: 0.7},
  signUpBtnText: {color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3},

  footer: {alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 12},
  footerText: {color: colors.inkSoft, fontSize: 15},
  footerLink: {color: colors.accent, fontSize: 15, fontWeight: '800'},

  vatCard: {
    alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#C9D0DB',
    borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row',
    justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
  vatQuestion: {color: colors.ink, fontSize: 15, fontWeight: '600', flex: 1},
  vatToggleRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2},
  vatOptionText: {color: '#94A3B8', fontSize: 14, fontWeight: '700'},
  vatOptionTextActive: {color: '#1066B1'},
});

// ─── Modal styles ─────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingTop: 8,
  },
  sheetHeader: {
    alignItems: 'center', borderBottomColor: '#F0F2F5', borderBottomWidth: 1,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  sheetTitle: {color: '#111827', fontSize: 17, fontWeight: '900'},
  closeBtn: {
    alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 20,
    height: 32, justifyContent: 'center', width: 32,
  },
  closeBtnText: {color: '#374151', fontSize: 14, fontWeight: '700'},
  searchWrap: {
    borderBottomColor: '#F0F2F5', borderBottomWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderRadius: 10,
    borderWidth: 1, color: '#111827', fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  countryRow: {
    alignItems: 'center', flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  countryRowActive: {backgroundColor: '#EFF6FF'},
  countryFlag: {fontSize: 24},
  countryName: {color: '#111827', flex: 1, fontSize: 15, fontWeight: '600'},
  countryCode: {color: '#6B7280', fontSize: 14, fontWeight: '700'},
  checkmark: {color: '#1066B1', fontSize: 16, fontWeight: '900', marginLeft: 4},
  sep: {backgroundColor: '#F3F4F6', height: 1, marginHorizontal: 20},
});

export default RegisterScreen;
