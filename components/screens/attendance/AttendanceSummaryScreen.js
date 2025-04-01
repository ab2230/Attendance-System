import React, { useState, useContext, useEffect } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  useWindowDimensions 
} from "react-native";
import { ClassContext } from "../../context/ClassContext";
import { MemberContext } from "../../context/MemberContext";
import { ProgramContext } from "../../context/ProgramContext";
import { AttendanceContext } from "../../context/AttendanceContext";
import CustomDropDown from "../../common/CustomDropDown";
import FontAwesome from 'react-native-vector-icons/FontAwesome';
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    // Adjust items per page based on screen width
    if (height < 600) {
      setItemsPerPage(4);
    } else if (height < 900) {
      setItemsPerPage(7);
    } else {
      setItemsPerPage(13);
    }
  }, [height]);

  useEffect(() => {
    if (!selectedProgramId) return;
  
    // Filter attendance records by selected program
    const filteredRecords = attendanceRecords.filter(
      (record) => record.programId === selectedProgramId
    );
  
    // Extract unique dates and sort them in descending order
    const uniqueDates = [...new Set(filteredRecords.map((record) => record.date))].sort().reverse();
    setDates(uniqueDates);
  
    // Collect unique member IDs from attendance records
    const enrolledMemberIds = new Set();
    filteredRecords.forEach((record) => {
      record.members.forEach((member) => enrolledMemberIds.add(member.memberId));
    });
  
    // Filter members based on attendance records
    let enrolledMembersList = members.filter((member) => enrolledMemberIds.has(member.id));
  
    // Further filter by selected class if applicable
    if (selectedClassId) {
      enrolledMembersList = enrolledMembersList.filter((member) => member.classId === selectedClassId);
    }
  
    // Further filter by selected member if applicable
    if (selectedMemberId) {
      enrolledMembersList = enrolledMembersList.filter((member) => member.id === selectedMemberId);
    }
  
    setEnrolledMembers(enrolledMembersList);
  
    // Create an attendance mapping for each enrolled member
    const attendanceMap = {};
    enrolledMembersList.forEach((member) => {
      attendanceMap[member.id] = {};
      uniqueDates.forEach((date) => {
        const record = filteredRecords.find((rec) => rec.date === date);
        if (record) {
          const memberRecord = record.members.find((m) => m.memberId === member.id);
          attendanceMap[member.id][date] = memberRecord ? memberRecord.status : "-";
        } else {
          attendanceMap[member.id][date] = "-";
        }
      });
    });
    
    setAttendanceData(attendanceMap);
    setCurrentPage(0); // Reset to first page when data changes
  
  }, [selectedProgramId, selectedClassId, selectedMemberId, attendanceRecords, members]);
  

  const getStatusColor = (status) => {
    console.log('Status:', status);
    switch(status) {
      case 'Present': return styles.present;
      case 'Absent': return styles.absent;
      case 'Late': return styles.late;
      default: return {};
    }
  };
  const membersDropdown = [
    { name: "All Members", id: 0, classId: null },
    ...enrolledMembers.map((member) => ({
      name: `${member.firstName} ${member.lastName}`,
      id: member.id,
      classId: member.classId,
    })),
  ];
  // Pagination calculations
  const totalPages = Math.ceil(enrolledMembers.length / itemsPerPage);
  const paginatedMembers = enrolledMembers.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisibleButtons = 5; // Maximum number of visible page buttons
    
    let startPage = Math.max(0, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisibleButtons - 1);
    
    // Adjust if we're at the start or end
    if (endPage - startPage + 1 < maxVisibleButtons) {
      startPage = Math.max(0, endPage - maxVisibleButtons + 1);
    }
    
    // Always show first page button
    if (startPage > 0) {
      buttons.push(
        <TouchableOpacity key="first" onPress={() => handlePageChange(0)} style={styles.pageButton}>
          <Text>1</Text>
        </TouchableOpacity>
      );
      if (startPage > 1) {
        buttons.push(<Text key="ellipsis-start">...</Text>);
      }
    }
    
    // Visible page buttons
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <TouchableOpacity 
          key={i} 
          onPress={() => handlePageChange(i)} 
          style={[
            styles.pageButton, 
            i === currentPage ? styles.activePageButton : null
          ]}
        >
          <Text style={i === currentPage ? styles.activePageText : null}>{i + 1}</Text>
        </TouchableOpacity>
      );
    }
    
    // Always show last page button
    if (endPage < totalPages - 1) {
      if (endPage < totalPages - 2) {
        buttons.push(<Text key="ellipsis-end">...</Text>);
      }
      buttons.push(
        <TouchableOpacity 
          key="last" 
          onPress={() => handlePageChange(totalPages - 1)} 
          style={styles.pageButton}
        >
          <Text>{totalPages}</Text>
        </TouchableOpacity>
      );
    }
    
    return buttons;
  };

  return (
    <View style={styles.mainContainer}>
      <CustomDropDown
          label="Select Program"
          data={programs}
          currentSelected={programs.find((program) => program.id === selectedProgramId)}
          setSelected={(input) => setSelectedProgramId(input.id)}
          required={true}
        />
        <CustomDropDown
          label="Select Class"
          data={classes}
          currentSelected={classes.find((cls) => cls.id === selectedClassId)}
          setSelected={(input) => setSelectedClassId(input.id)}
          required={true}
        />
      {selectedProgramId && (
        <CustomDropDown
          label="Select Member"
          data={membersDropdown}
          currentSelected={membersDropdown.find((member) => member.id === selectedMemberId)}
          setSelected={(input) => setSelectedMemberId(input.id)}
          required={false}
        />
      )}
      <ScrollView horizontal={true} style={styles.horizontalScroll}>
        <View style={styles.tableContainer}>
          {/* Fixed first column (Member names) */}
          <View style={styles.fixedColumn}>
            <View style={[styles.headerCell, styles.firstColumnHeader]}>
              <Text style={styles.headerText}>Members</Text>
            </View>
            {paginatedMembers.map((member) => (
              <View key={`name-${member.id}`} style={[styles.cell, styles.firstColumnCell]}>
                <Text style={styles.memberName}>{member.firstName} {member.lastName}</Text>
              </View>
            ))}
          </View>

          {/* Scrollable content */}
          <ScrollView horizontal={true}>
            <View style={styles.scrollableContent}>
              {/* Dates header */}
              <View style={styles.datesHeader}>
                {dates.map((date) => (
                  <View key={`date-${date}`} style={styles.headerCell}>
                    <Text style={styles.headerText}>{new Date(date).toLocaleDateString()}</Text>
                  </View>
                ))}
                <View style={styles.headerCell}>
                  <Text style={styles.headerText}>Total</Text>
                </View>
              </View>

              {/* Attendance data */}
              {paginatedMembers.map((member) => (
                <View key={`row-${member.id}`} style={styles.dataRow}>
                  {dates.map((date) => (
                    <View key={`att-${member.id}-${date}`} style={styles.cell}>
                      <Text style={[styles.statusText, getStatusColor(attendanceData[member.id]?.[date])]}>
                        {attendanceData[member.id]?.[date] || "-"}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.cell}>
                    <Text style={styles.totalText}>
                      {Object.values(attendanceData[member.id] || {}).filter((status) => status === "Present").length}
                      <Text style={styles.totalDenominator}>/{dates.length}</Text>
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Pagination controls */}
      
        <View style={styles.paginationContainer}>
        {enrolledMembers.length > itemsPerPage && (
          <>
          <TouchableOpacity 
            onPress={handlePrevPage} 
            disabled={currentPage === 0}
            style={[styles.paginationButton, currentPage === 0 && styles.disabledButton]}
          >
            <Text style={styles.paginationText}>Previous</Text>
          </TouchableOpacity>
          
          <View style={styles.pageNumbers}>
            {renderPaginationButtons()}
          </View>
          
          <TouchableOpacity 
            onPress={handleNextPage} 
            disabled={currentPage >= totalPages - 1}
            style={[styles.paginationButton, currentPage >= totalPages - 1 && styles.disabledButton]}
          >
            <Text style={styles.paginationText}>Next</Text>
          </TouchableOpacity>
          </>
     )}
       { enrolledMembers.length > 0? <TouchableOpacity 
          style={styles.exportButton} 
          onPress={()=> exportToTextFile(selectedProgramId,enrolledMembers, dates, attendanceData, programs, selectedClassId, classes)}
          disabled={!selectedProgramId}
        >
          <FontAwesome name="file-excel-o" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>: null
}
        </View>
 
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  horizontalScroll: {
    marginTop: 20,
  },
  tableContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fixedColumn: {
    backgroundColor: '#f1f3f5',
    zIndex: 10,
  },
  scrollableContent: {
    flexDirection: 'column',
  },
  datesHeader: {
    flexDirection: 'row',
    backgroundColor: '#343a40',
  },
  headerCell: {
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#dee2e6',
  },
  firstColumnHeader: {
    backgroundColor: '#343a40',
    minWidth: 150,
  },
  firstColumnCell: {
    minWidth: 150,
    justifyContent: 'center',
    paddingLeft: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cell: {
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dataRow: {
    flexDirection: 'row',
  },
  headerText: {
    fontWeight: '600',
    color: '#fff',
    fontSize: 14,
  },
  memberName: {
    fontWeight: '500',
    color: '#495057',
    fontSize: 14,
  },
  statusText: {
    fontWeight: '500',
    fontSize: 14,
  },
  present: {
    color: '#2b8a3e',
  },
  absent: {
    color: '#c92a2a',
  },
  late: {
    color: '#e67700',
  },
  totalText: {
    fontWeight: '600',
    color: '#1864ab',
    fontSize: 14,
  },
  totalDenominator: {
    color: '#868e96',
    fontWeight: 'normal',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  paginationText: {
    color: '#495057',
    fontWeight: '500',
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  activePageButton: {
    backgroundColor: '#343a40',
  },
  activePageText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b8a3e',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 10,
  },
  exportButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default AttendanceSummaryScreen;