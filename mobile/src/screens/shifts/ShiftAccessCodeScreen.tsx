import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ShiftAccessCodeScreenProps {
  shiftId:    string;
  shiftRef:   string;
  dayNumber:  number;
  totalDays:  number;
  onVerify:   (code: string) => Promise<void>;
  loading:    boolean;
  error:      string | null;
  onBack:     () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

const ShiftAccessCodeScreen: React.FC<ShiftAccessCodeScreenProps> = ({
  shiftRef,
  dayNumber,
  totalDays,
  onVerify,
  loading,
  error,
  onBack,
}) => {
  const [code, setCode] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.flex}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{shiftRef}</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Step indicator ──────────────────────────────────────────────── */}
          <View style={styles.stepRow}>
            <Text style={styles.stepTitle}>Day {dayNumber} of {totalDays} — Step 1 of 3</Text>
          </View>
          <Text style={styles.mainTitle}>Access Code</Text>
          <Text style={styles.subtitle}>
            Enter the access code provided by the haulier to confirm the start of today's work.
          </Text>

          {/* ── Shift info card ─────────────────────────────────────────────── */}
          <View style={styles.shiftCard}>
            <View style={styles.shiftCardHeader}>
              <Text style={styles.shiftRef}>{shiftRef}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>DAY {dayNumber}</Text>
              </View>
            </View>
            <Text style={styles.shiftCardSub}>
              Enter the code below to confirm your arrival and begin Day {dayNumber}.
            </Text>
          </View>

          {/* ── Code input ──────────────────────────────────────────────────── */}
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Enter Access Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter code"
              placeholderTextColor="#9AA4B2"
              keyboardType="default"
              autoCapitalize="characters"
              autoCorrect={false}
              value={code}
              onChangeText={t => setCode(t.toUpperCase())}
              autoFocus
            />
            <Text style={styles.hintText}>
              This code is provided by the haulier to authorise your access to this shift.
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={() => onVerify(code)}
            disabled={loading || code.trim().length === 0}
            style={[styles.primaryButton, (loading || code.trim().length === 0) && styles.disabledButton]}>
            {loading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.primaryButtonText}>Confirm & Continue →</Text>
            )}
          </Pressable>

          <Text style={styles.nextStepText}>
            After verification you'll proceed to the vehicle handover checklist.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    {flex: 1, backgroundColor: colors.bg},
  flex:         {flex: 1},
  scrollContent:{padding: spacing.xl, paddingBottom: spacing.xl * 2},

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn:   {width: 40, alignItems: 'flex-start', justifyContent: 'center'},
  backIcon:  {fontSize: 22, color: colors.ink, fontWeight: '700'},
  headerTitle:{
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '900', color: colors.navy ?? colors.ink,
  },

  stepRow:   {alignItems: 'flex-end', marginBottom: spacing.sm},
  stepTitle: {fontSize: 13, fontWeight: '800', color: colors.accent, textTransform: 'uppercase'},

  mainTitle: {fontSize: 28, fontWeight: '900', color: colors.navy ?? colors.ink, marginBottom: spacing.sm},
  subtitle:  {fontSize: 14, color: colors.inkSoft, lineHeight: 20, marginBottom: spacing.lg},

  shiftCard: {
    backgroundColor: colors.navy ?? '#102235',
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  shiftCardHeader:{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  shiftRef:  {color: '#FFFFFF', fontSize: 16, fontWeight: '900'},
  badge:     {backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4},
  badgeText: {color: '#FFFFFF', fontSize: 10, fontWeight: '900'},
  shiftCardSub:{color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', lineHeight: 18},

  codeCard: {
    backgroundColor: '#F8FAFD', borderRadius: radius.xl,
    padding: spacing.xl, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  codeLabel: {
    fontSize: 13, fontWeight: '900', color: colors.navy ?? colors.ink,
    textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  codeInput: {
    backgroundColor: '#FFFFFF', borderRadius: radius.lg,
    paddingVertical: 16, fontSize: 26, fontWeight: '900',
    color: colors.navy ?? colors.ink, textAlign: 'center', letterSpacing: 10,
    borderWidth: 2, borderColor: colors.border,
  },
  hintText: {fontSize: 12, color: colors.inkSoft, textAlign: 'center', lineHeight: 17},

  errorText: {
    color: colors.danger, fontSize: 13, fontWeight: '700',
    textAlign: 'center', marginBottom: spacing.sm,
  },

  primaryButton: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    minHeight: 56, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md, marginTop: spacing.sm,
  },
  disabledButton: {opacity: 0.45},
  primaryButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '900'},

  nextStepText: {color: colors.inkSoft, fontSize: 12, lineHeight: 18, textAlign: 'center'},
});

export default ShiftAccessCodeScreen;
