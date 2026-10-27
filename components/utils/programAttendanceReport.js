import { isArrivalLate } from './attendanceLate';

export function toDateKey(date) {
  if (!date) return '';
  const s = String(date);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export function entryCountsAsAttended(entry, record, excludeLate) {
  if (!entry || entry.status !== 'Present') return false;
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
 * @returns {{ rows: Array<{ member, attended, totalSessions }>, totalSessions: number }}
 */
export function buildProgramAttendanceReport({
  attendanceRecords,
  programId,
  enrolledMemberIds,
  members,
  startDateKey,
  endDateKey,
  excludeLate,
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

  const rows = memberList.map((member) => {
    let attended = 0;
    recordsInRange.forEach((record) => {
      const entry = record.members?.find((e) => e.memberId === member.id);
      if (entryCountsAsAttended(entry, record, excludeLate)) {
        attended += 1;
      }
    });
    return { member, attended, totalSessions };
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
