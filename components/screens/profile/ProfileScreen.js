import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TopNavigator from '../../common/TopNavigator';
import { AuthContext } from '../../context/AuthContext';
import { OrganizationContext } from '../../context/OrganizationContext';
import { ClassContext } from '../../context/ClassContext';
import { MemberContext } from '../../context/MemberContext';
import { ProgramContext } from '../../context/ProgramContext';
import { AttendanceContext } from '../../context/AttendanceContext';
import AppTheme from '../../theme/appTheme';
import OrganizationInviteModal from './OrganizationInviteModal';
import OrganizationMemberModal from './OrganizationMemberModal';
import PasswordInput from '../../common/PasswordInput';
import supabaseService from '../../../services/supabaseService';

const AVATAR_COLORS = ['#4da0b0', '#667eea', '#9b59b6', '#43e97b', '#f39c12', '#e74c3c'];

function avatarColorFor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function teamDisplayName(row) {
  const full = `${row?.first_name || ''} ${row?.last_name || ''}`.trim();
  if (full) return full;
  if (row?.email) return row.email.split('@')[0];
  return 'Teammate';
}

function teamInitials(row) {
  const first = (row?.first_name || '').trim();
  const last = (row?.last_name || '').trim();
  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || first.charAt(0).toUpperCase();
  }
  return ((row?.email || '?').charAt(0) || '?').toUpperCase();
}

const ProfileScreen = () => {
  const { user, signOut, loading, changePassword } = useContext(AuthContext);
  const {
    organizations,
    activeOrganization,
    loading: orgLoading,
    error: orgError,
    setActiveOrganization,
    refreshOrganizations,
    createOrganization,
    inviteMember,
    can,
  } = useContext(OrganizationContext);
  const { loadClasses } = useContext(ClassContext);
  const { loadMembers } = useContext(MemberContext);
  const { loadPrograms } = useContext(ProgramContext);
  const { loadAttendanceRecords } = useContext(AttendanceContext);

  const [profileLoading, setProfileLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [orgPickerVisible, setOrgPickerVisible] = useState(false);
  const [createOrgVisible, setCreateOrgVisible] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSectionOpen, setPasswordSectionOpen] = useState(false);

  const displayName = user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || 'No email';
  const canManageTeam = can('organization', 'update');

  const loadTeam = useCallback(async () => {
    if (!activeOrganization?.id || !can('organization', 'read')) {
      setTeamMembers([]);
      return;
    }
    try {
      setTeamLoading(true);
      const rows = await supabaseService.listOrganizationTeam(activeOrganization.id);
      setTeamMembers(rows);
    } catch (e) {
      console.error(e);
      // Fallback if migration RPC is not applied yet
      try {
        const rows = await supabaseService.getOrganizationMembers(activeOrganization.id);
        setTeamMembers(
          (rows || []).map((row) => ({
            kind: 'member',
            status: 'active',
            user_id: row.user_id,
            is_owner: row.is_owner,
            permissions: row.permissions,
            email: row.profiles?.email || null,
            first_name: row.profiles?.first_name || null,
            last_name: row.profiles?.last_name || null,
          })),
        );
      } catch (fallbackError) {
        console.error(fallbackError);
      }
    } finally {
      setTeamLoading(false);
    }
  }, [activeOrganization?.id, can]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleRefresh = async () => {
    if (profileLoading) return;
    setProfileLoading(true);
    try {
      await refreshOrganizations();
      await Promise.all([
        loadClasses(),
        loadMembers(),
        loadPrograms(),
        loadAttendanceRecords({ silent: true }),
      ]);
      await loadTeam();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSelectOrg = async (orgId) => {
    await setActiveOrganization(orgId);
    setOrgPickerVisible(false);
    try {
      await Promise.all([
        loadClasses(),
        loadMembers(),
        loadPrograms(),
        loadAttendanceRecords({ silent: true }),
      ]);
      await loadTeam();
    } catch (e) {
      Alert.alert('Error', 'Could not load data for this organization.');
    }
  };

  const handleCreateOrg = async () => {
    const name = newOrgName.trim();
    if (!name || creatingOrg) return;
    setCreatingOrg(true);
    try {
      await createOrganization(name);
      setNewOrgName('');
      setCreateOrgVisible(false);
      await Promise.all([
        loadClasses(),
        loadMembers(),
        loadPrograms(),
        loadAttendanceRecords({ silent: true }),
      ]);
      await loadTeam();
      Alert.alert('Organization created', `"${name}" is now active.`);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not create organization.');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleInviteSubmit = async (email, permissions) => {
    const result = await inviteMember(email, permissions);
    if (!result?.ok) {
      const msg =
        result?.error === 'forbidden'
          ? 'You do not have permission to invite members.'
          : result?.error === 'invalid_email'
            ? 'Enter a valid email address.'
            : result?.error === 'cannot_invite_self'
              ? 'You cannot invite yourself.'
              : result?.error || 'Invite failed.';
      Alert.alert('Invite failed', msg);
      throw new Error(msg);
    }
    await loadTeam();
    Alert.alert(
      'Invite sent',
      result.status === 'pending'
        ? 'They will join when they sign up with that email.'
        : 'Member was added to your organization.',
    );
  };

  const teamErrorMessage = (code, fallback) => {
    switch (code) {
      case 'forbidden':
        return 'You do not have permission to manage the team.';
      case 'cannot_edit_owner':
      case 'cannot_remove_owner':
        return 'The organization owner cannot be changed this way.';
      case 'cannot_edit_self':
      case 'cannot_remove_self':
        return 'You cannot change your own membership here.';
      case 'not_found':
        return 'That teammate or invite was not found.';
      default:
        return fallback;
    }
  };

  const handleSaveTeamAccess = async (member, permissions) => {
    if (!activeOrganization?.id) return;
    try {
      let result;
      if (member.kind === 'invite') {
        result = await supabaseService.updateOrganizationInvitationPermissions(
          activeOrganization.id,
          member.invitation_id,
          permissions,
        );
      } else {
        result = await supabaseService.updateOrganizationMemberPermissions(
          activeOrganization.id,
          member.user_id,
          permissions,
        );
      }
      if (!result?.ok) {
        Alert.alert('Update failed', teamErrorMessage(result?.error, result?.error || 'Could not update access.'));
        return;
      }
      await loadTeam();
      setSelectedTeamMember(null);
      Alert.alert('Updated', 'Access permissions were saved.');
    } catch (e) {
      Alert.alert('Update failed', e.message || 'Could not update access.');
    }
  };

  const handleRemoveTeamMember = async (member) => {
    if (!activeOrganization?.id) return;
    try {
      let result;
      if (member.kind === 'invite') {
        result = await supabaseService.revokeOrganizationInvitation(
          activeOrganization.id,
          member.invitation_id,
        );
      } else {
        result = await supabaseService.removeOrganizationMember(
          activeOrganization.id,
          member.user_id,
        );
      }
      if (!result?.ok) {
        Alert.alert('Remove failed', teamErrorMessage(result?.error, result?.error || 'Could not remove.'));
        return;
      }
      await loadTeam();
      setSelectedTeamMember(null);
      Alert.alert(
        'Done',
        member.kind === 'invite' ? 'Invite was revoked.' : 'Teammate was removed from the organization.',
      );
    } catch (e) {
      Alert.alert('Remove failed', e.message || 'Could not remove.');
    }
  };

  const resetPasswordFields = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    if (changingPassword) return;

    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing fields', 'Fill in all three password fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak password', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert('Same password', 'Choose a new password that is different from the current one.');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      resetPasswordFields();
      Alert.alert('Success', 'Your password has been updated.');
    } catch (e) {
      Alert.alert('Could not update password', e.message || 'Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    if (loggingOut || loading) return;
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
    );
  };

  const ProfileItem = ({ icon, label, value, iconColor = AppTheme.accent }) => (
    <View style={styles.profileItem}>
      <View style={styles.profileItemLeft}>
        <Icon name={icon} size={24} color={iconColor} style={styles.profileIcon} />
        <Text style={styles.profileLabel}>{label}</Text>
      </View>
      <Text style={styles.profileValue}>{value || 'Not available'}</Text>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppTheme.accent} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <TopNavigator
        title="Profile"
        subtitle={activeOrganization?.name ? activeOrganization.name : undefined}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={profileLoading} onRefresh={handleRefresh} tintColor={AppTheme.accent} />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Icon name="account-circle" size={80} color={AppTheme.accent} />
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Organization</Text>
          {orgError ? <Text style={styles.errorHint}>{orgError}</Text> : null}
          {orgLoading ? (
            <ActivityIndicator color={AppTheme.accent} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={() => setOrgPickerVisible(true)}>
                <Icon name="office-building" size={20} color={AppTheme.accent} />
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionButtonTextInline}>Active organization</Text>
                  <Text style={styles.actionSubtext}>
                    {activeOrganization?.name || 'None selected'}
                    {activeOrganization?.isOwner ? ' · Owner' : ''}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={AppTheme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={() => setCreateOrgVisible(true)}>
                <Icon name="plus-circle-outline" size={20} color={AppTheme.success} />
                <Text style={styles.actionButtonText}>Create organization</Text>
                <Icon name="chevron-right" size={20} color={AppTheme.textMuted} />
              </TouchableOpacity>

              {can('organization', 'update') ? (
                <TouchableOpacity style={styles.actionButton} onPress={() => setInviteVisible(true)}>
                  <Icon name="account-plus-outline" size={20} color="#9b59b6" />
                  <Text style={styles.actionButtonText}>Invite teammate</Text>
                  <Icon name="chevron-right" size={20} color={AppTheme.textMuted} />
                </TouchableOpacity>
              ) : null}

              {can('organization', 'read') && teamMembers.length > 0 ? (
                <View style={styles.teamBlock}>
                  <Text style={styles.teamTitle}>Team ({teamMembers.length})</Text>
                  {teamLoading ? (
                    <ActivityIndicator color={AppTheme.accent} size="small" />
                  ) : (
                    teamMembers.map((row) => {
                      const name = teamDisplayName(row);
                      const email = row.email || '';
                      const pending = row.kind === 'invite' || row.status === 'pending';
                      const key = row.user_id || row.invitation_id || email;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={styles.teamRow}
                          onPress={() => setSelectedTeamMember(row)}
                          activeOpacity={0.75}
                        >
                          <View
                            style={[
                              styles.teamAvatar,
                              { backgroundColor: avatarColorFor(email || key) },
                            ]}
                          >
                            <Text style={styles.teamAvatarText}>{teamInitials(row)}</Text>
                          </View>
                          <View style={styles.teamTextBlock}>
                            <Text style={styles.teamName} numberOfLines={1}>{name}</Text>
                            {email ? (
                              <Text style={styles.teamEmail} numberOfLines={1}>{email}</Text>
                            ) : null}
                          </View>
                          {row.is_owner ? (
                            <Text style={styles.teamBadge}>Owner</Text>
                          ) : pending ? (
                            <Text style={styles.teamPendingBadge}>Pending</Text>
                          ) : (
                            <Icon name="chevron-right" size={20} color={AppTheme.textMuted} />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <ProfileItem icon="email" label="Email" value={userEmail} iconColor="#9b59b6" />

          <ProfileItem
            icon="calendar-clock"
            label="Member Since"
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            iconColor={AppTheme.success}
          />

          <ProfileItem
            icon="shield-check"
            label="Email Verified"
            value={user?.email_confirmed_at ? 'Yes' : 'No'}
            iconColor={user?.email_confirmed_at ? AppTheme.success : AppTheme.danger}
          />
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.foldHeader}
            onPress={() => {
              setPasswordSectionOpen((open) => {
                if (open) resetPasswordFields();
                return !open;
              });
            }}
            activeOpacity={0.7}
          >
            <View style={styles.foldHeaderLeft}>
              <Icon name="lock-reset" size={22} color={AppTheme.accent} />
              <Text style={styles.sectionTitleInline}>Change password</Text>
            </View>
            <Icon
              name={passwordSectionOpen ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={AppTheme.textMuted}
            />
          </TouchableOpacity>

          {passwordSectionOpen ? (
            <View style={styles.foldBody}>
              <Text style={styles.passwordHint}>
                Enter your current password, then choose a new one (at least 6 characters).
              </Text>
              <PasswordInput
                variant="dark"
                label="Current password"
                placeholder="Current password"
                value={oldPassword}
                onChangeText={setOldPassword}
                editable={!changingPassword}
              />
              <PasswordInput
                variant="dark"
                label="New password"
                placeholder="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!changingPassword}
              />
              <PasswordInput
                variant="dark"
                label="Confirm new password"
                placeholder="New password again"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!changingPassword}
              />
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  styles.passwordSubmitBtn,
                  changingPassword && styles.primaryBtnDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color={AppTheme.background} />
                ) : (
                  <Text style={styles.primaryBtnText}>Update password</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Account Actions</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleRefresh} disabled={profileLoading}>
            <Icon name="refresh" size={20} color={AppTheme.accent} />
            <Text style={styles.actionButtonText}>
              {profileLoading ? 'Refreshing...' : 'Refresh Profile'}
            </Text>
            <Icon name="chevron-right" size={20} color={AppTheme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
            disabled={loading || loggingOut}
          >
            <Icon name="logout" size={20} color={AppTheme.danger} />
            <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
              {loading || loggingOut ? 'Logging out...' : 'Logout'}
            </Text>
            <Icon name="chevron-right" size={20} color={AppTheme.danger} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={orgPickerVisible} animationType="slide" transparent onRequestClose={() => setOrgPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Switch organization</Text>
            <ScrollView>
              {organizations.map((org) => {
                const active = org.id === activeOrganization?.id;
                return (
                  <TouchableOpacity
                    key={org.id}
                    style={[styles.orgRow, active && styles.orgRowActive]}
                    onPress={() => handleSelectOrg(org.id)}
                  >
                    <Text style={styles.orgRowName}>{org.name}</Text>
                    {active ? <Icon name="check-circle" size={22} color={AppTheme.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setOrgPickerVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={createOrgVisible} animationType="fade" transparent onRequestClose={() => setCreateOrgVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New organization</Text>
            <TextInput
              style={styles.modalInput}
              value={newOrgName}
              onChangeText={setNewOrgName}
              placeholder="Organization name"
              placeholderTextColor={AppTheme.textMuted}
              editable={!creatingOrg}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, creatingOrg && styles.primaryBtnDisabled]}
              onPress={handleCreateOrg}
              disabled={creatingOrg || !newOrgName.trim()}
            >
              {creatingOrg ? (
                <ActivityIndicator color={AppTheme.background} />
              ) : (
                <Text style={styles.primaryBtnText}>Create</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setCreateOrgVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <OrganizationInviteModal
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        onSubmit={handleInviteSubmit}
      />

      <OrganizationMemberModal
        visible={!!selectedTeamMember}
        member={selectedTeamMember}
        canManage={canManageTeam}
        onClose={() => setSelectedTeamMember(null)}
        onSave={handleSaveTeamAccess}
        onRemove={handleRemoveTeamMember}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppTheme.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: AppTheme.textMuted,
  },
  header: {
    backgroundColor: AppTheme.surface,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppTheme.textPrimary,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: AppTheme.textSoft,
  },
  profileSection: {
    backgroundColor: AppTheme.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  actionsSection: {
    backgroundColor: AppTheme.surface,
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppTheme.accent,
    marginBottom: 15,
  },
  errorHint: {
    color: AppTheme.danger,
    marginBottom: 8,
    fontSize: 14,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    marginRight: 12,
  },
  profileLabel: {
    fontSize: 16,
    color: AppTheme.textSecondary,
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 16,
    color: AppTheme.textMuted,
    textAlign: 'right',
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  actionTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: AppTheme.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
  actionButtonTextInline: {
    fontSize: 16,
    color: AppTheme.textPrimary,
  },
  actionSubtext: {
    fontSize: 13,
    color: AppTheme.textMuted,
    marginTop: 2,
    marginLeft: 0,
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutButtonText: {
    color: AppTheme.danger,
  },
  teamBlock: {
    marginTop: 8,
    paddingTop: 8,
  },
  teamTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.textSoft,
    marginBottom: 8,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  teamTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  teamName: {
    color: AppTheme.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  teamEmail: {
    color: AppTheme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  teamBadge: {
    fontSize: 12,
    color: AppTheme.accent,
    fontWeight: '600',
  },
  teamPendingBadge: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: AppTheme.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.accent,
    marginBottom: 16,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  orgRowActive: {
    backgroundColor: AppTheme.accentMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  orgRowName: {
    fontSize: 16,
    color: AppTheme.textPrimary,
    flex: 1,
  },
  modalClose: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCloseText: {
    color: AppTheme.textSoft,
    fontSize: 16,
  },
  modalInput: {
    backgroundColor: AppTheme.background,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AppTheme.textPrimary,
    fontSize: 16,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: AppTheme.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: AppTheme.background,
    fontWeight: '700',
    fontSize: 16,
  },
  foldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foldHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionTitleInline: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppTheme.accent,
  },
  foldBody: {
    marginTop: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: AppTheme.border,
  },
  passwordHint: {
    color: AppTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  passwordSubmitBtn: {
    marginTop: 8,
  },
});

export default ProfileScreen;
