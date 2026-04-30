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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join FreightFlex and start earning</Text>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            onChangeText={name =>
              setRegisterForm((current: any) => ({...current, name}))
            }
            placeholder="John Doe"
            placeholderTextColor="#8A94A0"
            style={styles.input}
            value={registerForm.name}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={email =>
              setRegisterForm((current: any) => ({...current, email}))
            }
            placeholder="example@mail.com"
            placeholderTextColor="#8A94A0"
            style={styles.input}
            value={registerForm.email}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            keyboardType="phone-pad"
            onChangeText={phone =>
              setRegisterForm((current: any) => ({...current, phone}))
            }
            placeholder="+91 9876543210"
            placeholderTextColor="#8A94A0"
            style={styles.input}
            value={registerForm.phone}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            onChangeText={password =>
              setRegisterForm((current: any) => ({...current, password}))
            }
            placeholder="••••••••"
            placeholderTextColor="#8A94A0"
            secureTextEntry
            style={styles.input}
            value={registerForm.password}
          />
        </View>

        <Pressable onPress={handleRegister} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {authLoading ? 'Registering...' : 'Sign Up'}
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => setAuthMode('login')}>
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 40,
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
    marginTop: 12,
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
    marginBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#5B6671',
  },
  signInText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DFA622',
  },
});

export default RegisterScreen;
