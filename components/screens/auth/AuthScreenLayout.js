import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import AppTheme from '../../theme/appTheme';

/**
 * Auth screens: avoid Android KeyboardAvoidingView "height" (causes white gap after dismiss).
 */
const AuthScreenLayout = ({ children, contentContainerStyle }) => (
  <View style={styles.root}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bounces={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  flex: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: AppTheme.background,
  },
});

export default AuthScreenLayout;
