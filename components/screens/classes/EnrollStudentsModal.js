import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Modal } from "react-native";
import { ProgramContext } from "../../context/ProgramContext";
import { MemberContext } from "../../context/MemberContext";
import { ClassContext } from "../../context/ClassContext";
import CustomDropDown from "../../common/CustomDropDown";

const EnrollStudentsModal = ({ programId, onClose, visible }) => {
  const { members } = useContext(MemberContext);
  const { programs, enrollStudents } = useContext(ProgramContext);
  const { classes } = useContext(ClassContext);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(null);

  const program = programs.find((p) => p.id === programId);
  const enrolledStudentIds = program.enrolledStudents || [];

  // Filter students who are not yet enrolled
  let availableStudents = members.filter((member) => !enrolledStudentIds.includes(member.id));

    // Filter students by selected class
    if (selectedClassId) {
      availableStudents = availableStudents.filter((student) => student.classId === selectedClassId);
    }
  // Search filter
  const filteredStudents = availableStudents.filter(
    (student) =>
      (!selectedClassId || student.classId === selectedClassId) &&
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchText.toLowerCase())
  );
  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleEnrollStudents = () => {
    enrollStudents(programId, [...enrolledStudentIds, ...selectedStudents]);
    onClose();
  };

  const handleEnrollAll = () => {
    enrollStudents(programId, [...enrolledStudentIds, ...availableStudents.map((s) => s.id)]);
    onClose();
  };

  return (
  <Modal visible={visible} transparent={true} animationType="slide">
    <View style={styles.modalContainer}>
      <Text style={styles.title}>Enroll Students</Text>
       {/* Class Selection */}
       <CustomDropDown
        label="Selected Class"
        data={[{ id: 0, name: "All" }, ...classes]}
        currentSelected={classes.find((cls) => cls.id === selectedClassId) || { id: 0, name: "All" }}
        setSelected={(input) => setSelectedClassId(input.id === 0 ? null : input.id)}
        required={true}
      />
      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search students..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor={"#999"}
      />

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.studentItem}
            onPress={() => toggleStudentSelection(item.id)}
          >
            <Text>{item.firstName} {item.lastName}</Text>
            {selectedStudents.includes(item.id) && <Text>✓</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No available students to enroll.</Text>}
      />

      <TouchableOpacity style={styles.enrollButton} onPress={handleEnrollStudents}>
        <Text style={styles.enrollButtonText}>Enroll Selected</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.enrollAllButton} onPress={handleEnrollAll}>
        <Text style={styles.enrollAllButtonText}>Enroll All</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "white",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginVertical: 10,
  },
  studentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  enrollButton: {
    backgroundColor:  "#162447",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  enrollButtonText: {
    color: "white",
    fontSize: 16,
  },
  enrollAllButton: {
    backgroundColor: "green",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  enrollAllButtonText: {
    color: "white",
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: "red",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
  },
});

export default EnrollStudentsModal;
