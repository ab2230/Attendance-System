export const MEMBER_TYPES = ['Regular', 'Extension', 'Distant'];

export const MEMBER_TYPE_OPTIONS = MEMBER_TYPES.map((type) => ({
  id: type,
  name: type,
}));

export const DEFAULT_MEMBER_TYPE = 'Regular';

/**
 * Normalize a raw type string to one of MEMBER_TYPES.
 * Returns null if the value is missing or invalid.
 */
export const normalizeMemberType = (rawType) => {
  if (rawType == null) return null;
  const value = String(rawType).trim().toLowerCase();
  if (!value) return null;

  const match = MEMBER_TYPES.find((type) => type.toLowerCase() === value);
  return match || null;
};

export const isValidMemberType = (rawType) => normalizeMemberType(rawType) !== null;
