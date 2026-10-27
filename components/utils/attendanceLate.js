/** Minutes after class start before an arrival counts as late (0 = late right after start). */
export const DEFAULT_LATE_AFTER_MINUTES = 0;

const padTime = (timeStr) => {
  const s = String(timeStr || '').trim();
  if (s.length >= 8) return s.slice(0, 8);
  if (s.length === 5) return `${s}:00`;
  return s;
};

/**
 * True when arrival is strictly after class start + lateAfterMinutes.
 */
export function isArrivalLate(arrivalTime, classStartTime, lateAfterMinutes = DEFAULT_LATE_AFTER_MINUTES) {
  if (!arrivalTime || !classStartTime) return false;

  const arrival = new Date(`2000-01-01T${padTime(arrivalTime)}`);
  const threshold = new Date(`2000-01-01T${padTime(classStartTime)}`);

  const grace = Number(lateAfterMinutes);
  if (Number.isFinite(grace) && grace > 0) {
    threshold.setMinutes(threshold.getMinutes() + grace);
  }

  if (Number.isNaN(arrival.getTime()) || Number.isNaN(threshold.getTime())) {
    return false;
  }

  return arrival > threshold;
}
