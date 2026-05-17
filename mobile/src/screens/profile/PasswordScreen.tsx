import React from 'react';
import {Text, StyleSheet, ScrollView, Pressable, View} from 'react-native';
import Card from '../../components/common/Card';
import AppInput from '../../components/common/AppInput';
import {colors, spacing} from '../../theme';

interface PasswordScreenProps {
  passwordForm: {
    confirmPassword: string;
    currentPassword: string;
    newPassword: string;
  };
  onChange: (patch: Partial<PasswordScreenProps['passwordForm']>) => void;
  onSave: () => void;
  loading: boolean;
}

const PasswordScreen: React.FC<PasswordScreenProps> = ({
  passwordForm,
  onChange,
  onSave,
  loading,
}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>Keep your account secure with a strong password</Text>
      </View>

      <Card title="Password" variant="accent">
        <AppInput
          placeholder="Current password"
          secureTextEntry
          value={passwordForm.currentPassword}
          onChangeText={currentPassword => onChange({currentPassword})}
        />
        <AppInput
          placeholder="New password"
          secureTextEntry
          value={passwordForm.newPassword}
          onChangeText={newPassword => onChange({newPassword})}
        />
        <AppInput
          placeholder="Confirm password"
          secureTextEntry
          value={passwordForm.confirmPassword}
          onChangeText={confirmPassword => onChange({confirmPassword})}
          containerStyle={{marginBottom: 0}}
        />
      </Card>

      <Card title="Password Tips" variant="default">
        <Text style={styles.tipText}>
          Use at least 8 characters, avoid reuse, and include a mix of letters, numbers, and symbols.
        </Text>
      </Card>

      <Pressable onPress={onSave} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Change Password'}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 4,
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
