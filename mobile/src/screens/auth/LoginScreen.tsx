import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

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
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue your journey</Text>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={email =>
              setLoginForm((current: any) => ({...current, email}))
            }
            placeholder="example@mail.com"
            placeholderTextColor="#8A94A0"
            style={styles.input}
            value={loginForm.email}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            onChangeText={password =>
              setLoginForm((current: any) => ({...current, password}))
            }
            placeholder="••••••••"
            placeholderTextColor="#8A94A0"
            secureTextEntry
            style={styles.input}
            value={loginForm.password}
          />
        </View>

        <Pressable
          onPress={() => setAuthMode('forgot')}
          style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </Pressable>

        <Pressable onPress={handleLogin} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {authLoading ? 'Signing In...' : 'Sign In'}
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => setAuthMode('register')}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </Pressable>
        </View>
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordText: {
    color: '#DFA622',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#102235',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#5B6671',
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DFA622',
  },
});

export default LoginScreen;
