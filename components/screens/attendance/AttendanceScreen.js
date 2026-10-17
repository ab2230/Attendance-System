import React, { useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Alert, RefreshControl } from 'react-native';
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
import LoadingScreen from '../../common/LoadingScreen';
import { MEMBER_TYPE_OPTIONS } from '../../constants/memberTypes';
import {
  isAttendanceEditable,
  getEditWindowMessage,
  getAttendanceEditDeadline,
  DEFAULT_MAX_LATE_MINUTES,
} from '../../utils/attendanceEditWindow';
import { bumpProgramMemberOrder } from '../../utils/attendanceMemberOrder';

const TYPE_FILTER_OPTIONS = [
  { id: 'all', name: 'All Types' },
  ...MEMBER_TYPE_OPTIONS,
];

const AttendanceScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const { attendanceRecords, updateAttendance, deleteAttendance, getLateStudents, loadAttendanceRecords, loading } = useContext(AttendanceContext);
  const { members, loadMembers } = useContext(MemberContext);
  const { classes } = useContext(ClassContext);
  const { programs, loadPrograms } = useContext(ProgramContext);

  const [filterProgram, setFilterProgram] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterMemberType, setFilterMemberType] = useState('all');
  const [filterDate, setFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    const matchesProgram = filterProgram === "" || record.programId === filterProgram;
    const matchesMember =
      filterMember === 0 ||
      filterMember === "" ||
      record.members.some((member) => member.memberId === filterMember);
    const matchesDate =
      filterDate === null ||
      new Date(record.date).toDateString() === filterDate.toDateString();
    const matchesType =
      filterMemberType === 'all' ||
      record.members.some((entry) => {
        const member = members.find((m) => m.id === entry.memberId);
        return member?.type === filterMemberType;
      });

    return matchesProgram && matchesMember && matchesDate && matchesType;
  });

  const buildEditableRecord = (record) => {
    const program = programs.find((p) => p.id === record.programId);
    const enrolledIds = program?.enrolledStudents || [];
    const existingById = new Map(record.members.map((m) => [m.memberId, m]));

    const mergedMembers = enrolledIds.map((id) => {
      if (existingById.has(id)) return existingById.get(id);
      const member = members.find((m) => m.id === id);
      return {
        memberId: id,
        firstName: member?.firstName || '',
        lastName: member?.lastName || '',
        status: 'Absent',
        classId: member?.classId,
        arrivalTime: null,
        isLate: false,
      };
    });

    // Keep anyone already on the record who is no longer enrolled
    record.members.forEach((entry) => {
      if (!enrolledIds.includes(entry.memberId)) {
        mergedMembers.push(entry);
      }
    });

    return {
      ...record,
      maxLateMinutes: record.maxLateMinutes ?? program?.maxLateMinutes ?? DEFAULT_MAX_LATE_MINUTES,
      members: mergedMembers,
    };
  };

  const openRecordForEdit = (record) => {
    if (!isAttendanceEditable(record)) {
      Alert.alert('Editing locked', getEditWindowMessage(record));
      return;
    }
    setSelectedRecord(buildEditableRecord(record));
  };

  const handleUpdateAttendance = (memberId, status, arrivalTime = null) => {
    if (!selectedRecord) return;
    if (!isAttendanceEditable(selectedRecord)) {
      Alert.alert('Editing locked', getEditWindowMessage(selectedRecord));
      setSelectedRecord(null);
      return;
    }

    const updatedMembers = selectedRecord.members.map((member) =>
      member.memberId === memberId ? { 
        ...member, 
        status,
        arrivalTime: status === 'Present' ? (arrivalTime || member.arrivalTime || new Date().toTimeString().slice(0, 5)) : null,
        isLate: (() => {
          const time = status === 'Present'
            ? (arrivalTime || member.arrivalTime || new Date().toTimeString().slice(0, 5))
            : null;
          if (!time || !selectedRecord.classStartTime) return false;
          return new Date(`2000-01-01T${time}`) > new Date(`2000-01-01T${selectedRecord.classStartTime}`);
        })(),
      } : member
    );
    setSelectedRecord({ ...selectedRecord, members: updatedMembers });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAttendanceRecords(), loadMembers(), loadPrograms()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveUpdatedAttendance = async () => {
    if (saving || !selectedRecord) return;
    if (!isAttendanceEditable(selectedRecord)) {
      Alert.alert('Editing locked', getEditWindowMessage(selectedRecord));
      setSelectedRecord(null);
      return;
    }
    setSaving(true);
    try {
      await updateAttendance(selectedRecord);
      const markedOrder = (selectedRecord.members || [])
        .filter((m) => m.status === 'Present')
        .map((m) => m.memberId);
      if (markedOrder.length) {
        await bumpProgramMemberOrder(selectedRecord.programId, markedOrder);
      }
      setSelectedRecord(null);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttendance = (record) => {
    if (deleting) return;
    Alert.alert(
      "Delete Attendance",
      "Are you sure you want to delete this attendance record?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAttendance(record);
              setSelectedRecord(null);
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to delete attendance");
            } finally {
              setDeleting(false);
            }
          } 
        },
      ]
    );
  };

  if (loading && attendanceRecords.length === 0) {
    return (
      <View style={styles.container}>
        <TopNavigator title="Attendance Records" />
        <LoadingScreen
          text="Loading attendance..."
          backgroundColor="#f8f9fa"
          color="#4da0b0"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavigator title="Attendance Records" />

      {deleting && (
        <LoadingScreen
          overlay={true}
          text="Deleting attendance..."
          color="#4da0b0"
        />
      )}
      
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

        <CustomDropDown
          label="Filter by Type"
          data={TYPE_FILTER_OPTIONS}
          currentSelected={TYPE_FILTER_OPTIONS.find((option) => option.id === filterMemberType)}
          setSelected={(input) => setFilterMemberType(input.id)}
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
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4da0b0']} />
        }
      >
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
              const editable = isAttendanceEditable(record);
              const deadline = getAttendanceEditDeadline(
                record.date,
                record.classStartTime,
                record.maxLateMinutes
              );
              
              return (
                <TouchableOpacity 
                  key={record.id} 
                  onPress={() => openRecordForEdit(record)}
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
                        <Text style={[styles.editWindowText, !editable && styles.editLockedText]}>
                          {editable
                            ? `Editable until ${deadline ? deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}`
                            : 'Editing locked'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteAttendance(record);
                        }}
                        style={styles.deleteButton}
                        disabled={deleting}
                      >
                        <Icon name="delete" size={20} color={deleting ? '#ffc9c9' : '#ff6b6b'} />
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
        onClose={() => {
          if (saving) return;
          setSelectedRecord(null);
        }}
        selectedRecord={selectedRecord}
        members={members}
        programs={programs}
        handleUpdateAttendance={handleUpdateAttendance}
        handleSaveUpdatedAttendance={handleSaveUpdatedAttendance}
        saving={saving}
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
  editWindowText: {
    fontSize: 11,
    color: '#4da0b0',
    marginTop: 4,
    fontWeight: '500',
  },
  editLockedText: {
    color: '#adb5bd',
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


