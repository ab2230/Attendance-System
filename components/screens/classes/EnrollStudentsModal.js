import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Modal } from "react-native";
import { ProgramContext } from "../../context/ProgramContext";
import { MemberContext } from "../../context/MemberContext";
import { ClassContext } from "../../context/ClassContext";
import CustomDropDown from "../../common/CustomDropDown";
import LoadingButton from "../../common/LoadingButton";
import LoadingScreen from "../../common/LoadingScreen";

const EnrollStudentsModal = ({ programId, onClose, visible }) => {
  const { members } = useContext(MemberContext);
  const { programs, enrollStudents, loading } = useContext(ProgramContext);
  const { classes } = useContext(ClassContext);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(null);

  const program = programs.find((p) => p.id === programId);
  const enrolledStudentIds = program?.enrolledStudents || [];

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

  const handleEnrollStudents = async () => {
    if (loading || selectedStudents.length === 0) return;
    try {
      await enrollStudents(programId, [...enrolledStudentIds, ...selectedStudents]);
      setSelectedStudents([]);
      onClose();
    } catch (error) {
      console.error('Error enrolling selected students:', error);
    }
  };

  const handleEnrollAll = async () => {
    if (loading || filteredStudents.length === 0) return;
    try {
      await enrollStudents(programId, [...enrolledStudentIds, ...availableStudents.map((s) => s.id)]);
      setSelectedStudents([]);
      onClose();
    } catch (error) {
      console.error('Error enrolling all students:', error);
    }
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
            <View>
              <Text style={styles.studentName}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.studentType}>{item.type || 'Regular'}</Text>
            </View>
            {selectedStudents.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No available students to enroll.</Text>}
      />

      <LoadingButton
        onPress={handleEnrollStudents}
        loading={loading}
        title="Enroll Selected"
        loadingText="Enrolling..."
        icon="adduser"
        colors={['#162447', '#1e3a5f']}
        style={styles.enrollButton}
        disabled={selectedStudents.length === 0}
      />

      <LoadingButton
        onPress={handleEnrollAll}
        loading={loading}
        title="Enroll All"
        loadingText="Enrolling All..."
        icon="team"
        colors={['#4CAF50', '#45a049']}
        style={styles.enrollAllButton}
        disabled={filteredStudents.length === 0}
      />

      <TouchableOpacity 
        style={[styles.closeButton, loading && styles.disabledButton]} 
        onPress={onClose}
        disabled={loading}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
    
    {loading && (
      <LoadingScreen
        overlay={true}
        text="Enrolling students..."
        size="large"
      />
    )}
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
    color: "#000",
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
  studentName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  studentType: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
  disabledButton: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
});

export default EnrollStudentsModal;
