import type { RoleName } from './permissions';

export interface DemoAccount {
  name: string;
  email: string;
  password: string;
  pin: string;
  role: RoleName;
  scopeNote: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    name: 'Carlos Almonte',
    email: 'owner@demo.dev',
    password: 'DemoOwner!2026',
    pin: '1042',
    role: 'OWNER',
    scopeNote: 'Full access: manage roles, rotate PINs, revoke sessions, audit log.',
  },
  {
    name: 'Elena Vance',
    email: 'manager@demo.dev',
    password: 'DemoManager!2026',
    pin: '2084',
    role: 'MANAGER',
    scopeNote: 'Verify shifts, inspect team roster and audit log. Cannot alter roles.',
  },
  {
    name: 'Mateo Silva',
    email: 'staff@demo.dev',
    password: 'DemoStaff!2026',
    pin: '3096',
    role: 'STAFF',
    scopeNote: 'Log shift entries only. Admin endpoints return HTTP 403.',
  },
] as const;
