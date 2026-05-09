import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Pressable,
} from 'react-native';
import Card from '../../components/common/Card';
import {colors, radius, spacing} from '../../theme';

interface PasswordScreenProps {
  passwordForm: {
    confirmPassword: string;
    currentPassword: string;
    newPassword: string;
  };
  onChange: (patch: Partial<PasswordScreenProps['passwordForm']>) => void;
  onSave: () => void;
  onBack?: () => void;
  loading: boolean;
}

const PasswordScreen: React.FC<PasswordScreenProps> = ({
  passwordForm,
  onChange,
  onSave,
  onBack,
  loading,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Change Password</Text>
        <View style={styles.topBarSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>Keep your account secure with a strong password</Text>
        </View>

        <Card title="Password" variant="accent">
          <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor="#98A2B3"
            secureTextEntry
            value={passwordForm.currentPassword}
            onChangeText={currentPassword => onChange({currentPassword})}
          />
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="#98A2B3"
            secureTextEntry
            value={passwordForm.newPassword}
            onChangeText={newPassword => onChange({newPassword})}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="#98A2B3"
            secureTextEntry
            value={passwordForm.confirmPassword}
            onChangeText={confirmPassword => onChange({confirmPassword})}
          />
        </Card>

        <Card title="Password Tips" variant="default">
          <Text style={styles.tipText}>
            Use at least 8 characters, avoid reuse, and include a mix of letters, numbers, and symbols.
          </Text>
        </Card>

        <Pressable onPress={onSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Change Password'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: spacing.lg,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E8EDF3',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  backArrow: {fontSize: 18, color: colors.navy, fontWeight: '700'},
  topBarTitle: {
    flex: 1, textAlign: 'center', fontSize: 18,
    fontWeight: '900', color: colors.navy,
  },
  topBarSpacer: {width: 36},
  content: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 15,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#F8FAFD',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
    color: colors.ink,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  tipText: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: '900',
  },
});

export default PasswordScreen;
