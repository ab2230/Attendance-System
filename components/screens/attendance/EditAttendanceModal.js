// EditAttendanceModal.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { ScrollView } from 'react-native-gesture-handler';

const EditAttendanceModal = ({ 
  visible, 
  onClose, 
  selectedRecord, 
  members, 
  programs,
  handleUpdateAttendance,
  handleSaveUpdatedAttendance 
}) => {
  const getProgramName = (programId) => {
    const programObj = programs.find((prog) => prog.id === programId);
    return programObj ? programObj.name : "Unknown Program";
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.modalTitle}>Attendance Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <View style={styles.modalContent}>
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Icon name="calendar-today" size={18} color="#6c757d" />
                <Text style={styles.infoText}>
                  {new Date(selectedRecord?.date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="class" size={18} color="#6c757d" />
                <Text style={styles.infoText}>
                  {getProgramName(selectedRecord?.programId)}
                </Text>
              </View>
            </View>

            {/* Attendance List */}
            <View style={styles.attendanceList}>
                <ScrollView style={{marginBottom:300}}>
              {selectedRecord?.members.map((member) => {
                const memberInfo = members.find((m) => m.id === member.memberId);
                return (
                  <View key={member.memberId} style={styles.attendanceItem}>
                    <Text style={styles.memberName}>
                      {memberInfo?.firstName} {memberInfo?.lastName}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        handleUpdateAttendance(
                          member.memberId,
                          member.status === "Present" ? "Absent" : "Present"
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={
                          member.status === "Present" 
                            ? ['#43e97b', '#38f9d7'] 
                            : ['#ff6b6b', '#ff4545']
                        }
                        style={styles.statusButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.statusText}>{member.status}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                );
              })}
               {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                onPress={handleSaveUpdatedAttendance} 
                style={styles.saveButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#43e97b', '#38f9d7']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>Save Changes</Text>
                  <Icon name="save" size={20} color="white" style={styles.buttonIcon} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            </ScrollView>
            </View>

           
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    paddingVertical: 20,
    paddingHorizontal: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 5,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#343a40',
    marginLeft: 10,
  },
  attendanceList: {
  
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  memberName: {
    fontSize: 16,
    color: '#343a40',
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 10,
  },
});

export default EditAttendanceModal;