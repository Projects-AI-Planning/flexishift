import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface RegisterScreenProps {
  registerForm: any;
  setRegisterForm: (form: any) => void;
  handleRegister: () => void;
  authLoading: boolean;
  authError: string | null;
  setAuthMode: (mode: any) => void;
}

const Field = ({
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
}: {
  icon: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
}) => (
  <View style={styles.fieldWrap}>
    <View style={styles.fieldRow}>
      <Text style={styles.fieldIcon}>{icon}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7A8494"
        style={styles.input}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'none'}
        secureTextEntry={secureTextEntry}
      />
    </View>
  </View>
);

const RegisterScreen: React.FC<RegisterScreenProps> = ({
  registerForm,
  setRegisterForm,
  handleRegister,
  authLoading,
  authError,
  setAuthMode,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>⛟</Text>
          </View>
          <Text style={styles.brandText}>FREIGHTFLEX</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start managing your logistics pipeline today.</Text>
        </View>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <View style={styles.form}>
          <Field
            icon="👤"
            value={registerForm.name}
            onChangeText={(name) => setRegisterForm((current: any) => ({ ...current, name }))}
            placeholder="Full Name"
          />
          <Field
            icon="✉"
            value={registerForm.email}
            onChangeText={(email) => setRegisterForm((current: any) => ({ ...current, email }))}
            placeholder="Email Address"
            keyboardType="email-address"
          />
          <Field
            icon="☎"
            value={registerForm.phone}
            onChangeText={(phone) => setRegisterForm((current: any) => ({ ...current, phone }))}
            placeholder="Phone Number"
            keyboardType="phone-pad"
          />
          <Field
            icon="🔒"
            value={registerForm.password}
            onChangeText={(password) => setRegisterForm((current: any) => ({ ...current, password }))}
            placeholder="Password"
            secureTextEntry
          />

          <Pressable onPress={handleRegister} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {authLoading ? 'Creating...' : 'Sign Up'}
              {'  '}
              {'→'}
            </Text>
          </Pressable>
        </View>

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
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    marginTop: 4,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBadgeText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: '900',
  },
  brandText: {
    color: colors.navy,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  hero: {
    marginBottom: 34,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 12,
    color: '#525863',
    fontSize: 18,
    lineHeight: 26,
  },
  errorText: {
    borderWidth: 1,
    borderColor: '#F3B4B0',
    backgroundColor: '#FFF1EF',
    color: colors.danger,
    borderRadius: radius.lg,
    padding: 14,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 18,
  },
  form: {
    gap: 16,
  },
  fieldWrap: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C9CFD9',
  },
  fieldRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  fieldIcon: {
    width: 24,
    marginRight: 12,
    color: '#6E7685',
    fontSize: 16,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    minHeight: 54,
    color: colors.ink,
    fontSize: 18,
    paddingVertical: 0,
  },
  primaryButton: {
    marginTop: 10,
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(16, 34, 53, 0.28)',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 20,
    fontWeight: '900',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 8,
  },
  footerText: {
    color: colors.inkSoft,
    fontSize: 15,
  },
  footerLink: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '900',
  },
});

export default RegisterScreen;
