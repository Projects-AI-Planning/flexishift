import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

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
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>Enter the OTP sent to your email</Text>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={email =>
              setVerifyForm((current: any) => ({...current, email}))
            }
            placeholder="example@mail.com"
            placeholderTextColor="#8A94A0"
            style={styles.input}
            value={verifyForm.email}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>OTP Code</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={otp =>
              setVerifyForm((current: any) => ({...current, otp}))
            }
            placeholder="123456"
            placeholderTextColor="#8A94A0"
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

        <Pressable onPress={() => setAuthMode('login')} style={styles.footerLink}>
          <Text style={styles.footerLinkText}>Back to Sign In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5B6671',
    marginBottom: 32,
  },
  errorText: {
    color: '#A53A32',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102235',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F4F1E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#18232F',
  },
  primaryButton: {
    backgroundColor: '#102235',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    borderColor: '#E4DED0',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  secondaryButtonText: {
    color: '#18232F',
    fontSize: 14,
    fontWeight: '800',
  },
  footerLink: {
    alignItems: 'center',
  },
  footerLinkText: {
    color: '#DFA622',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default VerifyScreen;
