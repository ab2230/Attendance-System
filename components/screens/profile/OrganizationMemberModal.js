import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppTheme from '../../theme/appTheme';
import {
  ORGANIZATION_MODULES,
  CRUD_ACTIONS,
  buildEmptyPermissions,
  buildOwnerPermissions,
} from '../../../utils/organizationPermissions';

const AVATAR_COLORS = ['#4da0b0', '#667eea', '#9b59b6', '#43e97b', '#f39c12', '#e74c3c'];

function avatarColorFor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getDisplayName(member) {
  const full = `${member?.first_name || ''} ${member?.last_name || ''}`.trim();
  if (full) return full;
  if (member?.email) return member.email.split('@')[0];
  return 'Teammate';
}

function getInitials(member) {
  const first = (member?.first_name || '').trim();
  const last = (member?.last_name || '').trim();
  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || first.charAt(0).toUpperCase();
  }
  const email = member?.email || '';
  return (email.charAt(0) || '?').toUpperCase();
}

function normalizePermissions(raw, isOwner) {
  if (isOwner) return buildOwnerPermissions();
  const base = buildEmptyPermissions();
  if (!raw || typeof raw !== 'object') return base;
  ORGANIZATION_MODULES.forEach(({ key }) => {
    CRUD_ACTIONS.forEach((action) => {
      base[key][action] = Boolean(raw?.[key]?.[action]);
    });
  });
  return base;
}

const OrganizationMemberModal = ({
  visible,
  member,
  canManage,
  onClose,
  onSave,
  onRemove,
}) => {
  const [permissions, setPermissions] = useState(buildEmptyPermissions());
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (visible && member) {
      setPermissions(normalizePermissions(member.permissions, member.is_owner));
      setSaving(false);
      setRemoving(false);
    }
  }, [visible, member]);

  if (!member) return null;

  const isOwner = Boolean(member.is_owner);
  const isPending = member.kind === 'invite' || member.status === 'pending';
  const readOnly = isOwner || !canManage;
  const busy = saving || removing;
  const displayName = getDisplayName(member);
  const email = member.email || 'No email on file';
  const initials = getInitials(member);
  const avatarColor = avatarColorFor(member.email || member.user_id || displayName);

  const togglePermission = (moduleKey, action) => {
    if (readOnly || busy) return;
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [action]: !prev[moduleKey][action],
      },
    }));
  };

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handleSave = async () => {
    if (readOnly || busy) return;
    setSaving(true);
    try {
      await onSave(member, permissions);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    if (readOnly || busy) return;
    Alert.alert(
      isPending ? 'Revoke invite?' : 'Remove teammate?',
      isPending
        ? `${email} will no longer be able to join with this invite.`
        : `${displayName} will lose access to this organization.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isPending ? 'Revoke' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await onRemove(member);
            } finally {
              setRemoving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{isPending ? 'Pending invite' : 'Teammate'}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Icon name="close" size={24} color={AppTheme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.identityRow}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.email} numberOfLines={1}>{email}</Text>
              {isOwner ? (
                <Text style={styles.ownerBadge}>Owner · full access</Text>
              ) : isPending ? (
                <Text style={styles.pendingBadge}>Waiting to join</Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.label}>Permissions</Text>
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
                      disabled={readOnly || busy}
                    />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          {!readOnly ? (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.disabledButton]}
                onPress={handleSave}
                disabled={busy}
              >
                {saving ? (
                  <ActivityIndicator color={AppTheme.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>Save access</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dangerButton, busy && styles.disabledButton]}
                onPress={handleRemove}
                disabled={busy}
              >
                {removing ? (
                  <ActivityIndicator color={AppTheme.danger} />
                ) : (
                  <Text style={styles.dangerButtonText}>
                    {isPending ? 'Revoke invite' : 'Remove from team'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppTheme.accent,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },
  email: {
    fontSize: 14,
    color: AppTheme.textMuted,
    marginTop: 2,
  },
  ownerBadge: {
    marginTop: 4,
    fontSize: 12,
    color: AppTheme.accent,
    fontWeight: '600',
  },
  pendingBadge: {
    marginTop: 4,
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: AppTheme.textSoft,
    marginBottom: 6,
  },
  permScroll: {
    maxHeight: 320,
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
  footer: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: AppTheme.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: AppTheme.background,
    fontSize: 16,
    fontWeight: '700',
  },
  dangerButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.danger,
    backgroundColor: 'transparent',
  },
  dangerButtonText: {
    color: AppTheme.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: AppTheme.background,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  secondaryButtonText: {
    color: AppTheme.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default OrganizationMemberModal;
