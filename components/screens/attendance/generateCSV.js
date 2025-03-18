import RNFS from 'react-native-fs';
import Share from 'react-native-share';

export const generateCSV = async (filteredRecords, paginatedMembers) => {
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