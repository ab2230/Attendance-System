import React, { useState, useContext } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Modal } from "react-native";
import TopNavigator from "../../common/TopNavigator";
import AttendanceModal from "./AttendanceModal";
import AddButton from '../../common/addButton';
import { AttendanceContext } from "../../context/AttendanceContext";
import { MemberContext } from "../../context/MemberContext";
import { ClassContext } from "../../context/ClassContext";
import { ProgramContext } from "../../context/ProgramContext";

const AttendanceScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const { attendanceRecords, markAttendance, updateAttendance: saveAttendanceRecord } = useContext(AttendanceContext);
  const { members } = useContext(MemberContext);
  const { classes } = useContext(ClassContext);
  const { programs } = useContext(ProgramContext);

  // Function to get class name by classId
  const getClassName = (classId) => {
    const classObj = classes.find((cls) => cls.id === classId);
    return classObj ? classObj.name : "Unknown Class";
  };

  // Function to get program name by programId
  const getProgramName = (programId) => {
    const programObj = programs.find((prog) => prog.id === programId);
    return programObj ? programObj.name : "Unknown Program";
  };

  // Function to handle updating attendance
  const handleUpdateAttendance = (memberId, status) => {
    const updatedMembers = selectedRecord.members.map((member) =>
      member.memberId === memberId ? { ...member, status } : member
    );
    setSelectedRecord({ ...selectedRecord, members: updatedMembers });
  };

  // Function to save updated attendance
  const handleSaveUpdatedAttendance = () => {
    saveAttendanceRecord(selectedRecord);
    setSelectedRecord(null); // Close the modal after saving
  };

  return (
    <View style={styles.container}>
      <TopNavigator title="Attendance Records" />
      <View style={{ padding: 16, backgroundColor: "#f5f5f5"}}>
      <FlatList
        data={attendanceRecords}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.recordCard}
            onPress={() => setSelectedRecord(item)}
          >
            <Text style={styles.recordDate}>{new Date(item.date).toDateString()}</Text>
            <Text style={styles.recordDetails}>
              Class: {getClassName(item.classId)} | Program: {getProgramName(item.programId)}
            </Text>
            <Text style={styles.recordDetails}>
              Members: {item.members.length}
            </Text>
          </TouchableOpacity>
        )}
      />
     

      {/* Modal to show attendance details */}
      <Modal visible={!!selectedRecord} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Attendance Details</Text>
            <Text style={styles.modalSubtitle}>
              Date: {new Date(selectedRecord?.date).toDateString()}
            </Text>
            <Text style={styles.modalSubtitle}>
              Class: {getClassName(selectedRecord?.classId)} | Program: {getProgramName(selectedRecord?.programId)}
            </Text>

            {/* Table for member attendance */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.headerText}>Name</Text>
                <Text style={styles.headerText}>Status</Text>
              </View>
              {selectedRecord?.members.map((member) => {
                const memberInfo = members.find((m) => m.id === member.memberId);
                return (
                  <View key={member.memberId} style={styles.tableRow}>
                    <Text style={styles.rowText}>
                      {memberInfo?.firstName} {memberInfo?.lastName}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        member.status === "Present" && styles.presentButton,
                        member.status === "Absent" && styles.absentButton,
                      ]}
                      onPress={() =>
                        handleUpdateAttendance(
                          member.memberId,
                          member.status === "Present" ? "Absent" : "Present"
                        )
                      }
                    >
                      <Text style={styles.statusText}>{member.status}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setSelectedRecord(null)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveUpdatedAttendance}
              >
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal to add new attendance */}
      </View>
      <AttendanceModal visible={modalVisible} onClose={() => setModalVisible(false)} />
      <AddButton onClick={() => setModalVisible(true)} />
    </View>
  );
};

export default AttendanceScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  recordCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordDate: { fontSize: 16, fontWeight: "bold", color: "#333" },
  recordDetails: { fontSize: 14, color: "#666", marginTop: 4 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 10 },
  modalSubtitle: { fontSize: 16, color: "#666", marginBottom: 10 },
  table: { marginVertical: 10 },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowText: { fontSize: 16, color: "#333" },
  statusButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#e0e0e0",
  },
  presentButton: { backgroundColor: "#28a745" },
  absentButton: { backgroundColor: "#dc3545" },
  statusText: { fontSize: 14, color: "#fff", fontWeight: "bold" },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: { backgroundColor: "#dc3545" },
  saveButton: { backgroundColor: "#007bff" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});