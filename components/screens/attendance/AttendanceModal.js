import { StyleSheet, Text, View, TouchableOpacity, FlatList, Modal, Alert, Animated, Dimensions, Easing, ScrollView } from 'react-native';
import React, { useState, useContext, useEffect, useRef } from 'react';
import { MemberContext } from '../../context/MemberContext';
import { ProgramContext } from '../../context/ProgramContext';
import { AttendanceContext } from '../../context/AttendanceContext';
import CustomDropDown from '../../common/CustomDropDown';
import AddProgramModal from './AddProgramModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const AttendanceModal = ({ visible, onClose }) => {
  const { members } = useContext(MemberContext);
  const { programs, addProgram } = useContext(ProgramContext);
  const { markAttendance: saveAttendanceRecord } = useContext(AttendanceContext);

  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [programModal, setProgramModal] = useState(false);
  const [programName, setProgramName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
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

  const handleAddProgram = () => {
    const newProgram = {
      id: Date.now().toString(),
      name: programName,
      enrolledStudents: [],
    };
    addProgram(newProgram);
    setSelectedProgramId(newProgram.id);
    setProgramModal(false);
  };

  const handleMarkAttendance = (memberId, status) => {
    setAttendance((prev) => {
      const updatedAttendance = prev.filter((record) => record.memberId !== memberId);
      updatedAttendance.push({ memberId, status });
      return updatedAttendance;
    });
  };

  const handleSaveAttendance = () => {
    if (selectedProgramId) {
      const attendanceRecord = {
        date: selectedDate.toISOString(),
        programId: selectedProgramId,
        members: attendance.map((att) => {
          const member = members.find((m) => m.id === att.memberId);
          return {
            memberId: att.memberId,
            status: att.status,
            classId: member.classId,
          };
        }),
        id: "Attendance" + Date.now().toString(),
      };
      saveAttendanceRecord(attendanceRecord);
      setAttendance([]);
      setSelectedProgramId(null);
      onClose();
    } else {
      Alert.alert("Please select a program");
    }
  };

  const onCancel = () => {
    setSelectedProgramId(null);
    setAttendance([]);
    onClose();
  };

  const renderItem = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.memberClass}>
          {members.find(m => m.id === item.id)?.classId || 'No Class'}
        </Text>
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
              onAddProgram={handleAddProgram}
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
                style={styles.saveButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#43e97b', '#38f9d7']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>Save Attendance</Text>
                  <Icon name="save" size={20} color="white" style={styles.buttonIcon} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>
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
    marginBottom: 20,
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
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
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

export default AttendanceModal;