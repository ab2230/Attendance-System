import { StyleSheet, Text, View, TouchableOpacity, FlatList, Modal, Animated, Dimensions, Easing, TextInput, Alert } from 'react-native';
import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { MemberContext } from '../../context/MemberContext';
import { ProgramContext } from '../../context/ProgramContext';
import { AttendanceContext } from '../../context/AttendanceContext';
import CustomDropDown from '../../common/CustomDropDown';
import AddProgramModal from './AddProgramModal';
import ErrorModal from '../../common/ErrorModal';
import LoadingScreen from '../../common/LoadingScreen';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MEMBER_TYPE_OPTIONS } from '../../constants/memberTypes';
import { DEFAULT_MAX_LATE_MINUTES } from '../../utils/attendanceEditWindow';
import {
  getProgramMemberOrder,
  bumpProgramMemberOrder,
  sortMembersByProgramOrder,
} from '../../utils/attendanceMemberOrder';

const { width } = Dimensions.get('window');

const TYPE_FILTER_OPTIONS = [
  { id: 'all', name: 'All Types' },
  ...MEMBER_TYPE_OPTIONS,
];

const AttendanceModal = ({ visible, onClose }) => {
  const { members, loading: membersLoading } = useContext(MemberContext);
  const { programs, loading: programsLoading } = useContext(ProgramContext);
  const { markAttendance: saveAttendanceRecord, loading: attendanceLoading } = useContext(AttendanceContext);
  
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [filterMemberType, setFilterMemberType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [memberOrderIds, setMemberOrderIds] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [programModal, setProgramModal] = useState(false);
  const [programName, setProgramName] = useState('');
  const [programMaxLateMinutes, setProgramMaxLateMinutes] = useState(String(DEFAULT_MAX_LATE_MINUTES));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMemberForTime, setSelectedMemberForTime] = useState(null);
  const [classStartTime, setClassStartTime] = useState(new Date());
  const [showClassTimePicker, setShowClassTimePicker] = useState(false);
  
  const scaleValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);

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
    let cancelled = false;

    const loadMembersForProgram = async () => {
      if (!selectedProgramId) {
        setFilteredMembers([]);
        setMemberOrderIds([]);
        return;
      }

      const selectedProgram = programs.find((program) => program.id === selectedProgramId);
      if (!selectedProgram) {
        setFilteredMembers([]);
        return;
      }

      const orderIds = await getProgramMemberOrder(selectedProgramId);
      if (cancelled) return;
      setMemberOrderIds(orderIds);

      const enrolledMembers = members.filter((member) => {
        const inProgram = selectedProgram.enrolledStudents.includes(member.id);
        const matchesType =
          filterMemberType === 'all' || member.type === filterMemberType;
        return inProgram && matchesType;
      });

      setFilteredMembers(sortMembersByProgramOrder(enrolledMembers, orderIds));
    };

    loadMembersForProgram();
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId, programs, members, filterMemberType]);

  const displayedMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const ordered = sortMembersByProgramOrder(filteredMembers, memberOrderIds);
    if (!query) return ordered;
    return ordered.filter((member) => {
      const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(query) ||
        (member.firstName || '').toLowerCase().includes(query) ||
        (member.lastName || '').toLowerCase().includes(query)
      );
    });
  }, [filteredMembers, searchQuery, memberOrderIds]);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus?.(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
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

  const markedIds = useMemo(
    () => new Set(attendance.map((record) => record.memberId)),
    [attendance]
  );

  const unmarkedMembers = useMemo(
    () => filteredMembers.filter((member) => !markedIds.has(member.id)),
    [filteredMembers, markedIds]
  );

  const presentCount = attendance.filter((record) => record.status === 'Present').length;
  const absentCount = attendance.filter((record) => record.status === 'Absent').length;
  const allMarkedArePresent = attendance.length > 0 && absentCount === 0;
  const allMarkedAreAbsent = attendance.length > 0 && presentCount === 0;
  const canMarkRemainingAbsent = allMarkedArePresent && unmarkedMembers.length > 0;
  const canMarkRemainingPresent = allMarkedAreAbsent && unmarkedMembers.length > 0;

  const markRemainingAs = (status) => {
    if (!unmarkedMembers.length) return;
    const nowTime = new Date().toTimeString().slice(0, 5);
    const newRecords = unmarkedMembers.map((member) => ({
      memberId: member.id,
      status,
      arrivalTime: status === 'Present' ? nowTime : null,
    }));
    setAttendance((prev) => [...prev, ...newRecords]);
  };

  const buildFinalAttendance = (sourceAttendance) => {
    const byId = new Map(sourceAttendance.map((record) => [record.memberId, record]));
    unmarkedMembers.forEach((member) => {
      if (!byId.has(member.id)) {
        byId.set(member.id, {
          memberId: member.id,
          status: 'Absent',
          arrivalTime: null,
        });
      }
    });
    return Array.from(byId.values());
  };

  const performSaveAttendance = async (finalAttendance) => {
    if (localLoading || attendanceLoading) return;

    try {
      setLocalLoading(true);
      setError(null);

      const selectedProgram = programs.find((p) => p.id === selectedProgramId);
      const attendanceRecord = {
        date: selectedDate.toISOString(),
        programId: selectedProgramId,
        classStartTime: classStartTime.toTimeString().slice(0, 5),
        maxLateMinutes: selectedProgram?.maxLateMinutes ?? DEFAULT_MAX_LATE_MINUTES,
        members: finalAttendance.map((att) => {
          const member = members.find((m) => m.id === att.memberId);
          return {
            memberId: att.memberId,
            status: att.status,
            classId: member?.classId,
            arrivalTime: att.arrivalTime,
            isLate: att.arrivalTime ? isLate(att.arrivalTime) : false,
          };
        }),
        id: 'Attendance' + Date.now().toString(),
      };

      await saveAttendanceRecord(attendanceRecord);

      const markedOrder = finalAttendance.map((att) => att.memberId);
      await bumpProgramMemberOrder(selectedProgramId, markedOrder);
      const refreshedOrder = await getProgramMemberOrder(selectedProgramId);
      setMemberOrderIds(refreshedOrder);

      setAttendance([]);
      setSelectedProgramId(null);
      setFilterMemberType('all');
      setSearchQuery('');
      setSearchOpen(false);
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

  const handleSaveAttendance = async () => {
    if (localLoading || attendanceLoading) return;

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

    const remainingCount = unmarkedMembers.length;
    if (remainingCount > 0) {
      Alert.alert(
        'Save Attendance',
        `${remainingCount} unmarked student${remainingCount === 1 ? '' : 's'} will automatically be recorded as Absent. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            style: 'destructive',
            onPress: () => {
              const finalAttendance = buildFinalAttendance(attendance);
              setAttendance(finalAttendance);
              performSaveAttendance(finalAttendance);
            },
          },
        ]
      );
      return;
    }

    await performSaveAttendance(attendance);
  };

  const onCancel = () => {
    setSelectedProgramId(null);
    setFilterMemberType('all');
    setSearchQuery('');
    setSearchOpen(false);
    setAttendance([]);
    onClose();
  };

  const isSaving = localLoading || attendanceLoading;
  const markedCount = attendance.length;

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
            {item.type || 'Regular'}
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
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <View style={styles.headerLeft}>
              {searchOpen ? (
                <View style={styles.headerSearchBox}>
                  <Icon name="search" size={18} color="#495057" />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.headerSearchInput}
                    placeholder="Search student..."
                    placeholderTextColor="#868e96"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    selectionColor="#667eea"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="cancel" size={18} color="#868e96" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Attendance
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={searchOpen ? closeSearch : openSearch}
                style={styles.headerIconButton}
                activeOpacity={0.8}
              >
                <Icon name={searchOpen ? 'close' : 'search'} size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveAttendance}
                disabled={isSaving}
                style={[styles.headerSaveButton, isSaving && styles.headerSaveButtonDisabled]}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <Text style={styles.headerSaveText}>Saving...</Text>
                ) : (
                  <>
                    <Icon name="save" size={16} color="white" />
                    <Text style={styles.headerSaveText}>
                      Save{markedCount > 0 ? ` (${markedCount})` : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={onCancel} 
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Icon name="close" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.modalContent}>
            <FlatList
              data={displayedMembers}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListHeaderComponent={
                <View>
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

                  <CustomDropDown
                    label="Filter by Type"
                    data={TYPE_FILTER_OPTIONS}
                    currentSelected={TYPE_FILTER_OPTIONS.find((option) => option.id === filterMemberType)}
                    setSelected={(input) => setFilterMemberType(input.id)}
                    containerStyle={styles.dropdownContainer}
                  />

                  <Text style={styles.sectionTitle}>
                    Mark Attendance
                    {selectedProgramId ? ` (${displayedMembers.length})` : ''}
                  </Text>

                  {attendance.length > 0 && (
                    <Text style={styles.markSummary}>
                      Marked: {presentCount} Present · {absentCount} Absent
                      {unmarkedMembers.length > 0 ? ` · ${unmarkedMembers.length} Unmarked` : ''}
                    </Text>
                  )}

                  {canMarkRemainingAbsent && (
                    <TouchableOpacity
                      style={styles.bulkActionButton}
                      onPress={() => markRemainingAs('Absent')}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#ff6b6b', '#ff4545']}
                        style={styles.bulkActionGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Icon name="person-off" size={18} color="white" />
                        <Text style={styles.bulkActionText}>
                          Mark remaining ({unmarkedMembers.length}) as Absent
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {canMarkRemainingPresent && (
                    <TouchableOpacity
                      style={styles.bulkActionButton}
                      onPress={() => markRemainingAs('Present')}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#43e97b', '#38f9d7']}
                        style={styles.bulkActionGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Icon name="how-to-reg" size={18} color="white" />
                        <Text style={styles.bulkActionText}>
                          Mark remaining ({unmarkedMembers.length}) as Present
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="people-outline" size={40} color="#6c757d" />
                  <Text style={styles.emptyText}>No students found</Text>
                  <Text style={styles.emptySubText}>
                    {!selectedProgramId
                      ? 'Select a program to view students'
                      : searchQuery.trim()
                        ? 'No match for your search. Try another name.'
                        : 'Try another type filter or enroll students in this program'}
                  </Text>
                </View>
              }
            />
          </View>

          <AddProgramModal
            visible={programModal}
            programName={programName}
            setProgramName={setProgramName}
            maxLateMinutes={programMaxLateMinutes}
            setMaxLateMinutes={setProgramMaxLateMinutes}
            onClose={() => {
              setProgramModal(false);
              setProgramMaxLateMinutes(String(DEFAULT_MAX_LATE_MINUTES));
            }}
            isEditing={false}
            editingProgram={null}
          />
        </Animated.View>
      </Animated.View>

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

      {showClassTimePicker && (
        <DateTimePicker
          value={classStartTime}
          mode="time"
          display="default"
          onChange={handleClassTimeChange}
        />
      )}

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
        onRetry={handleSaveAttendance}
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
    height: '85%',
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  headerSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 12,
    minHeight: 38,
  },
  headerSearchInput: {
    flex: 1,
    color: '#212529',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(67, 233, 123, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
  },
  headerSaveButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerSaveText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
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
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
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
    marginBottom: 8,
    marginTop: 10,
  },
  markSummary: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 10,
  },
  bulkActionButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  bulkActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  bulkActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
