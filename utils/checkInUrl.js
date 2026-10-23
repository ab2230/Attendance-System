import Config from 'react-native-config';

const WEB_BASE_URL = Config.ATTENDANCE_WEB_URL || 'http://localhost:3000';

export function buildProgramCheckInUrl(programId) {
  const base = WEB_BASE_URL.replace(/\/$/, '');
  return `${base}/?program=${programId}`;
}

export function buildLegacyRoomCheckInUrl(roomId) {
  const base = WEB_BASE_URL.replace(/\/$/, '');
  return `${base}/?room=${roomId}`;
}
