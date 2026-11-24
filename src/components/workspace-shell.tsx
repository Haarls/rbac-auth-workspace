'use client';

import { Info, KeyRound, LogOut, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { hasPermission, ROLE_DOT, type RoleName } from '../lib/permissions';
import { apiJson, BTN_GHOST } from '../lib/ui';
import { AuditPanel, type AuditEntryRow } from './audit-panel';
import { BrandIsotipo } from './pin-otp-input';
import { PinSwitchModal, type OperatorOption } from './pin-switch-modal';
import { ShiftPanel, type ShiftEntryRow } from './shift-panel';
import { TeamPanel, type ActiveSessionRow, type TeamMemberRow } from './team-panel';

export type { AuditEntryRow, ShiftEntryRow };

interface WorkspaceShellProps {
  sandboxId: string;
  currentUser: { id: string; name: string; email: string; role: RoleName; authMethod: string };
  pinOperators: OperatorOption[];
  shifts: ShiftEntryRow[];
  members: TeamMemberRow[];
  sessions: ActiveSessionRow[];
  audits: AuditEntryRow[];
}

type TabKey = 'SHIFTS' | 'TEAM' | 'AUDIT';

const OVERVIEW_POINTS = [
  {
    title: '1. Hybrid Shift Authentication',
    body: 'Combines HttpOnly HS256 JWT cookies with scrypt-hashed 4-digit Station PINs and a 5-strike PostgreSQL lockout for shared terminals.',
  },
  {
    title: '2. Server-Enforced RBAC & Revocation',
    body: 'Every Route Handler resolves live User.role and active Session rows from Neon PostgreSQL—demotions and revocations apply on the next request.',
  },
  {
    title: '3. Private 6h Ephemeral Sandbox',
    body: 'This workspace is isolated to your browser session and auto-deletes after 6 hours. Click Switch PIN (3096 for STAFF, 1042 for OWNER) to test 403 denials safely.',
  },
] as const;

export function WorkspaceShell({ sandboxId, currentUser, pinOperators, shifts, members, sessions, audits }: WorkspaceShellProps) {
  const router = useRouter();
  const canReadTeam = hasPermission(currentUser.role, 'team:read');
  const canManageTeam = hasPermission(currentUser.role, 'team:manage');
  const canRevoke = hasPermission(currentUser.role, 'session:revoke');
  const canVerifyShift = hasPermission(currentUser.role, 'shift:verify');
  const canReadAudit = hasPermission(currentUser.role, 'audit:read');

  const [tab, setTab] = useState<TabKey>('SHIFTS');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const navTabs: Array<{ id: TabKey; label: string; count: number }> = [
    { id: 'SHIFTS', label: 'Shift operations', count: shifts.length },
    ...(canReadTeam ? [{ id: 'TEAM' as const, label: canManageTeam ? 'Team & sessions' : 'Team directory', count: members.length }] : []),
    ...(canReadAudit ? [{ id: 'AUDIT' as const, label: 'Audit log', count: audits.length }] : []),
  ];

  const activeTab: TabKey = navTabs.some((t) => t.id === tab) ? tab : 'SHIFTS';

  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="border-b border-white/[0.08] bg-[#09090B]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2.5">
              <BrandIsotipo size="sm" />
              <span className="text-[13px] font-medium tracking-[-0.015em] text-zinc-100">
                Haarls <span className="text-zinc-600">/</span> Workspace
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#111113] px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-200 shadow-card">
              <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[currentUser.role]}`} />
              <span>{currentUser.role}</span>
            </span>
            <span className="truncate text-xs text-zinc-500">
              {currentUser.name} <span className="hidden font-mono sm:inline">· {currentUser.email}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-expanded={aboutOpen}
              onClick={() => setAboutOpen((p) => !p)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                aboutOpen
                  ? 'border-white/[0.18] bg-white/[0.07] text-zinc-100'
                  : 'border-white/[0.08] bg-[#111113] text-zinc-400 hover:border-white/[0.16] hover:text-zinc-200'
              }`}
            >
              <Info className="h-3.5 w-3.5 text-[#4ECDC4]" aria-hidden="true" />
              <span>About this sandbox</span>
            </button>
            {pinOperators.length > 0 && (
              <button type="button" onClick={() => setPinModalOpen(true)} className={`${BTN_GHOST} h-8 shadow-card`}>
                <KeyRound className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
                <span>Switch PIN</span>
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await apiJson('/api/auth/logout', 'POST');
                router.push('/login');
                router.refresh();
              }}
              className={`${BTN_GHOST} h-8 text-zinc-400`}
            >
              <LogOut className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {aboutOpen && (
          <div className="border-t border-white/[0.06] bg-[#111113]/90">
            <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="grid gap-4 text-xs leading-relaxed text-zinc-400 md:grid-cols-3">
                {OVERVIEW_POINTS.map((pt) => (
                  <div key={pt.title}>
                    <p className="font-medium text-zinc-200">{pt.title}</p>
                    <p className="mt-1">{pt.body}</p>
                  </div>
                ))}
                <p className="md:col-span-3 font-mono text-[11px] text-zinc-500">
                  Active isolated sandbox: <span className="text-zinc-300">{sandboxId}</span> · Auto-expires in 6h
                </p>
              </div>
              <button
                type="button"
                aria-label="Close sandbox overview"
                onClick={() => setAboutOpen(false)}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <nav
          aria-label="Workspace sections"
          className="no-scrollbar mx-auto flex max-w-6xl gap-5 overflow-x-auto whitespace-nowrap px-4 text-[13px] sm:px-6"
        >
          {navTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 pb-2.5 pt-1 font-medium transition-colors ${
                activeTab === item.id ? 'border-zinc-100 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>{item.label}</span>
              <span className="tabular-nums rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                {item.count}
              </span>
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === 'SHIFTS' && <ShiftPanel shifts={shifts} canVerify={canVerifyShift} />}
        {activeTab === 'TEAM' && canReadTeam && (
          <TeamPanel canManage={canManageTeam} canRevokeSessions={canRevoke} members={members} sessions={sessions} />
        )}
        {activeTab === 'AUDIT' && canReadAudit && <AuditPanel audits={audits} />}
      </main>

      {pinModalOpen && (
        <PinSwitchModal onClose={() => setPinModalOpen(false)} operators={pinOperators} currentEmail={currentUser.email} />
      )}
    </div>
  );
}
