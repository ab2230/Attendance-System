import XLSX from 'xlsx';
import { pick } from '@react-native-documents/picker'
import { readFile } from 'react-native-fs';
import { normalizeMemberType, MEMBER_TYPES } from '../constants/memberTypes';

const normalizeHeader = (header) =>
  String(header || '')
    .replace(/^\uFEFF/, '') // strip BOM
    .replace(/\u00A0/g, ' ') // non-breaking spaces from Sheets
    .trim();

const getCell = (row, keys) => {
  const rowKeys = Object.keys(row);

  for (const wanted of keys) {
    const wantedNorm = normalizeHeader(wanted).toLowerCase();
    const found = rowKeys.find(
      (k) => normalizeHeader(k).toLowerCase() === wantedNorm
    );
    if (found != null && row[found] != null && String(row[found]).trim() !== '') {
      return row[found];
    }
  }
  return '';
};

const parseWorkbook = (workbook) => {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
};

export const importStudents = async (selectedClassId) => {
  try {
    const result = await pick();
    const file = result[0];
    const fileName = (file.name || file.uri || '').toLowerCase();
    const isCsv = fileName.endsWith('.csv') || (file.type || '').includes('csv');

    let data = [];

    if (isCsv) {
      // Prefer UTF-8 text for Google Sheets CSV exports (handles BOM / Amharic text better)
      try {
        let csvText = await readFile(file.uri, 'utf8');
        csvText = csvText.replace(/^\uFEFF/, '');
        const workbook = XLSX.read(csvText, { type: 'string', FS: ',' });
        data = parseWorkbook(workbook);
      } catch (csvError) {
        console.log('CSV utf8 read failed, falling back to base64', csvError);
        const fileContent = await readFile(file.uri, 'base64');
        const workbook = XLSX.read(fileContent, { type: 'base64' });
        data = parseWorkbook(workbook);
      }
    } else {
      const fileContent = await readFile(file.uri, 'base64');
      const workbook = XLSX.read(fileContent, { type: 'base64' });
      data = parseWorkbook(workbook);
    }

    const validMembers = [];
    const skipped = [];

    data.forEach((row, index) => {
      const firstName = String(getCell(row, ['First Name', 'firstName', 'First'])).trim();
      const lastName = String(getCell(row, ['Last Name', 'lastName', 'Last'])).trim();
      const rawType = getCell(row, ['Type', 'type', 'Member Type', 'memberType', 'Student Type']);
      const type = normalizeMemberType(rawType);

      if (!firstName || !lastName) {
        skipped.push({ row: index + 2, reason: 'Missing first or last name' });
        return;
      }

      if (!type) {
        skipped.push({
          row: index + 2,
          reason: `Invalid or missing Type "${rawType || ''}". Must be one of: ${MEMBER_TYPES.join(', ')}`,
        });
        return;
      }

      validMembers.push({
        id: `imported-${Date.now()}-${index}`,
        firstName,
        lastName,
        type,
        classId: selectedClassId,
      });
    });

    return { members: validMembers, skipped };
    
  } catch (err) {
    console.log('error in importStudents', err);
    if (
      err?.code === 'DOCUMENT_PICKER_CANCELED' ||
      err?.code === 'DOCUMENT_PICKER_CANCELLED' ||
      /cancel(l)?ed/i.test(err?.message || '')
    ) {
      return null;
    }
    throw err;
  }
};
