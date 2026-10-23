import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { ClassContext } from "../../context/ClassContext";
import { MemberContext } from "../../context/MemberContext";
import { ProgramContext } from "../../context/ProgramContext";
import { AttendanceContext } from "../../context/AttendanceContext";
import AppTheme from "../../theme/appTheme";

const AttendanceRecordsScreen = () => {
  const { attendanceRecords, loadAttendanceRecords } = useContext(AttendanceContext);
  const { classes, loadClasses } = useContext(ClassContext);
  const { programs, loadPrograms } = useContext(ProgramContext);
  const { members, loadMembers } = useContext(MemberContext);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadAttendanceRecords(),
        loadClasses(),
        loadPrograms(),
        loadMembers(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [enrolledMembers, setEnrolledMembers] = useState([]);

  useEffect(() => {
    filterRecords();
  }, [selectedClassId, selectedProgramId, selectedDate, attendanceRecords]);

  const filterRecords = () => {
    if (!selectedProgramId) {
      setFilteredRecords([]);
      setEnrolledMembers([]);
      return;
    }

    const filteredByProgramAndDate = attendanceRecords.filter(
      (record) =>
        record.programId === selectedProgramId &&
        new Date(record.date).toDateString() === selectedDate.toDateString()
    );

    const enrolledMemberIds = new Set();
    filteredByProgramAndDate.forEach((record) => {
      record.members.forEach((member) => enrolledMemberIds.add(member.memberId));
    });

    const enrolledMembersList = members.filter((member) =>
      enrolledMemberIds.has(member.id)
    );

    const filteredByClass = selectedClassId
      ? enrolledMembersList.filter((member) => member.classId === selectedClassId)
      : enrolledMembersList;

    setEnrolledMembers(filteredByClass);
    setFilteredRecords(filteredByProgramAndDate);
  };

  const showDatePicker = () => {
    DateTimePickerAndroid.open({
      value: selectedDate,
      mode: "date",
      display: Platform.OS === "ios" ? "spinner" : "default",
      onChange: (_, date) => {
        if (date) setSelectedDate(date);
      },
    });
  };

  const getMemberStatus = (memberId) => {
    const record = filteredRecords.find((rec) =>
      rec.members.some((member) => member.memberId === memberId)
    );
    if (!record) return { status: "N/A", arrivalTime: null };
    const memberRecord = record.members.find((member) => member.memberId === memberId);
    return memberRecord
      ? {
          status: memberRecord.isLate ? "Late" : memberRecord.status,
          arrivalTime: memberRecord.arrivalTime,
        }
      : { status: "N/A", arrivalTime: null };
  };

  return (
    <View style={styles.container}>

      {/* PROGRAM SELECTION */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Select Program</Text>
        <View style={styles.pickerBox}>
          {programs.map((program) => (
            <TouchableOpacity
              key={program.id}
              style={[
                styles.pickerItem,
                selectedProgramId === program.id && styles.selectedItem,
              ]}
              onPress={() => setSelectedProgramId(program.id)}
            >
              <Text
                style={[
                  styles.pickerText,
                  selectedProgramId === program.id && styles.selectedText,
                ]}
              >
                {program.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* CLASS SELECTION */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Select Class</Text>
        <View style={styles.pickerBox}>
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={[
                styles.pickerItem,
                selectedClassId === cls.id && styles.selectedItem,
              ]}
              onPress={() => setSelectedClassId(cls.id)}
            >
              <Text
                style={[
                  styles.pickerText,
                  selectedClassId === cls.id && styles.selectedText,
                ]}
              >
                {cls.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* DATE PICKER */}
      <TouchableOpacity onPress={showDatePicker} style={styles.dateButton}>
        <Text style={styles.dateButtonText}>
          {selectedDate.toDateString()}
        </Text>
      </TouchableOpacity>

      {/* TABLE HEADER */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.nameColumn]}>Name</Text>
        <Text style={[styles.headerText, styles.statusColumn]}>Status</Text>
        <Text style={[styles.headerText, styles.timeColumn]}>Arrival</Text>
      </View>

      {/* ATTENDANCE LIST */}
      <FlatList
        data={enrolledMembers}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4da0b0']} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No members found for this filter.</Text>
        }
        renderItem={({ item }) => {
          const { status, arrivalTime } = getMemberStatus(item.id);

          return (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.nameColumn]}>
                {item.firstName} {item.lastName}
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.statusColumn,
                  status === "Present"
                    ? styles.present
                    : status === "Late"
                    ? styles.late
                    : status === "Absent"
                    ? styles.absent
                    : styles.na,
                ]}
              >
                {status}
              </Text>
              <Text style={[styles.cell, styles.timeColumn]}>
                {arrivalTime || "N/A"}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
};

export default AttendanceRecordsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: AppTheme.textSecondary,
  },
  pickerBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
  },
  pickerItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    margin: 5,
  },
  selectedItem: {
    backgroundColor: AppTheme.accent,
  },
  pickerText: {
    color: "#333",
    fontSize: 15,
  },
  selectedText: {
    color: AppTheme.accentText,
    fontWeight: "bold",
  },
  dateButton: {
    backgroundColor: AppTheme.accent,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  dateButtonText: {
    color: AppTheme.accentText,
    fontSize: 16,
    fontWeight: "600",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E6E6E6",
    paddingVertical: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  headerText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  cell: {
    fontSize: 15,
    textAlign: "center",
    color: "#000",
  },
  nameColumn: { flex: 2 },
  statusColumn: { flex: 1 },
  timeColumn: { flex: 1 },
  present: { color: "green", fontWeight: "600" },
  late: { color: "orange", fontWeight: "600" },
  absent: { color: "red", fontWeight: "600" },
  na: { color: "gray" },
  emptyText: {
    textAlign: "center",
    color: "gray",
    marginTop: 20,
    fontSize: 16,
  },
});
