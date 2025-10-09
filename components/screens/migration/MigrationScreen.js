import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthContext } from '../../context/AuthContext';
import migrationHelper from '../../../utils/migrationHelper';

const MigrationScreen = ({ navigation }) => {
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      setLoading(true);
      const status = await migrationHelper.showMigrationStatus();
      setMigrationStatus(status);
    } catch (error) {
      console.error('Error checking migration status:', error);
      Alert.alert('Error', 'Failed to check migration status');
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async () => {
    try {
      setMigrating(true);
      
      // Create backup first
      await migrationHelper.createBackupOfLocalData();
      
      // Perform migration
      const result = await migrationHelper.migrateLocalDataToSupabase();
      
      if (result.success) {
        Alert.alert(
          'Success!',
          'Your data has been successfully migrated to the cloud. You can now access it from any device.',
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('Home')
            }
          ]
        );
      } else {
        Alert.alert('Migration Skipped', result.message);
        navigation.replace('Home');
      }
    } catch (error) {
      console.error('Migration error:', error);
      Alert.alert(
        'Migration Failed',
        `Failed to migrate data: ${error.message}. Your local data is still safe.`,
        [
          {
            text: 'Try Again',
            onPress: handleMigration
          },
          {
            text: 'Skip for Now',
            style: 'cancel',
            onPress: () => navigation.replace('Home')
          }
        ]
      );
    } finally {
      setMigrating(false);
    }
  };

  const handleSkipMigration = () => {
    Alert.alert(
      'Skip Migration?',
      'You can migrate your data later from the settings. Your local data will remain on this device only.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Skip',
          onPress: () => navigation.replace('Home')
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Checking your data...</Text>
      </View>
    );
  }

  if (!migrationStatus?.needsMigration) {
    // No migration needed, go to home
    navigation.replace('Home');
    return null;
  }

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Icon name="cloud-upload" size={80} color="white" />
            <Text style={styles.title}>Migrate Your Data</Text>
            <Text style={styles.subtitle}>
              We found existing data on your device. Let's move it to the cloud for better security and multi-device access.
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Benefits of Cloud Storage:</Text>
            
            <View style={styles.benefit}>
              <Icon name="devices" size={24} color="white" />
              <Text style={styles.benefitText}>Access from any device</Text>
            </View>
            
            <View style={styles.benefit}>
              <Icon name="backup" size={24} color="white" />
              <Text style={styles.benefitText}>Automatic backups</Text>
            </View>
            
            <View style={styles.benefit}>
              <Icon name="security" size={24} color="white" />
              <Text style={styles.benefitText}>Secure & encrypted</Text>
            </View>
            
            <View style={styles.benefit}>
              <Icon name="sync" size={24} color="white" />
              <Text style={styles.benefitText}>Real-time sync</Text>
            </View>
          </View>

          {/* Migration Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>What will be migrated:</Text>
            <Text style={styles.infoText}>• All your classes and students</Text>
            <Text style={styles.infoText}>• Programs and enrollments</Text>
            <Text style={styles.infoText}>• Attendance records and history</Text>
            <Text style={styles.infoText}>• Settings and preferences</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.migrateButton}
              onPress={handleMigration}
              disabled={migrating}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#43e97b', '#38f9d7']}
                style={styles.buttonGradient}
              >
                {migrating ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.buttonText}>Migrating...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="cloud-upload" size={20} color="white" />
                    <Text style={styles.buttonText}>Migrate Now</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipMigration}
              disabled={migrating}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>

          {/* Safety Note */}
          <View style={styles.safetyNote}>
            <Icon name="info" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.safetyText}>
              Your local data will be safely backed up before migration. You can restore it if needed.
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  benefitsContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 12,
  },
  infoContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
    paddingLeft: 8,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  migrateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  skipButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  safetyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});

export default MigrationScreen;
