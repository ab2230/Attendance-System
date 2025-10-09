import { StyleSheet, Text, View, TouchableOpacity, FlatList, Modal, Alert, Animated, Dimensions, Easing, ScrollView } from 'react-native';
import React, { useState, useContext, useEffect, useRef } from 'react';
import { MemberContext } from '../../context/MemberContext';
import { ProgramContext } from '../../context/ProgramContext';
import { AttendanceContext } from '../../context/AttendanceContext';
import CustomDropDown from '../../common/CustomDropDown';
import AddProgramModal from './AddProgramModal';
import LoadingButton from '../../common/LoadingButton';
import ErrorModal from '../../common/ErrorModal';
import LoadingScreen from '../../common/LoadingScreen';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const AttendanceModal = ({ visible, onClose }) => {
  const { members, loading: membersLoading } = useContext(MemberContext);
  const { programs, addProgram, loading: programsLoading } = useContext(ProgramContext);
  const { markAttendance: saveAttendanceRecord, loading: attendanceLoading } = useContext(AttendanceContext);
  
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [programModal, setProgramModal] = useState(false);
  const [programName, setProgramName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMemberForTime, setSelectedMemberForTime] = useState(null);
  const [classStartTime, setClassStartTime] = useState(new Date());
  const [showClassTimePicker, setShowClassTimePicker] = useState(false);
  
  const scaleValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedProgramId) {
      const selectedProgram = programs.find((program) => program.id === selectedProgramId);
      if (selectedProgram) {
        const enrolledMembers = members.filter((member) =>
          selectedProgram.enrolledStudents.includes(member.id)
        );
        setFilteredMembers(enrolledMembers);
      }
    } else{
      setFilteredMembers([]);
    }
  }, [selectedProgramId, programs, members]);

  const handleAddProgram = async () => {
    try {
      if (!programName.trim()) {
        setError('Program name is required');
        setShowErrorModal(true);
        return;
      }
      
      setLocalLoading(true);
      setError(null);
      
      await addProgram(programName.trim());
      setProgramName('');
      setProgramModal(false);
      
    } catch (error) {
      console.error('Error adding program:', error);
      setError(error.message || 'Failed to add program. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleMarkAttendance = (memberId, status) => {
    setAttendance((prev) => {
      const updatedAttendance = prev.filter((record) => record.memberId !== memberId);
      const newRecord = { 
        memberId, 
        status,
        arrivalTime: status === 'Present' ? new Date().toTimeString().slice(0, 5) : null
      };
      updatedAttendance.push(newRecord);
      return updatedAttendance;
    });
  };

  const handleTimeSelection = (memberId) => {
    setSelectedMemberForTime(memberId);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime && selectedMemberForTime) {
      const timeString = selectedTime.toTimeString().slice(0, 5);
      setAttendance((prev) => 
        prev.map((record) => 
          record.memberId === selectedMemberForTime 
            ? { ...record, arrivalTime: timeString }
            : record
        )
      );
    }
    setSelectedMemberForTime(null);
  };

  const handleClassTimeChange = (event, selectedTime) => {
    setShowClassTimePicker(false);
    if (selectedTime) {
      setClassStartTime(selectedTime);
    }
  };

  const isLate = (arrivalTime) => {
    if (!arrivalTime) return false;
    const arrival = new Date(`2000-01-01T${arrivalTime}`);
    const start = new Date(`2000-01-01T${classStartTime.toTimeString().slice(0, 5)}`);
    return arrival > start;
  };

  const handleSaveAttendance = async () => {
    try {
      // Validation
      if (!selectedProgramId) {
        setError('Please select a program');
        setShowErrorModal(true);
        return;
      }
      
      if (attendance.length === 0) {
        setError('Please mark attendance for at least one student');
        setShowErrorModal(true);
        return;
      }
      
      setLocalLoading(true);
      setError(null);
      
      const attendanceRecord = {
        date: selectedDate.toISOString(),
        programId: selectedProgramId,
        classStartTime: classStartTime.toTimeString().slice(0, 5),
        members: attendance.map((att) => {
          const member = members.find((m) => m.id === att.memberId);
          return {
            memberId: att.memberId,
            status: att.status,
            classId: member?.classId,
            arrivalTime: att.arrivalTime,
            isLate: att.arrivalTime ? isLate(att.arrivalTime) : false
          };
        }),
        id: "Attendance" + Date.now().toString(),
      };
      
      await saveAttendanceRecord(attendanceRecord);
      
      // Reset form
      setAttendance([]);
      setSelectedProgramId(null);
      setProgramName('');
      onClose();
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      setError(error.message || 'Failed to save attendance. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLocalLoading(false);
    }
  };

  const onCancel = () => {
    setSelectedProgramId(null);
    setAttendance([]);
    onClose();
  };

  const renderItem = ({ item }) => {
    const memberAttendance = attendance.find(a => a.memberId === item.id);
    const arrivalTime = memberAttendance?.arrivalTime;
    const isPresent = memberAttendance?.status === 'Present';
    const studentIsLate = arrivalTime && isLate(arrivalTime);

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.memberClass}>
            {members.find(m => m.id === item.id)?.classId || 'No Class'}
          </Text>
          {isPresent && arrivalTime && (
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
                Arrived: {arrivalTime} {studentIsLate && '(Late)'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.statusButtonsContainer}>
          <TouchableOpacity
            onPress={() => handleMarkAttendance(item.id, 'Present')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={attendance.some(a => a.memberId === item.id && a.status === 'Present') 
                ? ['#43e97b', '#38f9d7'] 
                : ['#f8f9fa', '#e9ecef']}
              style={styles.statusButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="check" size={18} color={attendance.some(a => a.memberId === item.id && a.status === 'Present') ? 'white' : '#6c757d'} />
              <Text style={[
                styles.statusText,
                attendance.some(a => a.memberId === item.id && a.status === 'Present') && styles.activeStatusText
              ]}>
                Present
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {isPresent && (
            <TouchableOpacity
              onPress={() => handleTimeSelection(item.id)}
              activeOpacity={0.7}
              style={styles.timeButton}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.timeButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="access-time" size={16} color="white" />
                <Text style={styles.timeButtonText}>Time</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={() => handleMarkAttendance(item.id, 'Absent')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={attendance.some(a => a.memberId === item.id && a.status === 'Absent') 
                ? ['#ff6b6b', '#ff4545'] 
                : ['#f8f9fa', '#e9ecef']}
              style={styles.statusButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="close" size={18} color={attendance.some(a => a.memberId === item.id && a.status === 'Absent') ? 'white' : '#6c757d'} />
              <Text style={[
                styles.statusText,
                attendance.some(a => a.memberId === item.id && a.status === 'Absent') && styles.activeStatusText
              ]}>
                Absent
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="none" transparent={true}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeValue }]}>
        <BlurView
          style={styles.absolute}
          blurType="dark"
          blurAmount={10}
          reducedTransparencyFallbackColor="black"
        />
        
        <Animated.View style={[
          styles.modalContainer, 
          { 
            transform: [{ scale: scaleValue }],
            opacity: fadeValue
          }
        ]}>
          {/* Header with gradient */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Take Attendance</Text>
            <TouchableOpacity 
              onPress={onCancel} 
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Icon name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Modal Content */}
                   {/* Modal Content */}
          <View style={styles.modalContent}>
            {/* Date Picker */}
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)} 
              style={styles.datePickerButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#f8f9fa', '#e9ecef']}
                style={styles.datePickerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="calendar-today" size={20} color="#6c757d" />
                <Text style={styles.datePickerText}>
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
                <Icon name="chevron-right" size={20} color="#6c757d" />
              </LinearGradient>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setSelectedDate(date);
                }}
              />
            )}

            {/* Class Start Time Picker */}
            <TouchableOpacity 
              onPress={() => setShowClassTimePicker(true)} 
              style={styles.timePickerButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#fff3cd', '#ffeaa7']}
                style={styles.timePickerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="schedule" size={20} color="#856404" />
                <Text style={styles.timePickerText}>
                  Class Start Time: {classStartTime.toTimeString().slice(0, 5)}
                </Text>
                <Icon name="chevron-right" size={20} color="#856404" />
              </LinearGradient>
            </TouchableOpacity>
            {showClassTimePicker && (
              <DateTimePicker
                value={classStartTime}
                mode="time"
                display="default"
                onChange={handleClassTimeChange}
              />
            )}

            {/* Program Dropdown */}
            <CustomDropDown
              label="Select Program"
              rightBtn={true}
              rightBtnLabel="Add Program"
              data={programs}
              currentSelected={programs.find((program) => program.id === selectedProgramId)}
              setSelected={(input) => setSelectedProgramId(input.id)}
              required={true}
              rightBtnGo={() => setProgramModal(true)}
              containerStyle={styles.dropdownContainer}
            />
            <AddProgramModal
              visible={programModal}
              programName={programName}
              setProgramName={setProgramName}
              onClose={() => setProgramModal(false)}
              isEditing={false}
              editingProgram={null}
            />

            {/* Member List */}
            <Text style={styles.sectionTitle}>Mark Attendance</Text>
            <ScrollView style={{marginBottom:300}}>
              <FlatList
                data={filteredMembers}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Icon name="people-outline" size={40} color="#6c757d" />
                    <Text style={styles.emptyText}>No students enrolled</Text>
                    <Text style={styles.emptySubText}>Select a program to view students</Text>
                  </View>
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                scrollEnabled={false}
              />

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  onPress={handleSaveAttendance} 
                  disabled={localLoading || attendanceLoading}
                  style={[styles.saveButton, (localLoading || attendanceLoading) && styles.disabledButton]}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={(localLoading || attendanceLoading) ? ['#e9ecef', '#dee2e6'] : ['#43e97b', '#38f9d7']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {(localLoading || attendanceLoading) ? (
                      <>
                        <Icon name="hourglass-empty" size={20} color="#6c757d" style={styles.buttonIcon} />
                        <Text style={[styles.buttonText, styles.disabledButtonText]}>Saving...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Save Attendance</Text>
                        <Icon name="save" size={20} color="white" style={styles.buttonIcon} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Time Picker for Individual Students */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
      
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Error"
        message={error}
        onRetry={error && error.includes('attendance') ? handleSaveAttendance : handleAddProgram}
        buttonText="Try Again"
      />
      
      {(localLoading || attendanceLoading || programsLoading || membersLoading) && (
        <LoadingScreen
          overlay={true}
          text={localLoading ? "Processing..." : "Loading data..."}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: '85%',
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
  datePickerButton: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  datePickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  datePickerText: {
    fontSize: 16,
    color: '#343a40',
    marginHorizontal: 10,
    flex: 1,
  },
  timePickerButton: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  timePickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  timePickerText: {
    fontSize: 16,
    color: '#856404',
    marginHorizontal: 10,
    flex: 1,
    fontWeight: '600',
  },
  dropdownContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 15,
    marginTop: 10,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 4,
  },
  memberClass: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
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
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  timeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  timeButtonText: {
    fontSize: 12,
    marginLeft: 4,
    color: 'white',
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 5,
    color: '#6c757d',
  },
  activeStatusText: {
    color: 'white',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 5,
  },
  separator: {
    height: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    flex: 1,
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
  disabledButton: {
    opacity: 0.7,
  },
  disabledButtonText: {
    color: '#6c757d',
  },
});

export default AttendanceModal;
