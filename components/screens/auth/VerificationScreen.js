import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import AppTheme from '../../theme/appTheme';

const VerificationScreen = ({ navigation, route }) => {
  const { email } = route.params || {};

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color={AppTheme.accent} />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>

        <Text style={styles.message}>We&apos;ve sent a verification link to:</Text>

        <Text style={styles.email}>{email}</Text>

        <Text style={styles.instructions}>
          Please check your email and click the verification link to activate your account.
          Once verified, you can sign in to your account.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Signin')}
          >
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.secondaryButtonText}>Back to Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Didn&apos;t receive the email? Check your spam folder or try signing up again.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  iconContainer: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: AppTheme.surface,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppTheme.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: AppTheme.textSoft,
    textAlign: 'center',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: AppTheme.accent,
    textAlign: 'center',
    marginBottom: 25,
  },
  instructions: {
    fontSize: 14,
    color: AppTheme.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: AppTheme.accent,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButtonText: {
    color: AppTheme.accentText,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  secondaryButtonText: {
    color: AppTheme.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    paddingHorizontal: 20,
  },
  helpText: {
    fontSize: 12,
    color: AppTheme.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default VerificationScreen;
