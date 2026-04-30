import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Card from '../../components/common/Card';

interface LoadCodeScreenProps {
  jobId: string;
  jobReference: string;
  onVerify: (code: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const LoadCodeScreen: React.FC<LoadCodeScreenProps> = ({
  jobId,
  jobReference,
  onVerify,
  loading,
  error,
}) => {
  const [code, setCode] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.stepTitle}>Step 1 of 3</Text>
            <Text style={styles.mainTitle}>Load Code Confirmation</Text>
            <Text style={styles.subtitle}>
              Enter the unique 6-digit code provided by the warehouse or shipper at pickup.
            </Text>
          </View>

          <Card title="Pickup Verification" subtitle={`Ref: ${jobReference}`}>
            <Text style={styles.label}>Enter Load Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="0 0 0 0 0 0"
              placeholderTextColor="#8A94A0"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              autoFocus
            />
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.hintText}>
              This code ensures the right vehicle is picking up the correct cargo.
            </Text>
          </Card>

          <View style={styles.footer}>
            <Pressable
              onPress={() => onVerify(code)}
              disabled={loading || code.length < 6}
              style={[
                styles.primaryButton,
                (loading || code.length < 6) && styles.disabledButton,
              ]}>
              <Text style={styles.primaryButtonText}>
                {loading ? 'Verifying...' : 'Confirm & Proceed'}
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Can't find code?</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1E8',
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DFA622',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#102235',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#5B6671',
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102235',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: '#F4F1E8',
    borderRadius: 16,
    paddingVertical: 18,
    fontSize: 32,
    fontWeight: '900',
    color: '#102235',
    textAlign: 'center',
    letterSpacing: 10,
    borderWidth: 2,
    borderColor: '#E4DED0',
  },
  errorText: {
    color: '#A53A32',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 13,
    color: '#8A94A0',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#102235',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#DFA622',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default LoadCodeScreen;
