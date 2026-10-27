import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppTheme from '../theme/appTheme';

/**
 * @param {'auth' | 'dark'} variant — auth: light field (sign-in); dark: profile theme
 */
const PasswordInput = ({
  value,
  onChangeText,
  placeholder,
  label,
  variant = 'auth',
  editable = true,
  style,
  containerStyle,
}) => {
  const [visible, setVisible] = useState(false);
  const isDark = variant === 'dark';

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          isDark ? styles.fieldDark : styles.fieldAuth,
          style,
          !editable && styles.fieldDisabled,
        ]}
      >
        <TextInput
          style={[styles.input, isDark ? styles.inputDark : styles.inputAuth]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? AppTheme.textMuted : AppTheme.placeholder}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          style={styles.eyeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Icon
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={isDark ? AppTheme.textMuted : AppTheme.placeholder}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: AppTheme.textSoft,
    marginBottom: 6,
  },
  labelDark: {
    color: AppTheme.textSoft,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  fieldAuth: {
    height: 50,
    backgroundColor: AppTheme.inputBg,
    borderColor: AppTheme.border,
    marginBottom: 12,
    paddingLeft: 20,
  },
  fieldDark: {
    backgroundColor: AppTheme.background,
    borderColor: AppTheme.border,
    paddingLeft: 14,
    paddingVertical: 4,
    marginBottom: 4,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingRight: 8,
  },
  inputAuth: {
    color: AppTheme.inputText,
  },
  inputDark: {
    color: AppTheme.textPrimary,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PasswordInput;
