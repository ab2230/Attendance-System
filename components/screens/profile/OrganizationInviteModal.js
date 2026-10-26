import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppTheme from '../../theme/appTheme';
import {
  ORGANIZATION_MODULES,
  CRUD_ACTIONS,
  buildEmptyPermissions,
} from '../../../utils/organizationPermissions';

const defaultInvitePermissions = () => {
  const permissions = buildEmptyPermissions();
  ['classes', 'members', 'programs', 'attendance', 'rooms'].forEach((key) => {
    permissions[key].read = true;
  });
  return permissions;
};

const OrganizationInviteModal = ({ visible, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState(defaultInvitePermissions);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPermissions(defaultInvitePermissions());
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const togglePermission = (moduleKey, action) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [action]: !prev[moduleKey][action],
      },
    }));
  };

  const handleInvite = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(email.trim(), permissions);
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Invite teammate</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Icon name="close" size={24} color={AppTheme.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="colleague@school.edu"
            placeholderTextColor={AppTheme.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!submitting}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Permissions</Text>
          <ScrollView style={styles.permScroll} nestedScrollEnabled>
            {ORGANIZATION_MODULES.map(({ key, label }) => (
              <View key={key} style={styles.moduleBlock}>
                <Text style={styles.moduleTitle}>{label}</Text>
                {CRUD_ACTIONS.map((action) => (
                  <View key={`${key}-${action}`} style={styles.permRow}>
                    <Text style={styles.permLabel}>{action}</Text>
                    <Switch
                      value={Boolean(permissions[key]?.[action])}
                      onValueChange={() => togglePermission(key, action)}
                      trackColor={{ false: AppTheme.border, true: AppTheme.accentMuted }}
                      thumbColor={permissions[key]?.[action] ? AppTheme.accent : '#ccc'}
                      disabled={submitting}
                    />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleInvite}
            disabled={submitting || !email.trim()}
          >
            {submitting ? (
              <ActivityIndicator color={AppTheme.background} />
            ) : (
              <Text style={styles.primaryButtonText}>Send invite</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AppTheme.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppTheme.accent,
  },
  label: {
    fontSize: 14,
    color: AppTheme.textSoft,
    marginBottom: 6,
  },
  input: {
    backgroundColor: AppTheme.background,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AppTheme.textPrimary,
    fontSize: 16,
  },
  permScroll: {
    maxHeight: 280,
    marginBottom: 16,
  },
  moduleBlock: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppTheme.textPrimary,
    marginBottom: 6,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  permLabel: {
    fontSize: 14,
    color: AppTheme.textMuted,
    textTransform: 'capitalize',
  },
  primaryButton: {
    backgroundColor: AppTheme.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: AppTheme.background,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OrganizationInviteModal;
