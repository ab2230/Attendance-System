import { StyleSheet, Text, View, TouchableOpacity, FlatList, Modal } from 'react-native';
import React, { useState, useContext, useEffect } from 'react';
import { ClassContext } from '../../context/ClassContext';
import { MemberContext } from '../../context/MemberContext';
import { ProgramContext } from '../../context/ProgramContext';
import { AttendanceContext } from '../../context/AttendanceContext';
import CustomDropDown from '../../common/CustomDropDown';
import AddProgramModal from './AddProgramModal';
import DateTimePicker from '@react-native-community/datetimepicker'; // Add this import

const AttendanceModal = ({ visible, onClose }) => {
  const { classes } = useContext(ClassContext);
  const { members } = useContext(MemberContext);
  const { programs, addProgram } = useContext(ProgramContext);
  const { attendanceRecords, markAttendance: saveAttendanceRecord } = useContext(AttendanceContext);

  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [programModal, setProgramModal] = useState(false);
  const [programName, setProgramName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (selectedClassId) {
      setFilteredMembers(members.filter((m) => m.classId === selectedClassId));
    }
  }, [selectedClassId, members]);

  const handleAddProgram = () => {
    const newProgram = {
      id: Date.now().toString(),
      name: programName,
      classId: selectedClassId,
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
    saveAttendanceRecord({
      date: selectedDate.toISOString(),
      programId: selectedProgramId,
      classId: selectedClassId,
      members: attendance
    });
    setAttendance([]);
    setSelectedProgramId(null);
    setSelectedClassId(null);
  };

  const onCancel = () => {
    setSelectedClassId(null);
    setSelectedProgramId(null);
    setAttendance([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Attendance</Text>

          {/* Date Picker */}
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
            <Text style={styles.datePickerText}>Select Date: {selectedDate.toDateString()}</Text>
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

          {/* Class Dropdown */}
          <CustomDropDown
            label="Select Class"
            data={classes}
            currentSelected={classes.find((cls) => cls.id === selectedClassId)}
            setSelected={(input) => setSelectedClassId(input.id)}
            required={true}
          />

          {/* Program Dropdown */}
          {selectedClassId && (
            <>
              <CustomDropDown
                label="Select Program"
                rightBtn={true}
                rightBtnLabel="Add Program"
                data={programs}
                currentSelected={programs.find((program) => program.id === selectedProgramId)}
                setSelected={(input) => setSelectedProgramId(input.id)}
                required={true}
                rightBtnGo={() => setProgramModal(true)}
              />
              <AddProgramModal
                visible={programModal}
                programName={programName}
                setProgramName={setProgramName}
                onClose={() => setProgramModal(false)}
                onAddProgram={handleAddProgram}
              />
            </>
          )}

          {/* Member List */}
          <Text style={styles.sectionTitle}>Mark Attendance</Text>
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.memberCard}>
                <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
                <View style={styles.statusButtonsContainer}>
                  <TouchableOpacity
                    onPress={() => handleMarkAttendance(item.id, 'Present')}
                    style={[
                      styles.statusButton,
                      attendance.some((a) => a.memberId === item.id && a.status === 'Present') && styles.activeStatusButton,
                    ]}
                  >
                    <Text style={styles.statusText}>Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMarkAttendance(item.id, 'Absent')}
                    style={[
                      styles.statusButton,
                      attendance.some((a) => a.memberId === item.id && a.status === 'Absent') && styles.activeStatusButton,
                    ]}
                  >
                    <Text style={styles.statusText}>Absent</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancelButton]}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveAttendance} style={[styles.button, styles.saveButton]}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AttendanceModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  memberName: {
    fontSize: 16,
    color: '#333',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  activeStatusButton: {
    backgroundColor: '#007bff',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});