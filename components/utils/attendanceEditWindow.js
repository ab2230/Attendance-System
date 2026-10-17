const DEFAULT_MAX_LATE_MINUTES = 60;

/**
 * Build the editable-until deadline from attendance date, class start time,
 * and max late minutes.
 */
export const getAttendanceEditDeadline = (
  date,
  classStartTime,
  maxLateMinutes = DEFAULT_MAX_LATE_MINUTES
) => {
  if (!date || !classStartTime) return null;

  const datePart = String(date).includes('T')
    ? String(date).split('T')[0]
    : String(date).slice(0, 10);

  const timePart = String(classStartTime).slice(0, 8);
  const normalizedTime =
    timePart.length === 5 ? `${timePart}:00` : timePart.slice(0, 8);

  const deadline = new Date(`${datePart}T${normalizedTime}`);
  if (Number.isNaN(deadline.getTime())) return null;

  const minutes = Number(maxLateMinutes);
  deadline.setMinutes(
    deadline.getMinutes() + (Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_MAX_LATE_MINUTES)
  );
  return deadline;
};

export const isAttendanceEditable = (record) => {
  if (!record) return false;
  const deadline = getAttendanceEditDeadline(
    record.date,
    record.classStartTime,
    record.maxLateMinutes
  );
  if (!deadline) return false;
  return new Date() <= deadline;
};

export const getEditWindowMessage = (record) => {
  const deadline = getAttendanceEditDeadline(
    record?.date,
    record?.classStartTime,
    record?.maxLateMinutes
  );
  if (!deadline) {
    return 'This attendance record can no longer be edited.';
  }
  return `Editing closed after ${deadline.toLocaleString()}. Max late window was ${record?.maxLateMinutes || DEFAULT_MAX_LATE_MINUTES} minutes.`;
};

export { DEFAULT_MAX_LATE_MINUTES };
