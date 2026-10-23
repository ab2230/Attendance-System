import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  RefreshControl,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { buildProgramCheckInUrl } from '../../../utils/checkInUrl';
import TopNavigator from '../../common/TopNavigator';
import CustomDropDown from '../../common/CustomDropDown';
import LoadingScreen from '../../common/LoadingScreen';
import { ProgramContext } from '../../context/ProgramContext';
import { AttendanceContext } from '../../context/AttendanceContext';
import supabaseService from '../../../services/supabaseService';

const DEFAULT_MINUTE_LIMIT = '15';

const AttendanceRoomScreen = () => {
  const navigation = useNavigation();
  const { programs, loading: programsLoading, loadPrograms } = useContext(ProgramContext);
  const { loadAttendanceRecords } = useContext(AttendanceContext);

  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [minuteLimit, setMinuteLimit] = useState(DEFAULT_MINUTE_LIMIT);
  const [creating, setCreating] = useState(false);
  const [activeRooms, setActiveRooms] = useState([]);
  const [presentCountByRecord, setPresentCountByRecord] = useState({});
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const programDropdown = useMemo(
    () => programs.map((p) => ({ id: p.id, name: p.name })),
    [programs],
  );

  const loadRooms = useCallback(async () => {
    try {
      const rooms = await supabaseService.getActiveAttendanceRooms();
      setActiveRooms(rooms);

      const countMap = {};
      await Promise.all(
        rooms.map(async (room) => {
          const checkIns = await supabaseService.getAttendanceRoomCheckIns(
            room.attendance_record_id,
          );
          countMap[room.attendance_record_id] = checkIns.length;
        }),
      );
      setPresentCountByRecord(countMap);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load attendance rooms');
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadRooms();
      loadAttendanceRecords();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadRooms, loadAttendanceRecords]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPrograms(), loadRooms(), loadAttendanceRecords()]);
    } finally {
      setRefreshing(false);
    }
  };

  const selectedProgramLink = selectedProgramId
    ? buildProgramCheckInUrl(selectedProgramId)
    : null;

  const handleShareLink = async (programId) => {
    const url = buildProgramCheckInUrl(programId);
    try {
      await Share.share({ message: url, url });
    } catch {
      Alert.alert('Share link', url);
    }
  };

  const openRoomDetail = (room) => {
    navigation.navigate('RoomDetail', { room });
  };

  const handleCreateRoom = async () => {
    if (!selectedProgramId) {
      Alert.alert('Program required', 'Choose a program first.');
      return;
    }
    const limit = Number(minuteLimit);
    if (!limit || limit <= 0) {
      Alert.alert('Invalid limit', 'Enter how many minutes the room stays open.');
      return;
    }

    setCreating(true);
    try {
      await supabaseService.createAttendanceRoom(selectedProgramId, limit);
      setMinuteLimit(DEFAULT_MINUTE_LIMIT);
      await Promise.all([loadRooms(), loadAttendanceRecords()]);
      Alert.alert('Session started', 'Announce the 6-digit code. Members use the program link they already have.');
    } catch (error) {
      Alert.alert('Could not create room', error.message || 'Try again.');
    } finally {
      setCreating(false);
    }
  };

  const formatRemaining = (expiresAt) => {
    const ms = new Date(expiresAt).getTime() - now;
    if (ms <= 0) return 'Expired';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  if ((programsLoading && programs.length === 0) || loadingRooms) {
    return (
      <View style={styles.container}>
        <TopNavigator title="Attendance Room" />
        <LoadingScreen text="Loading..." backgroundColor="#0a0f24" color="#ffcc00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavigator title="Attendance Room" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffcc00" />
        }
      >
        <Text style={styles.sectionTitle}>Create room</Text>
        <Text style={styles.hint}>
          Share each program link once (bookmark). Each session you only announce the
          6-digit code; results sync to Today / History.
        </Text>

        <CustomDropDown
          data={programDropdown}
          label="Program"
          PlaceHolders="Select program"
          currentSelected={programDropdown.find((p) => p.id === selectedProgramId)}
          setSelected={(item) => setSelectedProgramId(item?.id || '')}
          noListLabel="No programs yet"
          onDarkBackground
        />

        {selectedProgramLink ? (
          <View style={styles.permanentLinkBox}>
            <Text style={styles.permanentLinkLabel}>Permanent check-in link</Text>
            <Text style={styles.permanentLinkUrl} selectable>
              {selectedProgramLink}
            </Text>
            <TouchableOpacity
              style={styles.permanentShareBtn}
              onPress={() => handleShareLink(selectedProgramId)}
            >
              <Icon name="share-variant" size={18} color="#0a0f24" />
              <Text style={styles.permanentShareText}>Share program link</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.inputLabel}>Open for (minutes)</Text>
        <TextInput
          style={styles.input}
          value={minuteLimit}
          onChangeText={setMinuteLimit}
          keyboardType="number-pad"
          placeholder="15"
          placeholderTextColor="#8892b0"
        />

        <TouchableOpacity
          style={[styles.primaryBtn, creating && styles.primaryBtnDisabled]}
          onPress={handleCreateRoom}
          disabled={creating}
        >
          <Icon name="door-open" size={22} color="#0a0f24" />
          <Text style={styles.primaryBtnText}>
            {creating ? 'Creating…' : 'Create attendance room'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, styles.activeTitle]}>Active rooms</Text>
        {activeRooms.length === 0 ? (
          <Text style={styles.emptyText}>No active rooms. Create one above.</Text>
        ) : (
          activeRooms.map((room) => {
            const presentCount = presentCountByRecord[room.attendance_record_id] || 0;
            const programName = room.programs?.name || 'Program';
            return (
              <View key={room.id} style={styles.roomCard}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => openRoomDetail(room)}
                  style={styles.roomTapArea}
                >
                  <View style={styles.roomHeader}>
                    <Text style={styles.roomProgram}>{programName}</Text>
                    <Text style={styles.roomTimer}>{formatRemaining(room.expires_at)}</Text>
                  </View>

                  <View style={styles.roomMetaRow}>
                    <Text style={styles.otpInline}>Code {room.otp_code}</Text>
                    <Text style={styles.presentCount}>{presentCount} present</Text>
                  </View>

                  <View style={styles.openDetailRow}>
                    <Text style={styles.openDetailText}>View live attendance</Text>
                    <Icon name="chevron-right" size={22} color="#ffcc00" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => handleShareLink(room.program_id)}
                >
                  <Icon name="link-variant" size={20} color="#ffcc00" />
                  <Text style={styles.linkBtnText} numberOfLines={1}>
                    Share program link
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f24',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#ffcc00',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  activeTitle: {
    marginTop: 28,
  },
  hint: {
    color: '#a8b2d1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  permanentLinkBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0f1a33',
    borderWidth: 1,
    borderColor: '#1f3460',
  },
  permanentLinkLabel: {
    color: '#ffcc00',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 6,
  },
  permanentLinkUrl: {
    color: '#ccd6f6',
    fontSize: 12,
    lineHeight: 18,
  },
  permanentShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#ffcc00',
    borderRadius: 10,
    paddingVertical: 8,
  },
  permanentShareText: {
    color: '#0a0f24',
    fontWeight: '700',
    fontSize: 14,
  },
  inputLabel: {
    color: '#ccd6f6',
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#162447',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1f3460',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffcc00',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#0a0f24',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyText: {
    color: '#8892b0',
    fontSize: 15,
  },
  roomCard: {
    backgroundColor: '#162447',
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1f3460',
    overflow: 'hidden',
  },
  roomTapArea: {
    padding: 16,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomProgram: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  roomTimer: {
    color: '#ffcc00',
    fontWeight: '700',
    fontSize: 16,
  },
  roomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpInline: {
    color: '#ccd6f6',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 2,
  },
  presentCount: {
    color: '#4ade80',
    fontWeight: '600',
    fontSize: 14,
  },
  openDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f3460',
  },
  openDetailText: {
    color: '#ffcc00',
    fontWeight: '600',
    fontSize: 14,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f1a33',
    borderTopWidth: 1,
    borderTopColor: '#1f3460',
  },
  linkBtnText: {
    color: '#ccd6f6',
    fontSize: 14,
    flex: 1,
  },
});

export default AttendanceRoomScreen;
