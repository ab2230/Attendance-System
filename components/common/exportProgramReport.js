import { Alert, Platform, Share } from 'react-native';
import RNFS from 'react-native-fs';

export async function exportProgramReportTxt({
  programName,
  startDateKey,
  endDateKey,
  rows,
  totalSessions,
  excludeLate,
  minAttendance,
}) {
  if (!rows.length) {
    Alert.alert('No data', 'There are no members to export with the current filters.');
    return;
  }

  const lines = [];
  lines.push('Program attendance report');
  lines.push(`Program: ${programName || '—'}`);
  lines.push(`Date range: ${startDateKey} to ${endDateKey}`);
  lines.push(`Sessions in range: ${totalSessions}`);
  lines.push(`Exclude late from count: ${excludeLate ? 'Yes' : 'No'}`);
  if (minAttendance && Number(minAttendance) > 0) {
    lines.push(`Minimum attendance filter: ${minAttendance}+`);
  }
  lines.push('');
  lines.push('Name\tAttended\tSessions');

  rows.forEach(({ member, attended, totalSessions: total }) => {
    const name = `${member.firstName} ${member.lastName}`.trim();
    lines.push(`${name}\t${attended}\t${total}`);
  });

  const body = lines.join('\n');
  const fileName = `program_report_${startDateKey}_${endDateKey}.txt`;
  const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

  try {
    await RNFS.writeFile(filePath, body, 'utf8');

    if (Platform.OS === 'android') {
      Alert.alert(
        'Export successful',
        `Saved to Downloads: ${fileName}`,
        [
          { text: 'OK' },
          { text: 'Share', onPress: () => Share.share({ message: body, title: fileName }) },
        ],
      );
    } else {
      await Share.share({ message: body, title: fileName });
    }
  } catch (error) {
    console.error('Export program report error:', error);
    Alert.alert('Error', 'Could not export. Try Share with the text copied from the app.');
    await Share.share({ message: body, title: fileName }).catch(() => {});
  }
}
