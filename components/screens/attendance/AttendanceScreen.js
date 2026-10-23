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
import LoadingScreen from '../../common/LoadingScreen';
import { MEMBER_TYPE_OPTIONS } from '../../constants/memberTypes';
import {
  isAttendanceEditable,
  getEditWindowMessage,
  getAttendanceEditDeadline,
  DEFAULT_MAX_LATE_MINUTES,
} from '../../utils/attendanceEditWindow';
import { bumpProgramMemberOrder } from '../../utils/attendanceMemberOrder';
import AppTheme from '../../theme/appTheme';

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

  const programDropdown = [
    { name: 'All Programs', id: '' },
    ...programs.map((p) => ({ name: p.name, id: p.id })),
  ];

  const membersDropdown = [
    { name: "All Members", id: 0, classId: null },
    ...members.map((member) => ({
      name: `${member.firstName} ${member.lastName}`,
      id: member.id,
      classId: member.classId,
    })),
  ];

  const hasActiveFilters =
    filterProgram !== '' ||
    (filterMember !== '' && filterMember !== 0) ||
    filterMemberType !== 'all' ||
    filterDate !== null;

  const clearFilters = () => {
    setFilterProgram('');
    setFilterMember('');
    setFilterMemberType('all');
    setFilterDate(null);
  };

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
          backgroundColor={AppTheme.background}
          color={AppTheme.accent}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavigator title="Attendance Records" />

      <View style={styles.filterContainer}>
        <View style={styles.filterHeaderRow}>
          <Text style={styles.filterTitle}>Filters</Text>
          {hasActiveFilters ? (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
              <Icon name="filter-alt-off" size={18} color={AppTheme.accentText} />
              <Text style={styles.clearFiltersText}>Clear all</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <CustomDropDown
          label="Select Program"
          data={programDropdown}
          PlaceHolders="All Programs"
          currentSelected={programDropdown.find((prog) => prog.id === filterProgram)}
          setSelected={(input) => setFilterProgram(input?.id ?? '')}
          onDarkBackground
        />

        <CustomDropDown
          label="Select Member"
          data={membersDropdown}
          PlaceHolders="All Members"
          currentSelected={membersDropdown.find((mem) => mem.id === filterMember)}
          setSelected={(input) => setFilterMember(input?.id ?? '')}
          onDarkBackground
        />

        <CustomDropDown
          label="Filter by Type"
          data={TYPE_FILTER_OPTIONS}
          currentSelected={TYPE_FILTER_OPTIONS.find((option) => option.id === filterMemberType)}
          setSelected={(input) => setFilterMemberType(input?.id ?? 'all')}
          onDarkBackground
        />

        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.datePickerButton}
          activeOpacity={0.8}
        >
          <Icon name="calendar-today" size={20} color={AppTheme.textMuted} />
          <Text style={styles.dateText}>
            {filterDate ? filterDate.toLocaleDateString() : 'Any date'}
          </Text>
          <Icon name="chevron-right" size={20} color={AppTheme.textMuted} />
        </TouchableOpacity>
        {filterDate ? (
          <TouchableOpacity onPress={() => setFilterDate(null)} style={styles.clearDateBtn}>
            <Text style={styles.clearDateText}>Clear date filter</Text>
          </TouchableOpacity>
        ) : null}
      </View>

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppTheme.accent} />
        }
      >
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="event-note" size={50} color={AppTheme.textMuted} />
            <Text style={styles.emptyText}>No attendance records found</Text>
            <Text style={styles.emptySubText}>
              {hasActiveFilters ? 'Try clearing or adjusting your filters' : 'Tap + to record attendance'}
            </Text>
            {hasActiveFilters ? (
              <TouchableOpacity style={styles.emptyClearBtn} onPress={clearFilters}>
                <Text style={styles.emptyClearBtnText}>Clear filters</Text>
              </TouchableOpacity>
            ) : null}
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
                  <View style={styles.recordCard}>
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
                        {deleting ? (
                          <Icon name="hourglass-empty" size={20} color={AppTheme.textMuted} />
                        ) : (
                          <Icon name="delete" size={20} color={AppTheme.danger} />
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <Icon name="class" size={16} color={AppTheme.textMuted} />
                        <Text style={styles.recordText}>
                          {getProgramName(record.programId)}
                        </Text>
                      </View>
                      
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Icon name="check-circle" size={16} color={AppTheme.success} />
                          <Text style={styles.statText}>
                            {presentCount} Present
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Icon name="cancel" size={16} color={AppTheme.danger} />
                          <Text style={styles.statText}>
                            {absentCount} Absent
                          </Text>
                        </View>
                        {lateStudents.length > 0 && (
                          <View style={styles.statItem}>
                            <Icon name="schedule" size={16} color={AppTheme.warning} />
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
                  </View>
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
    backgroundColor: AppTheme.background,
  },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
    backgroundColor: AppTheme.surfaceElevated,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterTitle: {
    color: AppTheme.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppTheme.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: AppTheme.accentText,
    fontWeight: '700',
    fontSize: 13,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    backgroundColor: AppTheme.inputBg,
    borderWidth: 1,
    borderColor: AppTheme.border,
    marginTop: 4,
  },
  dateText: {
    fontSize: 16,
    color: AppTheme.inputText,
    marginHorizontal: 10,
    flex: 1,
  },
  clearDateBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
  },
  clearDateText: {
    color: AppTheme.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: AppTheme.textSecondary,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: AppTheme.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyClearBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: AppTheme.accent,
  },
  emptyClearBtnText: {
    color: AppTheme.accentText,
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: 20,
  },
  recordCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: AppTheme.surface,
    borderWidth: 1,
    borderColor: AppTheme.border,
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
    color: AppTheme.textPrimary,
  },
  classTime: {
    fontSize: 12,
    color: AppTheme.textMuted,
    marginTop: 2,
  },
  editWindowText: {
    fontSize: 11,
    color: AppTheme.accent,
    marginTop: 4,
    fontWeight: '500',
  },
  editLockedText: {
    color: AppTheme.textMuted,
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
    color: AppTheme.textSoft,
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
    color: AppTheme.textSoft,
    marginLeft: 4,
  },
  lateText: {
    color: AppTheme.warning,
    fontWeight: '500',
  },
  lateStudentsContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(255, 167, 38, 0.12)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: AppTheme.warning,
  },
  lateStudentsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: AppTheme.warning,
    marginBottom: 4,
  },
  lateStudentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  lateStudentName: {
    fontSize: 12,
    color: AppTheme.textSoft,
  },
  moreStudents: {
    fontSize: 12,
    color: AppTheme.textMuted,
    fontStyle: 'italic',
  },
});

export default AttendanceScreen;


