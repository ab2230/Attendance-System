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
import supabaseService from '../../../services/supabaseService';

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
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const displayName = user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || 'No email';

  const loadTeam = useCallback(async () => {
    if (!activeOrganization?.id || !can('organization', 'read')) {
      setTeamMembers([]);
      return;
    }
    try {
      setTeamLoading(true);
      const rows = await supabaseService.getOrganizationMembers(activeOrganization.id);
      setTeamMembers(rows);
    } catch (e) {
      console.error(e);
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
                      const profile = row.profiles;
                      const label =
                        profile?.email ||
                        `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
                        row.user_id?.slice(0, 8);
                      return (
                        <View key={row.user_id} style={styles.teamRow}>
                          <Icon
                            name={row.is_owner ? 'crown' : 'account'}
                            size={18}
                            color={row.is_owner ? AppTheme.accent : AppTheme.textMuted}
                          />
                          <Text style={styles.teamName}>{label}</Text>
                          {row.is_owner ? (
                            <Text style={styles.teamBadge}>Owner</Text>
                          ) : null}
                        </View>
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
          <Text style={styles.sectionTitle}>Change password</Text>
          <Text style={styles.passwordHint}>
            Enter your current password, then choose a new one (at least 6 characters).
          </Text>
          <Text style={styles.inputLabel}>Current password</Text>
          <TextInput
            style={styles.passwordInput}
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="Current password"
            placeholderTextColor={AppTheme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!changingPassword}
          />
          <Text style={styles.inputLabel}>New password</Text>
          <TextInput
            style={styles.passwordInput}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor={AppTheme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!changingPassword}
          />
          <Text style={styles.inputLabel}>Confirm new password</Text>
          <TextInput
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="New password again"
            placeholderTextColor={AppTheme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!changingPassword}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, styles.passwordSubmitBtn, changingPassword && styles.primaryBtnDisabled]}
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
    paddingVertical: 6,
    gap: 8,
  },
  teamName: {
    flex: 1,
    color: AppTheme.textPrimary,
    fontSize: 14,
  },
  teamBadge: {
    fontSize: 12,
    color: AppTheme.accent,
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
  passwordHint: {
    color: AppTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  inputLabel: {
    color: AppTheme.textSoft,
    fontSize: 14,
    marginBottom: 6,
    marginTop: 4,
  },
  passwordInput: {
    backgroundColor: AppTheme.background,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AppTheme.textPrimary,
    fontSize: 16,
    marginBottom: 8,
  },
  passwordSubmitBtn: {
    marginTop: 8,
  },
});

export default ProfileScreen;
