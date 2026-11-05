import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  TextInput,
  Dimensions 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAttendanceEditDeadline } from '../../utils/attendanceEditWindow';
import { isArrivalLate } from '../../utils/attendanceLate';

const { width } = Dimensions.get('window');

const EditAttendanceModal = ({ 
  visible, 
  onClose, 
  selectedRecord, 
  members, 
  programs,
  handleUpdateAttendance,
  handleSaveUpdatedAttendance,
  saving = false,
}) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMemberForTime, setSelectedMemberForTime] = useState(null);
  const [showClassTimePicker, setShowClassTimePicker] = useState(false);
  const [localRecord, setLocalRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  // Sync local copy when the record updates (e.g. Present/Absent),
  // but only clear search when opening a different attendance record.
  useEffect(() => {
    if (selectedRecord) {
      setLocalRecord({ ...selectedRecord });
    }
  }, [selectedRecord]);

  useEffect(() => {
    setSearchQuery('');
    setSearchOpen(false);
  }, [selectedRecord?.id]);

  const filteredMembers = useMemo(() => {
    const sourceMembers = localRecord?.members || selectedRecord?.members || [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sourceMembers;
    return sourceMembers.filter((item) => {
      const member = members.find((m) => m.id === item.memberId);
      const name = member
        ? `${member.firstName} ${member.lastName}`.toLowerCase()
        : `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
      return name.includes(query);
    });
  }, [localRecord, selectedRecord, members, searchQuery]);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus?.(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    if (saving) return;
    setSearchOpen(false);
    setSearchQuery('');
    onClose();
  };

  if (!selectedRecord || !localRecord) return null;

  const editDeadline = getAttendanceEditDeadline(
    selectedRecord.date,
    selectedRecord.classStartTime,
    selectedRecord.maxLateMinutes
  );

  const getProgramName = (programId) => {
    const program = programs.find(p => p.id === programId);
    return program ? program.name : 'Unknown Program';
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
    return isArrivalLate(
      arrivalTime,
      classStartTime,
      localRecord?.lateAfterMinutes ?? 0,
    );
  };

  const totalMembers = (localRecord.members || selectedRecord.members || []).length;

  const renderMemberItem = ({ item }) => {
    const member = members.find(m => m.id === item.memberId);
    const memberName = member ? `${member.firstName} ${member.lastName}` : 'Unknown';
    const isPresent = item.status === 'Present';
    const studentIsLate = item.arrivalTime && localRecord.classStartTime && 
      isLate(item.arrivalTime, localRecord.classStartTime);

    return (
      <View style={styles.memberRow}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={2}>{memberName}</Text>
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
              ]} numberOfLines={1}>
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
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
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
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="cancel" size={18} color="#868e96" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Edit Attendance
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
                onPress={handleSaveUpdatedAttendance}
                disabled={saving}
                style={[styles.headerSaveButton, saving && styles.headerSaveButtonDisabled]}
                activeOpacity={0.8}
              >
                {saving ? (
                  <Text style={styles.headerSaveText}>Saving...</Text>
                ) : (
                  <>
                    <Icon name="save" size={16} color="white" />
                    <Text style={styles.headerSaveText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                activeOpacity={0.7}
                disabled={saving}
              >
                <Icon name="close" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.content}>
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

              {editDeadline && (
                <Text style={styles.editWindowHint}>
                  Editable until {editDeadline.toLocaleString()} ({selectedRecord.maxLateMinutes || 60} min window)
                </Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>
              Students ({filteredMembers.length}/{totalMembers})
            </Text>
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.memberId}
              renderItem={renderMemberItem}
              style={styles.membersList}
              contentContainerStyle={styles.membersListContent}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={styles.emptySearch}>No students match your search</Text>
              }
            />
          </View>
        </View>
      </View>

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
    height: '85%',
    maxHeight: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  recordInfo: {
    marginBottom: 12,
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
  editWindowHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#4da0b0',
    fontWeight: '500',
  },
  emptySearch: {
    textAlign: 'center',
    color: '#adb5bd',
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 10,
  },
  membersList: {
    flex: 1,
    minHeight: 0,
  },
  membersListContent: {
    paddingBottom: 16,
  },
  memberRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: 12,
  },
  memberInfo: {
    width: '100%',
    marginBottom: 10,
    minWidth: 0,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#343a40',
    flexShrink: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minWidth: 0,
  },
  timeText: {
    fontSize: 12,
    color: '#43e97b',
    marginLeft: 4,
    fontWeight: '500',
    flexShrink: 1,
  },
  lateTimeText: {
    color: '#ff6b6b',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    flexGrow: 1,
    minWidth: 96,
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
});

export default EditAttendanceModal;
