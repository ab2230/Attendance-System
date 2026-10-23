import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TopNavigator from '../../common/TopNavigator';
import { AuthContext } from '../../context/AuthContext';
import { ClassContext } from '../../context/ClassContext';
import { MemberContext } from '../../context/MemberContext';
import { ProgramContext } from '../../context/ProgramContext';
import { AttendanceContext } from '../../context/AttendanceContext';
import AppTheme from '../../theme/appTheme';

const ProfileScreen = () => {
  const { user, signOut, loading } = useContext(AuthContext);
  const { loadClasses } = useContext(ClassContext);
  const { loadMembers } = useContext(MemberContext);
  const { loadPrograms } = useContext(ProgramContext);
  const { loadAttendanceRecords } = useContext(AttendanceContext);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || 'No email';

  const handleRefresh = async () => {
    if (profileLoading) return;
    setProfileLoading(true);
    try {
      await Promise.all([
        loadClasses(),
        loadMembers(),
        loadPrograms(),
        loadAttendanceRecords({ silent: true }),
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setProfileLoading(false);
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
      <TopNavigator title="Profile" />
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
  actionButtonText: {
    fontSize: 16,
    color: AppTheme.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutButtonText: {
    color: AppTheme.danger,
  },
});

export default ProfileScreen;
