import React, {useState} from 'react';
import {
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, spacing} from '../../theme';

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
        <Text style={styles.stepTitle}>Step 1 of 3</Text>
        <Text style={styles.mainTitle}>Load Code Confirmation</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code provided by the warehouse or shipper at pickup.
        </Text>

        <Card title="Pickup Verification" subtitle={`Ref: ${jobReference}`} variant="accent">
          <Text style={styles.label}>Enter Load Code</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="000000"
            placeholderTextColor="#9AA4B2"
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
    padding: spacing.xl,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  mainTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.inkSoft,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.md,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  codeInput: {
    backgroundColor: '#F8FAFD',
    borderRadius: 18,
    paddingVertical: 18,
    fontSize: 28,
    fontWeight: '900',
    color: colors.navy,
    textAlign: 'center',
    letterSpacing: 10,
    borderWidth: 2,
    borderColor: '#D6DCE5',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.navy,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
});

export default LoadCodeScreen;
