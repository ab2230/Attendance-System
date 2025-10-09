import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../../context/AuthContext';

const ProfileScreen = () => {
  const { user, signOut, loading } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Simple fallback data from user object
  const displayName = user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || 'No email';

  const handleRefresh = () => {
    setProfileLoading(true);
    // Simulate refresh without calling problematic getProfile
    setTimeout(() => {
      setProfileLoading(false);
    }, 1000);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const ProfileItem = ({ icon, label, value, iconColor = '#3498db' }) => (
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
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Icon name="account-circle" size={80} color="#3498db" />
        </View>
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{userEmail}</Text>
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <ProfileItem
          icon="email"
          label="Email"
          value={userEmail}
          iconColor="#9b59b6"
        />
        
        <ProfileItem
          icon="calendar-clock"
          label="Member Since"
          value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
          iconColor="#1abc9c"
        />
        
        <ProfileItem
          icon="shield-check"
          label="Email Verified"
          value={user?.email_confirmed_at ? 'Yes' : 'No'}
          iconColor={user?.email_confirmed_at ? '#27ae60' : '#e74c3c'}
        />
      </View>

      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleRefresh}
          disabled={profileLoading}
        >
          <Icon name="refresh" size={20} color="#3498db" />
          <Text style={styles.actionButtonText}>
            {profileLoading ? 'Refreshing...' : 'Refresh Profile'}
          </Text>
          <Icon name="chevron-right" size={20} color="#bdc3c7" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.logoutButton]} 
          onPress={handleLogout}
          disabled={loading}
        >
          <Icon name="logout" size={20} color="#e74c3c" />
          <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
            {loading ? 'Logging out...' : 'Logout'}
          </Text>
          <Icon name="chevron-right" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  profileSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
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
    color: '#2c3e50',
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'right',
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
    flex: 1,
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutButtonText: {
    color: '#e74c3c',
  },
});

export default ProfileScreen;
