import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface VerifyScreenProps {
  verifyForm: any;
  setVerifyForm: (form: any) => void;
  handleVerify: () => void;
  handleResendOtp: () => void;
  authLoading: boolean;
  authError: string | null;
  setAuthMode: (mode: any) => void;
}

const VerifyScreen: React.FC<VerifyScreenProps> = ({
  verifyForm,
  setVerifyForm,
  handleVerify,
  handleResendOtp,
  authLoading,
  authError,
  setAuthMode,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Pressable onPress={() => setAuthMode('login')} style={styles.backBtn}>
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </Pressable>

        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>Enter the one-time password sent to your email.</Text>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={email =>
                setVerifyForm((current: any) => ({...current, email}))
              }
              placeholder="driver.77@freightflex.com"
              placeholderTextColor="#9AA4B2"
              style={styles.input}
              value={verifyForm.email}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>OTP Code</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={otp =>
                setVerifyForm((current: any) => ({...current, otp}))
              }
              placeholder="123456"
              placeholderTextColor="#9AA4B2"
              style={styles.input}
              value={verifyForm.otp}
            />
          </View>

          <Pressable onPress={handleVerify} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {authLoading ? 'Verifying...' : 'Verify Email'}
            </Text>
          </Pressable>

          <Pressable onPress={handleResendOtp} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Resend OTP</Text>
          </Pressable>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '800',
  },
  title: {
    color: colors.navy,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 17,
    marginTop: 8,
    marginBottom: spacing.xl,
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
  secondaryButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default VerifyScreen;
