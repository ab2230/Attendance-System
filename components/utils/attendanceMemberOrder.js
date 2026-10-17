import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'attendance_member_order_by_program';

const readAll = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error('Error reading attendance member order:', error);
    return {};
  }
};

export const getProgramMemberOrder = async (programId) => {
  if (!programId) return [];
  const data = await readAll();
  return Array.isArray(data[programId]) ? data[programId] : [];
};

/**
 * Move the given member IDs to the top for this program (keeping their relative order),
 * then append previously stored IDs that were not in this session.
 */
export const bumpProgramMemberOrder = async (programId, memberIdsInPriorityOrder = []) => {
  if (!programId || !memberIdsInPriorityOrder.length) return;

  const data = await readAll();
  const previous = Array.isArray(data[programId]) ? data[programId] : [];
  const seen = new Set();
  const next = [];

  memberIdsInPriorityOrder.forEach((id) => {
    if (id && !seen.has(id)) {
      next.push(id);
      seen.add(id);
    }
  });

  previous.forEach((id) => {
    if (id && !seen.has(id)) {
      next.push(id);
      seen.add(id);
    }
  });

  data[programId] = next;
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
};

export const sortMembersByProgramOrder = (members, orderIds = []) => {
  if (!members?.length) return [];
  if (!orderIds?.length) return members;

  const indexMap = new Map(orderIds.map((id, index) => [id, index]));
  return [...members].sort((a, b) => {
    const ai = indexMap.has(a.id) ? indexMap.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bi = indexMap.has(b.id) ? indexMap.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    const an = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
    const bn = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
    return an.localeCompare(bn);
  });
};
