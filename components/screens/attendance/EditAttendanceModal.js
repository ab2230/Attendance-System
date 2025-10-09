import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Alert,
  Dimensions 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

const EditAttendanceModal = ({ 
  visible, 
  onClose, 
  selectedRecord, 
  members, 
  programs,
  handleUpdateAttendance,
  handleSaveUpdatedAttendance 
}) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMemberForTime, setSelectedMemberForTime] = useState(null);
  const [showClassTimePicker, setShowClassTimePicker] = useState(false);
  const [localRecord, setLocalRecord] = useState(null);

  useEffect(() => {
    if (selectedRecord) {
      setLocalRecord({ ...selectedRecord });
    }
  }, [selectedRecord]);

  if (!selectedRecord || !localRecord) return null;

  const getProgramName = (programId) => {
    const program = programs.find(p => p.id === programId);
    return program ? program.name : 'Unknown Program';
  };

  const getMemberName = (memberId) => {
    const member = members.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : 'Unknown Member';
  };

  const handleTimeSelection = (memberId) => {
    setSelectedMemberForTime(memberId);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime && selectedMemberForTime) {
      const timeString = selectedTime.toTimeString().slice(0, 5);
      handleUpdateAttendance(selectedMemberForTime, 'Present', timeString);
    }
    setSelectedMemberForTime(null);
  };

  const handleClassTimeChange = (event, selectedTime) => {
    setShowClassTimePicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toTimeString().slice(0, 5);
      setLocalRecord({ ...localRecord, classStartTime: timeString });
    }
  };

  const isLate = (arrivalTime, classStartTime) => {
    if (!arrivalTime || !classStartTime) return false;
    const arrival = new Date(`2000-01-01T${arrivalTime}`);
    const start = new Date(`2000-01-01T${classStartTime}`);
    return arrival > start;
  };

  const renderMemberItem = ({ item }) => {
    const member = members.find(m => m.id === item.memberId);
    const memberName = member ? `${member.firstName} ${member.lastName}` : 'Unknown';
    const isPresent = item.status === 'Present';
    const studentIsLate = item.arrivalTime && localRecord.classStartTime && 
      isLate(item.arrivalTime, localRecord.classStartTime);

    return (
      <View style={styles.memberRow}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{memberName}</Text>
          {isPresent && item.arrivalTime && (
            <View style={styles.timeContainer}>
              <Icon 
                name={studentIsLate ? "schedule" : "check-circle"} 
                size={14} 
                color={studentIsLate ? "#ff6b6b" : "#43e97b"} 
              />
              <Text style={[
                styles.timeText,
                studentIsLate && styles.lateTimeText
              ]}>
                Arrived: {item.arrivalTime} {studentIsLate && '(Late)'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => handleUpdateAttendance(item.memberId, 'Present', item.arrivalTime)}
            style={[
              styles.statusButton,
              item.status === 'Present' && styles.presentButton
            ]}
          >
            <Icon 
              name="check" 
              size={16} 
              color={item.status === 'Present' ? 'white' : '#43e97b'} 
            />
            <Text style={[
              styles.buttonText,
              item.status === 'Present' && styles.activeButtonText
            ]}>
              Present
            </Text>
          </TouchableOpacity>

          {isPresent && (
            <TouchableOpacity
              onPress={() => handleTimeSelection(item.memberId)}
              style={styles.timeButton}
            >
              <Icon name="access-time" size={14} color="#667eea" />
              <Text style={styles.timeButtonText}>Time</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => handleUpdateAttendance(item.memberId, 'Absent')}
            style={[
              styles.statusButton,
              item.status === 'Absent' && styles.absentButton
            ]}
          >
            <Icon 
              name="close" 
              size={16} 
              color={item.status === 'Absent' ? 'white' : '#ff6b6b'} 
            />
            <Text style={[
              styles.buttonText,
              item.status === 'Absent' && styles.activeButtonText
            ]}>
              Absent
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Edit Attendance</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            {/* Record Info */}
            <View style={styles.recordInfo}>
              <Text style={styles.programName}>{getProgramName(selectedRecord.programId)}</Text>
              <Text style={styles.recordDate}>
                {new Date(selectedRecord.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              
              {/* Class Start Time */}
              <TouchableOpacity 
                onPress={() => setShowClassTimePicker(true)}
                style={styles.classTimeButton}
              >
                <Icon name="schedule" size={16} color="#667eea" />
                <Text style={styles.classTimeText}>
                  Class Start: {localRecord.classStartTime || 'Not Set'}
                </Text>
                <Icon name="edit" size={16} color="#667eea" />
              </TouchableOpacity>
            </View>

            {/* Members List */}
            <Text style={styles.sectionTitle}>Students ({selectedRecord.members.length})</Text>
            <FlatList
              data={selectedRecord.members}
              keyExtractor={(item) => item.memberId}
              renderItem={renderMemberItem}
              style={styles.membersList}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveUpdatedAttendance} style={styles.saveButton}>
                <LinearGradient
                  colors={['#43e97b', '#38f9d7']}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Time Pickers */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {showClassTimePicker && (
        <DateTimePicker
          value={localRecord.classStartTime ? 
            new Date(`2000-01-01T${localRecord.classStartTime}`) : 
            new Date()
          }
          mode="time"
          display="default"
          onChange={handleClassTimeChange}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  recordInfo: {
    marginBottom: 20,
  },
  programName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 5,
  },
  recordDate: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 10,
  },
  classTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  classTimeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#343a40',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 15,
  },
  membersList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#343a40',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#43e97b',
    marginLeft: 4,
    fontWeight: '500',
  },
  lateTimeText: {
    color: '#ff6b6b',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  presentButton: {
    backgroundColor: '#43e97b',
    borderColor: '#43e97b',
  },
  absentButton: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  buttonText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#6c757d',
  },
  activeButtonText: {
    color: 'white',
  },
  timeButtonText: {
    fontSize: 11,
    marginLeft: 3,
    color: '#667eea',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    padding: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default EditAttendanceModal;
