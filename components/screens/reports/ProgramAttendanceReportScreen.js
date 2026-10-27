import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TopNavigator from '../../common/TopNavigator';
import CustomDropDown from '../../common/CustomDropDown';
import LoadingScreen from '../../common/LoadingScreen';
import { AttendanceContext } from '../../context/AttendanceContext';
import { ProgramContext } from '../../context/ProgramContext';
import { MemberContext } from '../../context/MemberContext';
import AppTheme from '../../theme/appTheme';
import {
  buildProgramAttendanceReport,
  toDateKey,
} from '../../utils/programAttendanceReport';
import { exportProgramReportTxt } from '../../common/exportProgramReport';

const ProgramAttendanceReportScreen = () => {
  const { attendanceRecords, loadAttendanceRecords, loading: recordsLoading } =
    useContext(AttendanceContext);
  const { programs, loadPrograms, loading: programsLoading } = useContext(ProgramContext);
  const { members, loadMembers } = useContext(MemberContext);

  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [endDate, setEndDate] = useState(() => new Date());
  const [pickerMode, setPickerMode] = useState(null);
  const [excludeLate, setExcludeLate] = useState(false);
  const [minAttendance, setMinAttendance] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const startDateKey = toDateKey(startDate);
  const endDateKey = toDateKey(endDate);

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);

  const { rows, totalSessions } = useMemo(() => {
    if (!selectedProgramId) return { rows: [], totalSessions: 0 };
    return buildProgramAttendanceReport({
      attendanceRecords,
      programId: selectedProgramId,
      enrolledMemberIds: selectedProgram?.enrolledStudents || [],
      members,
      startDateKey,
      endDateKey,
      excludeLate,
      minAttendance,
    });
  }, [
    attendanceRecords,
    selectedProgramId,
    selectedProgram?.enrolledStudents,
    members,
    startDateKey,
    endDateKey,
    excludeLate,
    minAttendance,
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAttendanceRecords(), loadPrograms(), loadMembers()]);
    } finally {
      setRefreshing(false);
    }
  };

  const onDateChange = (event, date) => {
    if (event?.type === 'dismissed') {
      setPickerMode(null);
      return;
    }
    if (!date) {
      setPickerMode(null);
      return;
    }
    if (pickerMode === 'start') setStartDate(date);
    if (pickerMode === 'end') setEndDate(date);
    setPickerMode(null);
  };

  const handleExport = () => {
    if (!selectedProgramId) {
      Alert.alert('Select program', 'Choose a program before exporting.');
      return;
    }
    exportProgramReportTxt({
      programName: selectedProgram?.name,
      startDateKey,
      endDateKey,
      rows,
      totalSessions,
      excludeLate,
      minAttendance,
    });
  };

  const loading = (recordsLoading || programsLoading) && !attendanceRecords.length;

  if (loading) {
    return (
      <View style={styles.screen}>
        <TopNavigator title="Program Report" />
        <LoadingScreen text="Loading..." backgroundColor={AppTheme.background} color={AppTheme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopNavigator title="Program Report" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppTheme.accent} />
        }
      >
        <Text style={styles.intro}>
          See how many sessions each member attended in a date range. Late counts as attended unless
          you turn on exclude late.
        </Text>

        <CustomDropDown
          label="Program"
          data={programs}
          currentSelected={selectedProgram}
          setSelected={(item) => setSelectedProgramId(item.id)}
          required
          onDarkBackground
        />

        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerMode('start')}>
            <Text style={styles.dateLabel}>Start date</Text>
            <Text style={styles.dateValue}>{startDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerMode('end')}>
            <Text style={styles.dateLabel}>End date</Text>
            <Text style={styles.dateValue}>{endDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>

        {pickerMode ? (
          <DateTimePicker
            value={pickerMode === 'start' ? startDate : endDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        ) : null}

        <View style={styles.filterCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextBlock}>
              <Text style={styles.filterTitle}>Exclude late</Text>
              <Text style={styles.filterHint}>Only count on-time arrivals</Text>
            </View>
            <Switch
              value={excludeLate}
              onValueChange={setExcludeLate}
              trackColor={{ false: AppTheme.border, true: AppTheme.accentMuted }}
              thumbColor={excludeLate ? AppTheme.accent : '#ccc'}
            />
          </View>

          <Text style={styles.filterTitle}>Minimum attendance</Text>
          <Text style={styles.filterHint}>Show only members with at least this many (e.g. 4)</Text>
          <TextInput
            style={styles.minInput}
            value={minAttendance}
            onChangeText={(t) => setMinAttendance(t.replace(/[^0-9]/g, ''))}
            placeholder="0 = no minimum"
            placeholderTextColor={AppTheme.textMuted}
            keyboardType="number-pad"
          />
        </View>

        {selectedProgramId ? (
          <Text style={styles.sessionMeta}>
            {totalSessions} session{totalSessions === 1 ? '' : 's'} in range · {rows.length} member
            {rows.length === 1 ? '' : 's'} shown
          </Text>
        ) : (
          <Text style={styles.sessionMeta}>Select a program to generate the report.</Text>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellHeader, styles.nameCol]}>Member</Text>
            <Text style={[styles.cellHeader, styles.countCol]}>Attended</Text>
            <Text style={[styles.cellHeader, styles.countCol]}>Of</Text>
          </View>
          {rows.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>
                {selectedProgramId ? 'No members match these filters.' : 'Pick a program above.'}
              </Text>
            </View>
          ) : (
            rows.map(({ member, attended, totalSessions: total }) => (
              <View key={member.id} style={styles.tableRow}>
                <Text style={[styles.cellBody, styles.nameCol]} numberOfLines={2}>
                  {member.firstName} {member.lastName}
                </Text>
                <Text style={[styles.cellBody, styles.countCol, styles.countHighlight]}>
                  {attended}
                </Text>
                <Text style={[styles.cellBody, styles.countCol]}>{total}</Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={[styles.exportBtn, (!rows.length || !selectedProgramId) && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={!rows.length || !selectedProgramId}
        >
          <Icon name="file-export-outline" size={22} color={AppTheme.background} />
          <Text style={styles.exportBtnText}>Export as TXT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  intro: {
    color: AppTheme.textSoft,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  dateBtn: {
    flex: 1,
    backgroundColor: AppTheme.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  dateLabel: {
    color: AppTheme.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  dateValue: {
    color: AppTheme.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  filterCard: {
    backgroundColor: AppTheme.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  filterTitle: {
    color: AppTheme.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  filterHint: {
    color: AppTheme.textMuted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  minInput: {
    backgroundColor: AppTheme.background,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: AppTheme.textPrimary,
    fontSize: 16,
  },
  sessionMeta: {
    color: AppTheme.accent,
    fontSize: 13,
    marginBottom: 10,
  },
  table: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: AppTheme.surface,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: AppTheme.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: AppTheme.border,
  },
  cellHeader: {
    color: AppTheme.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  cellBody: {
    color: AppTheme.textPrimary,
    fontSize: 15,
  },
  nameCol: {
    flex: 1,
    paddingRight: 8,
  },
  countCol: {
    width: 56,
    textAlign: 'center',
  },
  countHighlight: {
    color: AppTheme.accent,
    fontWeight: '700',
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: AppTheme.textMuted,
    textAlign: 'center',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: AppTheme.accent,
    paddingVertical: 14,
    borderRadius: 10,
  },
  exportBtnDisabled: {
    opacity: 0.45,
  },
  exportBtnText: {
    color: AppTheme.background,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProgramAttendanceReportScreen;
