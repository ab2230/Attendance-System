export const ORGANIZATION_MODULES = [
  { key: 'classes', label: 'Classes' },
  { key: 'members', label: 'Members' },
  { key: 'programs', label: 'Programs' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'rooms', label: 'Attendance rooms' },
  { key: 'organization', label: 'Organization & invites' },
];

export const CRUD_ACTIONS = ['create', 'read', 'update', 'delete'];

export function buildOwnerPermissions() {
  const permissions = {};
  ORGANIZATION_MODULES.forEach(({ key }) => {
    permissions[key] = {
      create: true,
      read: true,
      update: true,
      delete: true,
    };
  });
  return permissions;
}

export function buildEmptyPermissions() {
  const permissions = {};
  ORGANIZATION_MODULES.forEach(({ key }) => {
    permissions[key] = {
      create: false,
      read: false,
      update: false,
      delete: false,
    };
  });
  return permissions;
}

export function canPerform(permissions, isOwner, module, action) {
  if (isOwner) return true;
  if (!permissions || !permissions[module]) return false;
  return Boolean(permissions[module][action]);
}
