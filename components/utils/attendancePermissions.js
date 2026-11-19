import { isArrivalLate } from './attendanceLate';

export const PERMISSION_TYPES = {
  EXCUSED_ABSENCE: 'excused_absence',
  EXCUSED_LATENESS: 'excused_lateness',
};

export const PERMISSION_TYPE_OPTIONS = [
  { id: PERMISSION_TYPES.EXCUSED_ABSENCE, name: 'Excused Absence' },
  { id: PERMISSION_TYPES.EXCUSED_LATENESS, name: 'Excused Lateness' },
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
  return d.toISOString().split('T')[0];
}

export function permissionTypeLabel(type) {
  if (type === PERMISSION_TYPES.EXCUSED_ABSENCE) return 'Excused Absence';
  if (type === PERMISSION_TYPES.EXCUSED_LATENESS) return 'Excused Lateness';
  return type || 'Permission';
}

/**
 * Build a lookup: memberId -> permission row for a given program/date set.
 */
export function indexPermissionsByMember(permissions = []) {
  const map = new Map();
  (permissions || []).forEach((p) => {
    if (p?.memberId) map.set(p.memberId, p);
  });
  return map;
}

/**
 * Apply standing permissions onto attendance member rows before save.
 * - excused_absence → status Excused (not Absent)
 * - excused_lateness + Present + late → keep Present, mark excusedLate (still isLate for audit)
 */
export function applyPermissionsToMembers(
  members,
  permissions,
  { classStartTime, lateAfterMinutes = 0 } = {},
) {
  const byMember = indexPermissionsByMember(permissions);
  return (members || []).map((member) => {
    const permission = byMember.get(member.memberId);
    if (!permission) {
      return {
        ...member,
        excusedLate: Boolean(member.excusedLate),
      };
    }

    if (permission.permissionType === PERMISSION_TYPES.EXCUSED_ABSENCE) {
      // Only convert absence / unmarked / already-excused — never override Present.
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
        permissionType: permission.permissionType,
      };
    }

    if (permission.permissionType === PERMISSION_TYPES.EXCUSED_LATENESS) {
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
          permissionType: permission.permissionType,
        };
      }
      return {
        ...member,
        status: ATTENDANCE_STATUS.PRESENT,
        isLate: true,
        excusedLate: true,
        permissionId: permission.id,
        permissionType: permission.permissionType,
      };
    }

    return { ...member, excusedLate: Boolean(member.excusedLate) };
  });
}

/**
 * Human-readable status for grids / summaries.
 */
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
