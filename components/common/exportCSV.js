
import { 
  Platform,
  Share,
  Alert
} from "react-native";
import RNFS from 'react-native-fs';

const generateTableData = (selectedProgramId, enrolledMembers, dates, attendanceData, programs, selectedClassId, classes) => {
  if (!selectedProgramId || enrolledMembers.length === 0 || dates.length === 0) {
      Alert.alert('No Data', 'There is no data to export');
      return null;
  }

  const programName = programs.find(p => p.id === selectedProgramId)?.name || 'All Programs';
  const className = selectedClassId ? classes.find(c => c.id === selectedClassId)?.name : 'All Classes';

  // Define column widths
  const nameWidth = 18;
  const dateWidth = 12;
  const totalWidth = 14;

  // Create a formatted header row
  let table = `+${'-'.repeat(nameWidth)}+${dates.map(() => '-'.repeat(dateWidth)).join('+')}+${'-'.repeat(totalWidth)}+\n`;
  table += `| ${'Member Name'.padEnd(nameWidth - 1)} | ${dates.map(date => new Date(date).toLocaleDateString().padEnd(dateWidth - 1)).join(' | ')} | ${'Total Present'.padEnd(totalWidth - 1)} |\n`;
  table += `+${'-'.repeat(nameWidth)}+${dates.map(() => '-'.repeat(dateWidth)).join('+')}+${'-'.repeat(totalWidth)}+\n`;

  // Populate the table with data
  enrolledMembers.forEach(member => {
      const memberName = `${member.firstName} ${member.lastName}`.padEnd(nameWidth - 1);
      const attendanceValues = dates.map(date => (attendanceData[member.id]?.[date] || '-').padEnd(dateWidth - 1)).join(' | ');
      const presentCount = Object.values(attendanceData[member.id] || {}).filter(status => status === 'Present').length;
      const totalAttendance = `${presentCount}/${dates.length}`.padEnd(totalWidth - 1);

      table += `| ${memberName} | ${attendanceValues} | ${totalAttendance} |\n`;
  });

  // Add closing border
  table += `+${'-'.repeat(nameWidth)}+${dates.map(() => '-'.repeat(dateWidth)).join('+')}+${'-'.repeat(totalWidth)}+\n`;

  return table;
};

// Export Function (Saves as .txt)
export const exportToTextFile = async (selectedProgramId, enrolledMembers, dates, attendanceData, programs, selectedClassId, classes) => {
  const tableData = generateTableData(selectedProgramId, enrolledMembers, dates, attendanceData, programs, selectedClassId, classes);
  if (!tableData) return;

  const fileName = `attendance_summary_${new Date().toISOString().split('T')[0]}.txt`;
  const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

  try {
      await RNFS.writeFile(filePath, tableData, 'utf8');

      if (Platform.OS === 'android') {
          Alert.alert(
              'Export Successful',
              `File saved to Downloads folder: ${fileName}`,
              [
                  { text: 'OK', onPress: () => {} },
                  { text: 'Share', onPress: () => Share.share({ url: `file://${filePath}` }) }
              ]
          );
      } else {
          Share.share({
              title: 'Attendance Summary',
              url: `file://${filePath}`,
          });
      }
  } catch (error) {
      console.error('Error exporting file:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
  }
};