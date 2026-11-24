export type RoleName = 'OWNER' | 'MANAGER' | 'STAFF';

export type Permission =
  | 'shift:read'
  | 'shift:create'
  | 'shift:verify'
  | 'team:read'
  | 'team:manage'
  | 'session:revoke'
  | 'audit:read';

export const ROLE_PERMISSIONS: Record<RoleName, readonly Permission[]> = {
  OWNER: [
    'shift:read',
    'shift:create',
    'shift:verify',
    'team:read',
    'team:manage',
    'session:revoke',
    'audit:read',
  ],
  MANAGER: ['shift:read', 'shift:create', 'shift:verify', 'team:read', 'audit:read'],
  STAFF: ['shift:read', 'shift:create'],
} as const;

export function hasPermission(role: RoleName, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requiredRoleLabel(permission: Permission): RoleName {
  if (ROLE_PERMISSIONS.STAFF.includes(permission)) return 'STAFF';
  if (ROLE_PERMISSIONS.MANAGER.includes(permission)) return 'MANAGER';
  return 'OWNER';
}

export const ROLE_DOT: Record<RoleName, string> = {
  OWNER: 'bg-[#4ECDC4]',
  MANAGER: 'bg-zinc-300',
  STAFF: 'bg-zinc-500',
};
