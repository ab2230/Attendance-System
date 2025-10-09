import XLSX from 'xlsx';
import { pick, keepLocalCopy } from '@react-native-documents/picker'
import { readFile } from 'react-native-fs';

export const importStudents = async (selectedClassId, addMember) => {
  try {
    // Pick document with new API
    const result = await pick()

    console.log('result of document picker', result);
    // Read file content
    const fileContent = await readFile(result[0].uri, 'base64');
    
    // Parse Excel file
    const workbook = XLSX.read(fileContent, { type: 'base64' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Process data
    return data.map((row, index) => ({
      id: `imported-${Date.now()}-${index}`,
      firstName: row['First Name'] || row['firstName'] || row['First'] || '',
      lastName: row['Last Name'] || row['lastName'] || row['Last'] || '',
      classId: selectedClassId,
    })).filter(m => m.firstName && m.lastName);
    
  } catch (err) {
    console.log('error in importStudents', err);
    if (DocumentPicker.isCancel(err)) {
      return null;
    }
    throw err;
  }
};