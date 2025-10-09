import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { ClassContext } from "../../context/ClassContext";
import { MemberContext } from "../../context/MemberContext";
import { ProgramContext } from "../../context/ProgramContext";
import { AttendanceContext } from "../../context/AttendanceContext";
import CustomDropDown from "../../common/CustomDropDown";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { exportToTextFile } from "../../common/exportCSV";

const AttendanceSummaryScreen = () => {
  const { attendanceRecords } = useContext(AttendanceContext);
  const { classes } = useContext(ClassContext);
  const { programs } = useContext(ProgramContext);
  const { members } = useContext(MemberContext);
  const { height } = useWindowDimensions();

  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  const [dates, setDates] = useState([]);
  const [enrolledMembers, setEnrolledMembers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (height < 600) setItemsPerPage(4);
    else if (height < 900) setItemsPerPage(7);
    else setItemsPerPage(13);
  }, [height]);

  useEffect(() => {
    if (!selectedProgramId) return;

    const filteredRecords = attendanceRecords.filter(
      (r) => r.programId === selectedProgramId
    );

    const uniqueDates = [
      ...new Set(filteredRecords.map((r) => r.date)),
    ].sort().reverse();
    setDates(uniqueDates);

    const enrolledIds = new Set();
    filteredRecords.forEach((r) =>
      r.members.forEach((m) => enrolledIds.add(m.memberId))
    );

    let enrolled = members.filter((m) => enrolledIds.has(m.id));
    if (selectedClassId)
      enrolled = enrolled.filter((m) => m.classId === selectedClassId);
    if (selectedMemberId)
      enrolled = enrolled.filter((m) => m.id === selectedMemberId);

    setEnrolledMembers(enrolled);

    const attendanceMap = {};
    enrolled.forEach((m) => {
      attendanceMap[m.id] = {};
      uniqueDates.forEach((date) => {
        const record = filteredRecords.find((r) => r.date === date);
        const found = record?.members.find((mm) => mm.memberId === m.id);
        attendanceMap[m.id][date] = found
          ? found.isLate
            ? "Late"
            : found.status
          : "-";
      });
    });

    setAttendanceData(attendanceMap);
    setCurrentPage(0);
  }, [selectedProgramId, selectedClassId, selectedMemberId, attendanceRecords]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Present":
        return { color: "#2b8a3e" };
      case "Absent":
        return { color: "#c92a2a" };
      case "Late":
        return { color: "#e67700" };
      default:
        return { color: "#868e96" };
    }
  };

  const totalPages = Math.ceil(enrolledMembers.length / itemsPerPage);
  const paginatedMembers = enrolledMembers.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handlePageChange = (page) => {
    if (page >= 0 && page < totalPages) setCurrentPage(page);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const visible = 5;
    let start = Math.max(0, currentPage - Math.floor(visible / 2));
    let end = Math.min(totalPages - 1, start + visible - 1);

    if (end - start + 1 < visible)
      start = Math.max(0, end - visible + 1);

    for (let i = start; i <= end; i++) {
      buttons.push(
        <TouchableOpacity
          key={i}
          onPress={() => handlePageChange(i)}
          style={[
            styles.pageButton,
            i === currentPage && styles.activePageButton,
          ]}
        >
          <Text
            style={[
              styles.pageText,
              i === currentPage && styles.activePageText,
            ]}
          >
            {i + 1}
          </Text>
        </TouchableOpacity>
      );
    }
    return buttons;
  };

  const membersDropdown = [
    { name: "All Members", id: 0, classId: null },
    ...enrolledMembers.map((m) => ({
      name: `${m.firstName} ${m.lastName}`,
      id: m.id,
      classId: m.classId,
    })),
  ];

  return (
    <View style={styles.mainContainer}>
      <CustomDropDown
        label="Select Program"
        data={programs}
        currentSelected={programs.find((p) => p.id === selectedProgramId)}
        setSelected={(input) => setSelectedProgramId(input.id)}
        required
      />

      <CustomDropDown
        label="Select Class"
        data={classes}
        currentSelected={classes.find((c) => c.id === selectedClassId)}
        setSelected={(input) => setSelectedClassId(input.id)}
        required
      />

      {selectedProgramId && (
        <CustomDropDown
          label="Select Member"
          data={membersDropdown}
          currentSelected={membersDropdown.find(
            (m) => m.id === selectedMemberId
          )}
          setSelected={(input) => setSelectedMemberId(input.id)}
        />
      )}

      <ScrollView horizontal style={styles.tableScroll}>
        <View style={styles.tableWrapper}>
          <View style={styles.fixedColumn}>
            <View style={[styles.headerCell, styles.fixedHeader]}>
              <Text style={styles.headerText}>Members</Text>
            </View>
            {paginatedMembers.map((m) => (
              <View key={m.id} style={styles.fixedCell}>
                <Text style={styles.memberName}>
                  {m.firstName} {m.lastName}
                </Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal>
            <View>
              <View style={styles.headerRow}>
                {dates.map((d) => (
                  <View key={d} style={styles.headerCell}>
                    <Text style={styles.headerText}>
                      {new Date(d).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
                <View style={styles.headerCell}>
                  <Text style={styles.headerText}>Total</Text>
                </View>
              </View>

              {paginatedMembers.map((m) => (
                <View key={m.id} style={styles.dataRow}>
                  {dates.map((d) => (
                    <View key={`${m.id}-${d}`} style={styles.cell}>
                      <Text
                        style={[
                          styles.statusText,
                          getStatusColor(attendanceData[m.id]?.[d]),
                        ]}
                      >
                        {attendanceData[m.id]?.[d] || "-"}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.cell}>
                    <Text style={styles.totalText}>
                      {
                        Object.values(attendanceData[m.id] || {}).filter(
                          (s) => s === "Present" || s === "Late"
                        ).length
                      }
                      <Text style={styles.totalGray}>/{dates.length}</Text>
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {enrolledMembers.length > itemsPerPage && (
        <View style={styles.paginationWrapper}>
          <TouchableOpacity
            onPress={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            style={[
              styles.navButton,
              currentPage === 0 && styles.disabledButton,
            ]}
          >
            <Text style={styles.navText}>Prev</Text>
          </TouchableOpacity>

          <View style={styles.pages}>{renderPaginationButtons()}</View>

          <TouchableOpacity
            onPress={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            style={[
              styles.navButton,
              currentPage >= totalPages - 1 && styles.disabledButton,
            ]}
          >
            <Text style={styles.navText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {enrolledMembers.length > 0 && (
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() =>
            exportToTextFile(
              selectedProgramId,
              enrolledMembers,
              dates,
              attendanceData,
              programs,
              selectedClassId,
              classes
            )
          }
        >
          <FontAwesome name="file-excel-o" size={18} color="#fff" />
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8f9fa", padding: 16 },
  tableScroll: { marginTop: 16 },
  tableWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 2,
  },
  fixedColumn: { backgroundColor: "#f1f3f5" },
  fixedHeader: { backgroundColor: "#343a40" },
  headerRow: { flexDirection: "row", backgroundColor: "#343a40" },
  headerCell: {
    minWidth: 100,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: "#dee2e6",
  },
  headerText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  fixedCell: {
    minWidth: 150,
    padding: 10,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: "#e9ecef",
  },
  memberName: { color: "#212529", fontWeight: "500" },
  dataRow: { flexDirection: "row" },
  cell: {
    minWidth: 100,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#e9ecef",
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  statusText: { fontWeight: "500", fontSize: 13 },
  totalText: { color: "#1864ab", fontWeight: "600" },
  totalGray: { color: "#868e96" },

  paginationWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    elevation: 2,
  },
  pages: { flexDirection: "row", alignItems: "center" },
  pageButton: {
    borderWidth: 1,
    borderColor: "#adb5bd",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 3,
    backgroundColor: "#fff",
  },
  activePageButton: { backgroundColor: "#343a40", borderColor: "#343a40" },
  pageText: { color: "#343a40", fontWeight: "500" },
  activePageText: { color: "#fff", fontWeight: "700" },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#e9ecef",
    borderRadius: 6,
    marginHorizontal: 4,
  },
  navText: { color: "#343a40", fontWeight: "600" },
  disabledButton: { opacity: 0.5 },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 12,
    backgroundColor: "#2b8a3e",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exportText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
});

export default AttendanceSummaryScreen;
