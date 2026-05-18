import React, {useRef, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {EyeIcon, EyeOffIcon} from './FieldIcon';
import {colors, fonts, spacing} from '../../theme';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  leftIcon,
  containerStyle,
  secureTextEntry,
  multiline,
  style,
  ...rest
}) => {
  const [showText, setShowText] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isPassword = secureTextEntry === true;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          error ? styles.inputWrapError : null,
        ]}
        onTouchEnd={() => inputRef.current?.focus()}>
        {leftIcon ? <View style={styles.iconWrap}>{leftIcon}</View> : null}
        <TextInput
          ref={inputRef}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          secureTextEntry={isPassword && !showText}
          multiline={multiline}
          placeholderTextColor="#9AA4B2"
          {...rest}
        />
        {isPassword ? (
          <Pressable onPress={() => setShowText(v => !v)} style={styles.eyeBtn}>
            {showText ? (
              <EyeOffIcon size={20} color="#9CA4B0" />
            ) : (
              <EyeIcon size={20} color="#9CA4B0" />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.navy,
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#D6DCE5',
    borderRadius: 18,
    minHeight: 66,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#F8FAFD',
  },
  inputWrapMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    minHeight: 100,
  },
  inputWrapError: {
    borderColor: colors.danger,
  },
  iconWrap: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: colors.ink,
    paddingVertical: 0,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    paddingVertical: 0,
  },
  eyeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    minHeight: 44,
    width: 44,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
});

export default AppInput;
