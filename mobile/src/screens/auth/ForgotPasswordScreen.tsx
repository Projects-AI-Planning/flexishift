import React, {useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface ForgotPasswordScreenProps {
  authLoading: boolean;
  authError: string | null;
  onSendCode: (email: string) => void;
  onBack: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  authLoading,
  authError,
  onSendCode,
  onBack,
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    onSendCode(email.trim());
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🔑</Text>
        </View>

        <Text style={styles.subtitle}>
          Enter the email address linked to your account. We'll send a 6-digit reset code.
        </Text>

        {authError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={v => {
              setEmail(v);
              if (emailError) {setEmailError('');}
            }}
            placeholder="you@example.com"
            placeholderTextColor="#9AA4B2"
            style={[styles.input, emailError ? styles.inputError : null]}
            value={email}
          />
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={authLoading}
          style={[styles.sendBtn, authLoading && styles.sendBtnDisabled]}>
          <Text style={styles.sendBtnText}>
            {authLoading ? 'Sending...' : 'Send Reset Code →'}
          </Text>
        </Pressable>

        <View style={styles.noteBox}>
          <Text style={styles.noteIcon}>ℹ️</Text>
          <Text style={styles.noteText}>
            The code expires in 10 minutes. Check your spam folder if you don't see it.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FFFFFF'},
  backBtn: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.sm,
  },
  backText: {color: colors.navy, fontSize: 16, fontWeight: '800'},
  content: {
    flex: 1, paddingHorizontal: spacing.xl,
    backgroundColor: '#fff',
    marginHorizontal: spacing.xl, marginTop: spacing.sm,
    borderRadius: radius.xl, padding: spacing.xxl,
    shadowColor: '#0B1320', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFF7ED', alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  iconText: {fontSize: 32},
  title: {
    color: colors.navy, fontSize: 26, fontWeight: '900',
    textAlign: 'center', marginBottom: 12,
  },
  subtitle: {
    color: colors.inkSoft, fontSize: 14, lineHeight: 22,
    textAlign: 'center', marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#FFF1EF', borderColor: '#F3B4B0', borderWidth: 1,
    borderRadius: radius.md, padding: spacing.md, marginBottom: 16,
  },
  errorText: {color: colors.danger, fontSize: 13, fontWeight: '700', textAlign: 'center'},
  fieldWrap: {marginBottom: 20},
  label: {
    color: colors.navy, fontSize: 13, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
  },
  input: {
    borderWidth: 1.5, borderColor: '#C9D0DB',
    borderRadius: radius.md, minHeight: 54,
    paddingHorizontal: spacing.md, fontSize: 16,
    color: colors.ink, backgroundColor: '#FAFBFD',
  },
  inputError: {borderColor: colors.danger},
  fieldError: {color: colors.danger, fontSize: 12, marginTop: 4, fontWeight: '700'},
  sendBtn: {
    backgroundColor: '#1066B1', borderRadius: radius.lg,
    minHeight: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  sendBtnDisabled: {opacity: 0.5},
  sendBtnText: {color: colors.accent, fontSize: 16, fontWeight: '900'},
  noteBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#F8FAFD', borderRadius: radius.md, padding: spacing.md,
  },
  noteIcon: {fontSize: 14, flexShrink: 0},
  noteText: {flex: 1, color: colors.inkSoft, fontSize: 12, lineHeight: 18},
});

export default ForgotPasswordScreen;
