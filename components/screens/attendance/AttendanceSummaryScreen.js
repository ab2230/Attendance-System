import React, { useState, useContext, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { ClassContext } from "../../context/ClassContext";
import { MemberContext } from "../../context/MemberContext";
import { ProgramContext } from "../../context/ProgramContext";
import { AttendanceContext } from "../../context/AttendanceContext";
import CustomDropDown from "../../common/CustomDropDown";
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const screenHeight = Dimensions.get('window').height;
const PAGE_SIZE = Math.max(5, Math.floor(screenHeight / 100)); // Number of members per page

const AttendanceSummaryScreen = () => {
  const { attendanceRecords } = useContext(AttendanceContext);
  const { classes } = useContext(ClassContext);
  const { programs } = useContext(ProgramContext);
  const { members } = useContext(MemberContext);

  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(0);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [uniqueDates, setUniqueDates] = useState([]);
  const [isFilterActive, setIsFilterActive] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedMembers, setPaginatedMembers] = useState([]);

  const membersDropdown = [
    { name: "All Members", id: 0, classId: null },
    ...members.map((member) => ({
      name: `${member.firstName} ${member.lastName}`,
      id: member.id,
      classId: member.classId,
    })),
  ];

  useEffect(() => {
    filterRecords();
  }, [selectedClassId, selectedProgramId, selectedMemberId, attendanceRecords]);

  useEffect(() => {
    paginateData();
  }, [filteredRecords, currentPage]);

  const filterRecords = () => {
    if (!selectedClassId || !selectedProgramId) return setFilteredRecords([]);

    let filtered = attendanceRecords.filter(
      (record) =>
        record.classId === selectedClassId &&
        record.programId === selectedProgramId
    );

    if (selectedMemberId) {
      filtered = filtered.filter((record) =>
        record.members.some((member) => member.memberId === selectedMemberId)
      );
      setIsFilterActive(true);
    } else {
      setIsFilterActive(false);
    }

    setFilteredRecords(filtered);

    const dates = [...new Set(filtered.map(record => new Date(record.date).toDateString()))];
    setUniqueDates(dates);
  };

  const paginateData = () => {
    const filteredMembers = selectedMemberId
      ? members.filter((m) => m.id === selectedMemberId)
      : members.filter((m) => m.classId === selectedClassId);

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    setPaginatedMembers(filteredMembers.slice(startIndex, endIndex));
  };

  const clearFilters = () => {
    setSelectedMemberId(0);
    setIsFilterActive(false);
    setCurrentPage(1);
  };

  const getAttendanceStatus = (memberId, date) => {
    const record = filteredRecords.find(
      (rec) => new Date(rec.date).toDateString() === date
    );
    if (record) {
      const memberRecord = record.members.find((member) => member.memberId === memberId);
      return memberRecord ? memberRecord.status : "A";
    }
    return "A";
  };

  const getTotalAttendance = (memberId) => {
    const totalRecords = filteredRecords.length;
    const presentCount = filteredRecords.filter((record) =>
      record.members.some((member) => member.memberId === memberId && member.status === "Present")
    ).length;
    return `${presentCount}/${totalRecords}`;
  };

  const generateCSV = async () => {
    if (filteredRecords.length === 0) {
      alert("No data to export.");
      return;
    }

    let csvContent = "";

    // Create the header row
    const headers = ["Name", ...uniqueDates, "Total"];
    csvContent += headers.join(",") + "\r\n";

    // Create the data rows
    paginatedMembers.forEach((member) => {
      const row = [
        `${member.firstName} ${member.lastName}`,
        ...uniqueDates.map((date) => getAttendanceStatus(member.id, date)),
        getTotalAttendance(member.id),
      ];
      csvContent += row.join(",") + "\r\n";
    });

    // Define the file path
    const filePath = `${RNFS.DocumentDirectoryPath}/attendance_summary.csv`;

    try {
      // Write the CSV content to the file
      await RNFS.writeFile(filePath, csvContent, 'utf8');

      // Share the file using react-native-share
      await Share.open({
        title: 'Export Attendance Summary',
        url: `file://${filePath}`,
        type: 'text/csv',
      });
    } catch (error) {
      console.error("Error generating CSV:", error);
      alert("Failed to generate CSV. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Class Selection */}
      <CustomDropDown
        label="Selected Class"
        data={classes}
        currentSelected={classes.find((cls) => cls.id === selectedClassId)}
        setSelected={(input) => setSelectedClassId(input.id)}
        required={true}
      />

      {/* Program Selection */}
      <CustomDropDown
        label="Selected Program"
        data={programs}
        currentSelected={programs.find((program) => program.id === selectedProgramId)}
        setSelected={(input) => setSelectedProgramId(input.id)}
        required={true}
      />

      {/* Member Selection */}
      <CustomDropDown
        label="Select Member"
        data={membersDropdown.filter((m) => m.classId === selectedClassId || m.id === 0)}
        currentSelected={membersDropdown.find((member) => member.id === selectedMemberId)}
        setSelected={(input) => setSelectedMemberId(input.id)}
        required={false}
      />

      {/* Clear Filter Button */}
      {isFilterActive && (
        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Text style={styles.clearButtonText}>Clear Filter</Text>
        </TouchableOpacity>
      )}

      {/* Generate CSV Button */}
      <TouchableOpacity style={styles.generateButton} onPress={generateCSV}>
        <Text style={styles.generateButtonText}>Generate CSV</Text>
      </TouchableOpacity>

      {/* Table Header */}
      <ScrollView horizontal>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.columnName]}>Name</Text>
          {uniqueDates.map((date, index) => (
            <Text key={index} style={[styles.headerText, styles.columnDate]}>
              {date}
            </Text>
          ))}
          <Text style={[styles.headerText, styles.columnTotal]}>Total</Text>
        </View>
      </ScrollView>

      {/* Attendance List with Pagination */}
      <FlatList
        data={paginatedMembers}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No members found.</Text>}
        renderItem={({ item }) => (
          <ScrollView horizontal>
            <View style={styles.row}>
              <Text style={[styles.cell, styles.columnName]}>
                {item.firstName} {item.lastName}
              </Text>
              {uniqueDates.map((date, index) => (
                <Text key={index} style={[styles.cell, styles.columnDate]}>
                  {getAttendanceStatus(item.id, date)}
                </Text>
              ))}
              <Text style={[styles.cell, styles.columnTotal]}>
                {getTotalAttendance(item.id)}
              </Text>
            </View>
          </ScrollView>
        )}
      />

      {/* Pagination Controls */}
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
          disabled={currentPage === 1}
          onPress={() => setCurrentPage((prev) => prev - 1)}
        >
          <Text style={styles.pageButtonText}>Previous</Text>
        </TouchableOpacity>

        <Text style={styles.pageText}>Page {currentPage}</Text>

        <TouchableOpacity
          style={[
            styles.pageButton,
            paginatedMembers.length < PAGE_SIZE && styles.disabledButton,
          ]}
          disabled={paginatedMembers.length < PAGE_SIZE}
          onPress={() => setCurrentPage((prev) => prev + 1)}
        >
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AttendanceSummaryScreen;

const styles = StyleSheet.create({
  tableHeader: { flexDirection: "row", borderBottomWidth: 2, paddingVertical: 8, backgroundColor: "#ddd", marginTop:10 },
  headerText: { fontWeight: "bold", fontSize: 16, textAlign: "center", paddingHorizontal: 10 },
  row: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 8 },
  cell: { fontSize: 16, textAlign: "center", paddingVertical: 5, paddingHorizontal: 10 },
  columnName: { width: 150 },
  columnDate: { width: 100 },
  columnTotal: { width: 100 },
  emptyText: { textAlign: "center", fontSize: 16, color: "gray", marginTop: 20 },
  clearButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginVertical: 10,
  },
  clearButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  generateButton: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginVertical: 10,
  },
  generateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  pagination: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
  pageButton: { padding: 10, backgroundColor: "#007bff", borderRadius: 5, marginHorizontal: 10 },
  disabledButton: { backgroundColor: "#ccc" },
  pageButtonText: { color: "white", fontSize: 16 },
  pageText: { fontSize: 16, fontWeight: "bold", textAlign: "center" },
});