import { isArrivalLate } from './attendanceLate';

export const PERMISSION_TYPES = {
  EXCUSED_ABSENCE: 'excused_absence',
  EXCUSED_LATENESS: 'excused_lateness',
};

export const PERMISSION_TYPE_OPTIONS = [
  { id: PERMISSION_TYPES.EXCUSED_ABSENCE, name: 'Excused Absence' },
  { id: PERMISSION_TYPES.EXCUSED_LATENESS, name: 'Excused Lateness' },
];

/** JS Date.getDay(): 0 Sunday … 6 Saturday */
export const WEEKDAY_OPTIONS = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  EXCUSED: 'Excused',
};

export const DISPLAY_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  EXCUSED_ABSENCE: 'Excused Absence',
  EXCUSED_LATENESS: 'Excused Lateness',
};

export function toPermissionDateKey(date) {
  if (!date) return '';
  const s = String(date);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  // Use local calendar date so weekday matches the teacher's selected day.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function weekdayFromDate(date) {
  if (date == null || date === '') return null;
  if (typeof date === 'number' && date >= 0 && date <= 6) return date;
  const key = toPermissionDateKey(date);
  if (!key) return null;
  // Parse as local noon to avoid timezone shifting the weekday.
  const d = new Date(`${key}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getDay();
}

export function weekdayLabel(weekday) {
  const found = WEEKDAY_OPTIONS.find((d) => d.id === Number(weekday));
  return found?.name || `Day ${weekday}`;
}

export function permissionTypeLabel(type) {
  if (type === PERMISSION_TYPES.EXCUSED_ABSENCE) return 'Excused Absence';
  if (type === PERMISSION_TYPES.EXCUSED_LATENESS) return 'Excused Lateness';
  return type || 'Permission';
}

export function normalizeWeekdayRules(rules = []) {
  const byDay = new Map();
  (rules || []).forEach((rule) => {
    const weekday = Number(rule?.weekday);
    const permissionType = rule?.permissionType || rule?.permission_type;
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;
    if (
      permissionType !== PERMISSION_TYPES.EXCUSED_ABSENCE &&
      permissionType !== PERMISSION_TYPES.EXCUSED_LATENESS
    ) {
      return;
    }
    byDay.set(weekday, { weekday, permissionType });
  });
  return Array.from(byDay.values()).sort((a, b) => a.weekday - b.weekday);
}

export function formatWeekdayRulesSummary(rules = []) {
  const normalized = normalizeWeekdayRules(rules);
  if (!normalized.length) return 'No weekdays set';
  return normalized
    .map((r) => `${weekdayLabel(r.weekday)}: ${permissionTypeLabel(r.permissionType)}`)
    .join(' · ');
}

export function getPermissionTypeForWeekday(permission, weekday) {
  if (!permission || weekday == null) return null;
  const rules = normalizeWeekdayRules(permission.weekdayRules || permission.weekday_rules || []);
  const match = rules.find((r) => r.weekday === Number(weekday));
  return match?.permissionType || null;
}

/**
 * Build a lookup: memberId -> permission row for a program.
 */
export function indexPermissionsByMember(permissions = []) {
  const map = new Map();
  (permissions || []).forEach((p) => {
    if (p?.memberId) map.set(p.memberId, p);
  });
  return map;
}

/**
 * Apply standing weekday permissions onto attendance member rows before save.
 */
export function applyPermissionsToMembers(
  members,
  permissions,
  { classStartTime, lateAfterMinutes = 0, date } = {},
) {
  const weekday = weekdayFromDate(date);
  const byMember = indexPermissionsByMember(permissions);

  return (members || []).map((member) => {
    const permission = byMember.get(member.memberId);
    const permissionType = getPermissionTypeForWeekday(permission, weekday);

    if (!permissionType) {
      return {
        ...member,
        excusedLate: Boolean(member.excusedLate),
      };
    }

    if (permissionType === PERMISSION_TYPES.EXCUSED_ABSENCE) {
      // Never override Present — only convert absence / unmarked / already-excused.
      if (member.status === ATTENDANCE_STATUS.PRESENT) {
        return { ...member, excusedLate: Boolean(member.excusedLate) };
      }
      return {
        ...member,
        status: ATTENDANCE_STATUS.EXCUSED,
        arrivalTime: null,
        isLate: false,
        excusedLate: false,
        permissionId: permission.id,
        permissionType,
      };
    }

    if (permissionType === PERMISSION_TYPES.EXCUSED_LATENESS) {
      if (member.status !== ATTENDANCE_STATUS.PRESENT) {
        return { ...member, excusedLate: Boolean(member.excusedLate) };
      }
      const late =
        member.isLate === true ||
        (member.isLate !== false &&
          isArrivalLate(member.arrivalTime, classStartTime, lateAfterMinutes));
      if (!late) {
        return {
          ...member,
          isLate: false,
          excusedLate: false,
          permissionId: permission.id,
          permissionType,
        };
      }
      return {
        ...member,
        status: ATTENDANCE_STATUS.PRESENT,
        isLate: true,
        excusedLate: true,
        permissionId: permission.id,
        permissionType,
      };
    }

    return { ...member, excusedLate: Boolean(member.excusedLate) };
  });
}

export function getDisplayAttendanceStatus(entry, record) {
  if (!entry) return '—';
  if (entry.status === ATTENDANCE_STATUS.EXCUSED) {
    return DISPLAY_STATUS.EXCUSED_ABSENCE;
  }
  if (entry.status === ATTENDANCE_STATUS.ABSENT) {
    return DISPLAY_STATUS.ABSENT;
  }
  if (entry.status === ATTENDANCE_STATUS.PRESENT) {
    if (entry.excusedLate) return DISPLAY_STATUS.EXCUSED_LATENESS;
    const late =
      entry.isLate === true ||
      (entry.isLate !== false &&
        isArrivalLate(
          entry.arrivalTime,
          record?.classStartTime,
          record?.lateAfterMinutes ?? 0,
        ));
    return late ? DISPLAY_STATUS.LATE : DISPLAY_STATUS.PRESENT;
  }
  return entry.status || '—';
}

export function isExcusedAbsenceEntry(entry) {
  return entry?.status === ATTENDANCE_STATUS.EXCUSED;
}

export function isExcusedLatenessEntry(entry) {
  return entry?.status === ATTENDANCE_STATUS.PRESENT && Boolean(entry?.excusedLate);
}

export function isPenalizedLateEntry(entry, record) {
  if (!entry || entry.status !== ATTENDANCE_STATUS.PRESENT) return false;
  if (entry.excusedLate) return false;
  if (entry.isLate === true) return true;
  if (entry.isLate === false) return false;
  return isArrivalLate(
    entry.arrivalTime,
    record?.classStartTime,
    record?.lateAfterMinutes ?? 0,
  );
}
