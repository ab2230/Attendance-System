import { isArrivalLate } from './attendanceLate';
import {
  ATTENDANCE_STATUS,
  isExcusedAbsenceEntry,
  isExcusedLatenessEntry,
  isPenalizedLateEntry,
} from './attendancePermissions';

export function toDateKey(date) {
  if (!date) return '';
  const s = String(date);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Whether this entry counts toward "attended" for report totals.
 *
 * @param {object} options
 * @param {boolean} options.excludeLate - exclude penalized late (not excused late)
 * @param {boolean} options.countExcusedAbsences - excused absence counts as attended
 * @param {boolean} options.countExcusedLateness - excused late counts as attended (default true)
 * @param {boolean} options.excludeExcusedRecords - ignore any excused absence/lateness entry
 */
export function entryCountsAsAttended(entry, record, options = {}) {
  const {
    excludeLate = false,
    countExcusedAbsences = false,
    countExcusedLateness = true,
    excludeExcusedRecords = false,
  } = typeof options === 'boolean'
    ? { excludeLate: options } // backward compatible: old callers passed boolean
    : options;

  if (!entry) return false;

  const excusedAbsence = isExcusedAbsenceEntry(entry);
  const excusedLate = isExcusedLatenessEntry(entry);

  if (excludeExcusedRecords && (excusedAbsence || excusedLate)) {
    return false;
  }

  if (excusedAbsence) {
    return Boolean(countExcusedAbsences);
  }

  if (entry.status !== ATTENDANCE_STATUS.PRESENT) return false;

  if (excusedLate) {
    return Boolean(countExcusedLateness);
  }

  if (!excludeLate) return true;

  if (entry.isLate === true) return false;
  if (entry.isLate === false) return true;

  const late = isArrivalLate(
    entry.arrivalTime,
    record.classStartTime,
    record.lateAfterMinutes ?? 0,
  );
  return !late;
}

/**
 * Per-member breakdown for a date range.
 */
export function buildProgramAttendanceReport({
  attendanceRecords,
  programId,
  enrolledMemberIds,
  members,
  startDateKey,
  endDateKey,
  excludeLate,
  countExcusedAbsences = false,
  countExcusedLateness = true,
  excludeExcusedRecords = false,
  minAttendance,
}) {
  if (!programId || !startDateKey || !endDateKey) {
    return { rows: [], totalSessions: 0 };
  }

  const start = startDateKey <= endDateKey ? startDateKey : endDateKey;
  const end = startDateKey <= endDateKey ? endDateKey : startDateKey;

  const recordsInRange = (attendanceRecords || []).filter((record) => {
    if (record.programId !== programId) return false;
    const key = toDateKey(record.date);
    return key >= start && key <= end;
  });

  const totalSessions = recordsInRange.length;
  const memberList = (members || []).filter((m) => enrolledMemberIds.includes(m.id));
  const countOptions = {
    excludeLate,
    countExcusedAbsences,
    countExcusedLateness,
    excludeExcusedRecords,
  };

  const rows = memberList.map((member) => {
    let attended = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excusedAbsence = 0;
    let excusedLateness = 0;

    recordsInRange.forEach((record) => {
      const entry = record.members?.find((e) => e.memberId === member.id);
      if (!entry) return;

      if (isExcusedAbsenceEntry(entry)) {
        excusedAbsence += 1;
      } else if (isExcusedLatenessEntry(entry)) {
        excusedLateness += 1;
        present += 1;
      } else if (entry.status === ATTENDANCE_STATUS.PRESENT) {
        present += 1;
        if (isPenalizedLateEntry(entry, record)) late += 1;
      } else if (entry.status === ATTENDANCE_STATUS.ABSENT) {
        absent += 1;
      }

      if (entryCountsAsAttended(entry, record, countOptions)) {
        attended += 1;
      }
    });

    return {
      member,
      attended,
      totalSessions,
      present,
      absent,
      late,
      excusedAbsence,
      excusedLateness,
    };
  });

  const min = Number(minAttendance);
  const filtered =
    Number.isFinite(min) && min > 0
      ? rows.filter((row) => row.attended >= min)
      : rows;

  filtered.sort((a, b) => {
    const nameA = `${a.member.firstName} ${a.member.lastName}`.trim();
    const nameB = `${b.member.firstName} ${b.member.lastName}`.trim();
    return nameA.localeCompare(nameB);
  });

  return { rows: filtered, totalSessions };
}
