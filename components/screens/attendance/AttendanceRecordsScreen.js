import React, { useState, useContext, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { ClassContext } from "../../context/ClassContext";
import { MemberContext } from "../../context/MemberContext";
import { ProgramContext } from "../../context/ProgramContext";
import { AttendanceContext } from "../../context/AttendanceContext";
import CustomDropDown from "../../common/CustomDropDown";

const AttendanceRecordsScreen = () => {
  const { attendanceRecords } = useContext(AttendanceContext);
  const { classes } = useContext(ClassContext);
  const { programs } = useContext(ProgramContext);
  const { members } = useContext(MemberContext);

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

    // Step 1: Filter attendance records by programId and date
    const filteredByProgramAndDate = attendanceRecords.filter(
      (record) =>
        record.programId === selectedProgramId &&
        new Date(record.date).toDateString() === selectedDate.toDateString()
    );

    // Step 2: Extract enrolled members from the filtered records
    const enrolledMemberIds = new Set();
    filteredByProgramAndDate.forEach((record) => {
      record.members.forEach((member) => enrolledMemberIds.add(member.memberId));
    });

    // Step 3: Get the full member details for enrolled members
    const enrolledMembersList = members.filter((member) =>
      enrolledMemberIds.has(member.id)
    );

    // Step 4: Further filter enrolled members by classId (if selected)
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
      display: "default",
      onChange: (_, date) => {
        if (date) setSelectedDate(date);
      },
    });
  };

  const getMemberStatus = (memberId) => {
    const record = filteredRecords.find((rec) =>
      rec.members.some((member) => member.memberId === memberId)
    );
    if (!record) return "N/A";
    const memberRecord = record.members.find((member) => member.memberId === memberId);
    return memberRecord ? memberRecord.status : "N/A";
  };

  return (
    <View style={styles.container}>
        {/* Program Selection */}
        <CustomDropDown
          label="Select Program"
          data={programs}
          currentSelected={programs.find((program) => program.id === selectedProgramId)}
          setSelected={(input) => setSelectedProgramId(input.id)}
          required={true}
        />

        {/* Class Selection */}
        <CustomDropDown
          label="Select Class"
          data={classes}
          currentSelected={classes.find((cls) => cls.id === selectedClassId)}
          setSelected={(input) => setSelectedClassId(input.id)}
          required={true}
        />

        {/* Date Selection */}
        <TouchableOpacity onPress={showDatePicker} style={styles.datePickerButton}>
          <Text style={styles.dateText}>{selectedDate.toDateString()}</Text>
        </TouchableOpacity>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.columnName]}>Name</Text>
          <Text style={[styles.headerText, styles.columnStatus]}>Status</Text>
        </View>

        {/* Attendance List */}
        <FlatList
          data={enrolledMembers}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No members found.</Text>}
          renderItem={({ item }) => {
            const status = getMemberStatus(item.id);

            return (
              <View style={styles.row}>
                <Text style={[styles.cell, styles.columnName]}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    styles.columnStatus,
                    status === "Present" ? styles.present : styles.absent,
                  ]}
                >
                  {status}
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
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 5,
    backgroundColor: "#ddd",
  },
  headerText: { fontWeight: "bold", fontSize: 16, textAlign: "center" },
  row: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 8 },
  cell: { fontSize: 16, textAlign: "center", paddingVertical: 5 },
  columnName: { flex: 2 },
  columnStatus: { flex: 1 },
  present: { color: "green", fontWeight: "bold" },
  absent: { color: "red", fontWeight: "bold" },
  emptyText: { textAlign: "center", fontSize: 16, color: "gray", marginTop: 20 },
  datePickerButton: {
    padding: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
    alignItems: "center",
    marginVertical: 10,
  },
  dateText: { fontSize: 16 },
});