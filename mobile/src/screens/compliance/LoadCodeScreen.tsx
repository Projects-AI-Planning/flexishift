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
import {colors, spacing} from '../../theme';

interface LoadCodeScreenProps {
  jobId: string;
  jobReference: string;
  onVerify: (code: string) => Promise<void>;
  onOpenScanner: () => void;
  onBack?: () => void;
  loading: boolean;
  error: string | null;
}

const LoadCodeScreen: React.FC<LoadCodeScreenProps> = ({
  jobId: _jobId,
  jobReference,
  onVerify,
  onOpenScanner,
  onBack,
  loading,
  error,
}) => {
  const [code, setCode] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.topRow}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backText}>{'\u2190'} Back</Text>
            </Pressable>
          ) : (
            <View style={styles.backBtnSpacer} />
          )}
          <Text style={styles.stepTitle}>Step 1 of 3</Text>
        </View>
        <Text style={styles.mainTitle}>Load Code Confirmation</Text>
        <Text style={styles.subtitle}>
          Enter the 8-character code provided by the warehouse or shipper at pickup.
        </Text>

        <Card
          title="Pickup Verification"
          subtitle={`Ref: ${jobReference}`}
          variant="accent">
          <Text style={styles.label}>Enter Load Code</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="XXXXXXXX"
            placeholderTextColor="#9AA4B2"
            keyboardType="default"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            value={code}
            onChangeText={text => setCode(text.toUpperCase())}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.hintText}>
            This code ensures the right vehicle is picking up the correct cargo.
          </Text>
        </Card>

        <Pressable
          onPress={() => onVerify(code)}
          disabled={loading || code.length < 8}
          style={[
            styles.primaryButton,
            (loading || code.length < 8) && styles.disabledButton,
          ]}>
          <Text style={styles.primaryButtonText}>
            {loading ? 'Verifying...' : 'Confirm & Proceed'}
          </Text>
        </Pressable>

        <Pressable onPress={onOpenScanner} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Can't find code? Open scanner</Text>
        </Pressable>

        <Pressable onPress={onOpenScanner} style={styles.scannerButton}>
          <Text style={styles.scannerButtonText}>Open Scanner</Text>
        </Pressable>

        <Text style={styles.nextStepText}>
          After verification, continue to the handover checklist. Trip start is enabled from the next step.
        </Text>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backBtnSpacer: {
    width: 80,
  },
  backText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
    textTransform: 'uppercase',
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
  scannerButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    paddingVertical: 14,
  },
  scannerButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  nextStepText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

export default LoadCodeScreen;
