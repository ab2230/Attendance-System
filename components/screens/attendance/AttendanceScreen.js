import React, { useState, useContext } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import TopNavigator from '../../common/TopNavigator';
import AttendanceModal from './AttendanceModal';
import EditAttendanceModal from './EditAttendanceModal';
import AddButton from '../../common/addButton';
import { AttendanceContext } from '../../context/AttendanceContext';
import { MemberContext } from '../../context/MemberContext';
import { ClassContext } from '../../context/ClassContext';
import { ProgramContext } from '../../context/ProgramContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustomDropDown from '../../common/CustomDropDown';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';

const AttendanceScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const { attendanceRecords, updateAttendance, deleteAttendance, getLateStudents } = useContext(AttendanceContext);
  const { members } = useContext(MemberContext);
  const { classes } = useContext(ClassContext);
  const { programs } = useContext(ProgramContext);

  const [filterProgram, setFilterProgram] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterDate, setFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getClassName = (classId) => {
    const classObj = classes.find((cls) => cls.id === classId);
    return classObj ? classObj.name : "Unknown Class";
  };

  const getProgramName = (programId) => {
    const programObj = programs.find((prog) => prog.id === programId);
    return programObj ? programObj.name : "Unknown Program";
  };

  const getMemberName = (memberId) => {
    const memberObj = members.find((mem) => mem.id === memberId);
    return memberObj ? `${memberObj.firstName} ${memberObj.lastName}` : "Unknown Member";
  };

  const membersDropdown = [
    { name: "All Members", id: 0, classId: null },
    ...members.map((member) => ({
      name: `${member.firstName} ${member.lastName}`,
      id: member.id,
      classId: member.classId,
    })),
  ];

  const filteredRecords = attendanceRecords.filter((record) => {
    return (
      (filterProgram === "" || record.programId === filterProgram) &&
      (filterMember === 0 || filterMember === "" || 
        record.members.some((member) => member.memberId === filterMember)) &&
      (filterDate === null || new Date(record.date).toDateString() === filterDate.toDateString())
    );
  });

  const handleUpdateAttendance = (memberId, status, arrivalTime = null) => {
    const updatedMembers = selectedRecord.members.map((member) =>
      member.memberId === memberId ? { 
        ...member, 
        status,
        arrivalTime: status === 'Present' ? (arrivalTime || member.arrivalTime) : null,
        isLate: arrivalTime && selectedRecord.classStartTime ? 
          new Date(`2000-01-01T${arrivalTime}`) > new Date(`2000-01-01T${selectedRecord.classStartTime}`) : false
      } : member
    );
    setSelectedRecord({ ...selectedRecord, members: updatedMembers });
  };

  const handleSaveUpdatedAttendance = () => {
    updateAttendance(selectedRecord);
    setSelectedRecord(null);
  };

  const handleDeleteAttendance = (record) => {
    Alert.alert(
      "Delete Attendance",
      "Are you sure you want to delete this attendance record?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: () => {
            deleteAttendance(record);
            setSelectedRecord(null);
          } 
        },
      ]
    );
  };

  console.log('this is attendanceRecords', attendanceRecords);

  return (
    <View style={styles.container}>
      <TopNavigator title="Attendance Records" />
      
      {/* Filters Section */}
      <LinearGradient 
        colors={['#f8f9fa', '#e9ecef']} 
        style={styles.filterContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <CustomDropDown
          label="Select Program"
          data={programs}
          currentSelected={programs.find((prog) => prog.id === filterProgram)}
          setSelected={(input) => setFilterProgram(input.id)}
          containerStyle={styles.dropdown}
        />
        
        <CustomDropDown
          label="Select Member"
          data={membersDropdown}
          currentSelected={membersDropdown.find((mem) => mem.id === filterMember)}
          setSelected={(input) => setFilterMember(input.id)}
          containerStyle={styles.dropdown}
        />
        
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)} 
          style={styles.datePickerButton}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ffffff', '#f1f3f5']}
            style={styles.datePickerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Icon name="calendar-today" size={20} color="#6c757d" />
            <Text style={styles.dateText}>
              {filterDate ? filterDate.toLocaleDateString() : "Select Date"}
            </Text>
            <Icon name="chevron-right" size={20} color="#6c757d" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {showDatePicker && (
        <DateTimePicker
          value={filterDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setFilterDate(date);
          }}
        />
      )}

      {/* Attendance Records List */}
      <ScrollView style={styles.scrollContainer}>
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="event-note" size={50} color="#adb5bd" />
            <Text style={styles.emptyText}>No attendance records found</Text>
            <Text style={styles.emptySubText}>Try adjusting your filters</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredRecords.map((record) => {
              const lateStudents = getLateStudents(record, record.classStartTime);
              const presentCount = record.members.filter(m => m.status === 'Present').length;
              const absentCount = record.members.filter(m => m.status === 'Absent').length;
              
              return (
                <TouchableOpacity 
                  key={record.id} 
                  onPress={() => setSelectedRecord(record)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#ffffff', '#f8f9fa']}
                    style={styles.recordCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <Text style={styles.recordDate}>
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Text>
                        {record.classStartTime && (
                          <Text style={styles.classTime}>
                            Class: {record.classStartTime}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteAttendance(record);
                        }}
                        style={styles.deleteButton}
                      >
                        <Icon name="delete" size={20} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <Icon name="class" size={16} color="#6c757d" />
                        <Text style={styles.recordText}>
                          {getProgramName(record.programId)}
                        </Text>
                      </View>
                      
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Icon name="check-circle" size={16} color="#43e97b" />
                          <Text style={styles.statText}>
                            {presentCount} Present
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Icon name="cancel" size={16} color="#ff6b6b" />
                          <Text style={styles.statText}>
                            {absentCount} Absent
                          </Text>
                        </View>
                        {lateStudents.length > 0 && (
                          <View style={styles.statItem}>
                            <Icon name="schedule" size={16} color="#ffa726" />
                            <Text style={[styles.statText, styles.lateText]}>
                              {lateStudents.length} Late
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Late Students Details */}
                      {lateStudents.length > 0 && (
                        <View style={styles.lateStudentsContainer}>
                          <Text style={styles.lateStudentsTitle}>Late Arrivals:</Text>
                          <View style={styles.lateStudentsList}>
                            {lateStudents.slice(0, 3).map((student, index) => (
                              <Text key={student.memberId} style={styles.lateStudentName}>
                                {getMemberName(student.memberId)} ({student.arrivalTime})
                                {index < Math.min(lateStudents.length, 3) - 1 && ', '}
                              </Text>
                            ))}
                            {lateStudents.length > 3 && (
                              <Text style={styles.moreStudents}>
                                +{lateStudents.length - 3} more
                              </Text>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <EditAttendanceModal
        visible={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        selectedRecord={selectedRecord}
        members={members}
        programs={programs}
        handleUpdateAttendance={handleUpdateAttendance}
        handleSaveUpdatedAttendance={handleSaveUpdatedAttendance}
      />
      
      <AttendanceModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
      />
      
      <AddButton onClick={() => setModalVisible(true)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dropdown: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#ffffff',
  },
  datePickerButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  datePickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#343a40',
    marginHorizontal: 10,
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  recordCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
  },
  classTime: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  deleteButton: {
    padding: 6,
  },
  cardBody: {
    paddingLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  lateText: {
    color: '#ffa726',
    fontWeight: '500',
  },
  lateStudentsContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ffa726',
  },
  lateStudentsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 4,
  },
  lateStudentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  lateStudentName: {
    fontSize: 12,
    color: '#bf360c',
  },
  moreStudents: {
    fontSize: 12,
    color: '#bf360c',
    fontStyle: 'italic',
  },
});

export default AttendanceScreen;


