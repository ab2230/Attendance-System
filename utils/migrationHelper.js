import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import supabaseService from '../services/supabaseService';

class MigrationHelper {
  async checkForLocalData() {
    try {
      const [classes, members, programs, attendance] = await Promise.all([
        AsyncStorage.getItem('classes'),
        AsyncStorage.getItem('members'),
        AsyncStorage.getItem('programs'),
        AsyncStorage.getItem('attendance')
      ]);

      const hasLocalData = !!(classes || members || programs || attendance);
      
      if (hasLocalData) {
        return {
          hasData: true,
          data: {
            classes: classes ? JSON.parse(classes) : [],
            members: members ? JSON.parse(members) : [],
            programs: programs ? JSON.parse(programs) : [],
            attendanceRecords: attendance ? JSON.parse(attendance) : []
          }
        };
      }

      return { hasData: false, data: null };
    } catch (error) {
      console.error('Error checking local data:', error);
      return { hasData: false, data: null };
    }
  }

  async migrateLocalDataToSupabase() {
    try {
      const { hasData, data } = await this.checkForLocalData();
      
      if (!hasData) {
        return { success: true, message: 'No local data to migrate' };
      }

      // Show confirmation dialog
      return new Promise((resolve) => {
        Alert.alert(
          'Migrate Local Data',
          'We found existing data on your device. Would you like to migrate it to your Supabase account? This will sync your data across all devices.',
          [
            {
              text: 'Skip',
              style: 'cancel',
              onPress: () => resolve({ success: false, message: 'Migration skipped' })
            },
            {
              text: 'Migrate',
              onPress: async () => {
                try {
                  await this.performMigration(data);
                  await this.clearLocalData();
                  resolve({ success: true, message: 'Data migrated successfully!' });
                } catch (error) {
                  console.error('Migration error:', error);
                  resolve({ success: false, message: error.message });
                }
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  }

  async performMigration(localData) {
    try {
      // Step 1: Migrate classes
      const classMapping = {};
      if (localData.classes && localData.classes.length > 0) {
        for (const cls of localData.classes) {
          const newClass = await supabaseService.addClass(cls.name);
          classMapping[cls.id] = newClass.id;
        }
      }

      // Step 2: Migrate members with updated class references
      const memberMapping = {};
      if (localData.members && localData.members.length > 0) {
        for (const member of localData.members) {
          const newClassId = classMapping[member.classId] || null;
          const newMember = await supabaseService.addMember(
            member.firstName,
            member.lastName,
            newClassId
          );
          memberMapping[member.id] = newMember.id;
        }
      }

      // Step 3: Migrate programs
      const programMapping = {};
      if (localData.programs && localData.programs.length > 0) {
        for (const program of localData.programs) {
          const newProgram = await supabaseService.addProgram(program.name);
          programMapping[program.id] = newProgram.id;

          // Migrate enrollments
          if (program.enrolledStudents && program.enrolledStudents.length > 0) {
            const newMemberIds = program.enrolledStudents
              .map(oldId => memberMapping[oldId])
              .filter(id => id); // Remove any undefined mappings
            
            if (newMemberIds.length > 0) {
              await supabaseService.enrollStudents(newProgram.id, newMemberIds);
            }
          }
        }
      }

      // Step 4: Migrate attendance records
      if (localData.attendanceRecords && localData.attendanceRecords.length > 0) {
        for (const record of localData.attendanceRecords) {
          const newProgramId = programMapping[record.programId];
          
          if (newProgramId && record.members && record.members.length > 0) {
            const mappedMembers = record.members
              .map(member => {
                const newMemberId = memberMapping[member.memberId];
                if (newMemberId) {
                  return {
                    memberId: newMemberId,
                    status: member.status,
                    arrivalTime: member.arrivalTime,
                    isLate: member.isLate
                  };
                }
                return null;
              })
              .filter(member => member !== null);

            if (mappedMembers.length > 0) {
              await supabaseService.saveAttendanceRecord({
                programId: newProgramId,
                date: record.date,
                classStartTime: record.classStartTime,
                members: mappedMembers
              });
            }
          }
        }
      }

      return { success: true, message: 'Migration completed successfully' };
    } catch (error) {
      console.error('Perform migration error:', error);
      throw error;
    }
  }

  async clearLocalData() {
    try {
      await Promise.all([
        AsyncStorage.removeItem('classes'),
        AsyncStorage.removeItem('members'),
        AsyncStorage.removeItem('programs'),
        AsyncStorage.removeItem('attendance')
      ]);
      
      console.log('Local data cleared after successful migration');
    } catch (error) {
      console.error('Error clearing local data:', error);
      // Don't throw here as migration was successful
    }
  }

  async createBackupOfLocalData() {
    try {
      const { hasData, data } = await this.checkForLocalData();
      
      if (hasData) {
        const backup = {
          timestamp: new Date().toISOString(),
          data: data
        };
        
        await AsyncStorage.setItem('local_data_backup', JSON.stringify(backup));
        return { success: true, message: 'Backup created successfully' };
      }
      
      return { success: false, message: 'No data to backup' };
    } catch (error) {
      console.error('Backup error:', error);
      throw error;
    }
  }

  async restoreFromBackup() {
    try {
      const backup = await AsyncStorage.getItem('local_data_backup');
      
      if (!backup) {
        return { success: false, message: 'No backup found' };
      }

      const backupData = JSON.parse(backup);
      
      // Restore local data
      await Promise.all([
        AsyncStorage.setItem('classes', JSON.stringify(backupData.data.classes || [])),
        AsyncStorage.setItem('members', JSON.stringify(backupData.data.members || [])),
        AsyncStorage.setItem('programs', JSON.stringify(backupData.data.programs || [])),
        AsyncStorage.setItem('attendance', JSON.stringify(backupData.data.attendanceRecords || []))
      ]);

      return { success: true, message: 'Data restored from backup' };
    } catch (error) {
      console.error('Restore error:', error);
      throw error;
    }
  }

  async showMigrationStatus() {
    try {
      const { hasData } = await this.checkForLocalData();
      const user = await supabaseService.getCurrentUser();
      
      return {
        hasLocalData: hasData,
        isAuthenticated: !!user,
        needsMigration: hasData && !!user
      };
    } catch (error) {
      console.error('Migration status error:', error);
      return {
        hasLocalData: false,
        isAuthenticated: false,
        needsMigration: false
      };
    }
  }
}

export default new MigrationHelper();
