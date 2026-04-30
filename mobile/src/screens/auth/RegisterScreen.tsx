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
import {colors, radius, shadow, spacing} from '../../theme';

interface RegisterScreenProps {
  registerForm: any;
  setRegisterForm: (form: any) => void;
  handleRegister: () => void;
  authLoading: boolean;
  authError: string | null;
  setAuthMode: (mode: any) => void;
}

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brand}>FreightFlex</Text>
          <Text style={styles.subtitle}>Create your driver account</Text>
        </View>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              onChangeText={name =>
                setRegisterForm((current: any) => ({...current, name}))
              }
              placeholder="John Doe"
              placeholderTextColor="#9AA4B2"
              style={styles.input}
              value={registerForm.name}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={email =>
                setRegisterForm((current: any) => ({...current, email}))
              }
              placeholder="driver.77@freightflex.com"
              placeholderTextColor="#9AA4B2"
              style={styles.input}
              value={registerForm.email}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              keyboardType="phone-pad"
              onChangeText={phone =>
                setRegisterForm((current: any) => ({...current, phone}))
              }
              placeholder="+91 9876543210"
              placeholderTextColor="#9AA4B2"
              style={styles.input}
              value={registerForm.phone}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              onChangeText={password =>
                setRegisterForm((current: any) => ({...current, password}))
              }
              placeholder="••••••••••"
              placeholderTextColor="#9AA4B2"
              secureTextEntry
              style={styles.input}
              value={registerForm.password}
            />
          </View>

          <Pressable onPress={handleRegister} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {authLoading ? 'Creating...' : 'Sign Up'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => setAuthMode('login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  brand: {
    color: colors.navy,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 18,
    marginTop: 6,
  },
  errorText: {
    borderWidth: 1,
    borderColor: '#F3B4B0',
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 28,
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
    fontSize: 16,
    fontWeight: '900',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 2,
    borderColor: '#D6DCE5',
    borderRadius: 18,
    minHeight: 62,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: '#F8FAFD',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
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
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.inkSoft,
    fontSize: 16,
  },
  footerLink: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },
});

export default RegisterScreen;
