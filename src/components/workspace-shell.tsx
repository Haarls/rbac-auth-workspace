'use client';

import { Check, Info, KeyRound, LogOut, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { hasPermission, ROLE_DOT, type RoleName } from '@/lib/permissions';
import { CustomSelect } from './custom-select';
import { BrandIsotipo } from './pin-otp-input';
import { PinSwitchModal, type OperatorOption } from './pin-switch-modal';
import { TeamPanel, type ActiveSessionRow, type TeamMemberRow } from './team-panel';

export interface ShiftEntryRow {
  id: string;
  station: string;
  summary: string;
  cashDeltaCents: number;
  status: string;
  authorEmail: string;
  createdAt: string;
}

export interface AuditEntryRow {
  id: string;
  actorEmail: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

interface WorkspaceShellProps {
  currentUser: { id: string; name: string; email: string; role: RoleName; authMethod: string };
  pinOperators: OperatorOption[];
  shifts: ShiftEntryRow[];
  members: TeamMemberRow[];
  sessions: ActiveSessionRow[];
  audits: AuditEntryRow[];
}

type TabKey = 'SHIFTS' | 'TEAM' | 'AUDIT';

const ALERT_ACTIONS = new Set(['ACCESS_DENIED_403', 'AUTH_PIN_LOCKED', 'SESSION_REVOKED']);
const WARN_ACTIONS = new Set(['AUTH_PIN_FAILED', 'AUTH_LOGIN_FAILED']);
const fmtUtc = (iso: string) => iso.slice(0, 19).replace('T', ' ');

const INPUT_CLS =
  'mt-1.5 h-9 w-full rounded-lg border border-white/[0.09] bg-[#0C0C0E] px-3 text-xs text-zinc-100 transition-all placeholder:text-zinc-600 hover:border-white/[0.16] focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/[0.06]';

export function WorkspaceShell({
  currentUser,
  pinOperators,
  shifts,
  members,
  sessions,
  audits,
}: WorkspaceShellProps) {
  const router = useRouter();
  const canReadTeam = hasPermission(currentUser.role, 'team:read');
  const canManageTeam = hasPermission(currentUser.role, 'team:manage');
  const canRevoke = hasPermission(currentUser.role, 'session:revoke');
  const canVerifyShift = hasPermission(currentUser.role, 'shift:verify');
  const canReadAudit = hasPermission(currentUser.role, 'audit:read');

  const [tab, setTab] = useState<TabKey>('SHIFTS');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [station, setStation] = useState('REG-01');
  const [summary, setSummary] = useState('');
  const [cashDeltaUsd, setCashDeltaUsd] = useState('0.00');
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditQuery, setAuditQuery] = useState('');

  const auditActionOptions = useMemo(() => {
    const unique = Array.from(new Set(audits.map((a) => a.action))).sort();
    return [
      { value: 'ALL', label: 'All events' },
      ...unique.map((act) => ({
        value: act,
        label: act,
        dotClass: ALERT_ACTIONS.has(act)
          ? 'bg-red-400'
          : WARN_ACTIONS.has(act)
            ? 'bg-amber-400'
            : 'bg-zinc-500',
      })),
    ];
  }, [audits]);

  const filteredAudits = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    return audits.filter((a) => {
      if (auditActionFilter !== 'ALL' && a.action !== auditActionFilter) return false;
      return (
        !q ||
        a.actorEmail.toLowerCase().includes(q) ||
        a.target.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q)
      );
    });
  }, [audits, auditActionFilter, auditQuery]);

  const navTabs: Array<{ id: TabKey; label: string; count?: number }> = [
    { id: 'SHIFTS', label: 'Shift operations', count: shifts.length },
    ...(canReadTeam
      ? [
          {
            id: 'TEAM' as const,
            label: canManageTeam ? 'Team & sessions' : 'Team directory',
            count: members.length,
          },
        ]
      : []),
    ...(canReadAudit ? [{ id: 'AUDIT' as const, label: 'Audit log', count: audits.length }] : []),
  ];

  const activeTab: TabKey = navTabs.some((t) => t.id === tab) ? tab : 'SHIFTS';

  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault();
    setShiftError(null);
    const parsedAmount = Number(cashDeltaUsd);
    if (!Number.isFinite(parsedAmount)) {
      setShiftError('Enter a valid numeric USD amount.');
      return;
    }
    setShiftBusy(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station, summary, cashDeltaUsd: parsedAmount }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setShiftError(data.error ?? `Failed (HTTP ${res.status}).`);
        return;
      }
      setSummary('');
      setCashDeltaUsd('0.00');
      router.refresh();
    } finally {
      setShiftBusy(false);
    }
  }

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
              {currentUser.name}{' '}
              <span className="hidden font-mono sm:inline">· {currentUser.email}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-expanded={aboutOpen}
              onClick={() => setAboutOpen((prev) => !prev)}
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
              <button
                type="button"
                onClick={() => setPinModalOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111113] px-3 text-xs font-medium text-zinc-300 shadow-card transition-colors hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-zinc-100"
              >
                <KeyRound className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
                <span>Switch PIN</span>
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
                router.refresh();
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111113] px-3 text-xs font-medium text-zinc-400 transition-colors hover:border-white/[0.16] hover:text-zinc-200"
            >
              <LogOut className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {aboutOpen && (
          <div className="border-t border-white/[0.06] bg-[#111113]/90">
            <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-4 text-xs leading-relaxed text-zinc-400 md:grid-cols-3">
                  <div>
                    <p className="font-medium text-zinc-200">1. Hybrid Shift Authentication</p>
                    <p className="mt-1">
                      Combines <code className="font-mono text-zinc-300">HttpOnly</code> HS256 JWT
                      cookies with <code className="font-mono text-zinc-300">scrypt</code>-hashed
                      4-digit Station PINs and a 5-strike PostgreSQL lockout for shared POS/ops
                      terminals.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">2. Server-Enforced RBAC &amp; Revocation</p>
                    <p className="mt-1">
                      Every Route Handler resolves live <code className="font-mono text-zinc-300">User.role</code>{' '}
                      and active <code className="font-mono text-zinc-300">Session</code> rows from
                      Neon PostgreSQL—role demotions and session revocations apply on the very next
                      request.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">3. How to Test HTTP 403 &amp; Audit Log</p>
                    <p className="mt-1">
                      Click <span className="text-zinc-200">Switch PIN</span> → choose{' '}
                      <span className="font-mono text-zinc-200">Mateo Silva (STAFF)</span> with PIN{' '}
                      <span className="tabular-nums font-mono text-zinc-200">3096</span>. Calling{' '}
                      <code className="font-mono text-zinc-300">/api/users</code> returns{' '}
                      <span className="font-mono text-red-400">403 Forbidden</span> and records{' '}
                      <code className="font-mono text-zinc-300">ACCESS_DENIED_403</code> (switch back
                      to <span className="tabular-nums font-mono text-zinc-200">1042</span> to inspect).
                    </p>
                  </div>
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
          </div>
        )}

        <nav
          aria-label="Workspace sections"
          className="no-scrollbar mx-auto flex max-w-6xl gap-5 overflow-x-auto whitespace-nowrap px-4 text-[13px] sm:px-6"
        >
          {navTabs.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 pb-2.5 pt-1 font-medium transition-colors ${
                  active
                    ? 'border-zinc-100 text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="tabular-nums rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === 'SHIFTS' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 shadow-card sm:p-6">
              <div>
                <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">
                  Record shift entry
                </h2>
                <p className="mt-0.5 text-[13px] text-zinc-400">
                  Log register floats, cash variances, or handoff notes into the ledger.
                </p>
              </div>

              <form onSubmit={handleCreateShift} className="mt-5 grid gap-3.5 sm:grid-cols-12">
                <div className="sm:col-span-2">
                  <label htmlFor="shift-station" className="block text-xs font-medium text-zinc-400">
                    Station
                  </label>
                  <input
                    id="shift-station"
                    required
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className={`${INPUT_CLS} font-mono`}
                  />
                </div>
                <div className="sm:col-span-6">
                  <label htmlFor="shift-summary" className="block text-xs font-medium text-zinc-400">
                    Operational note
                  </label>
                  <input
                    id="shift-summary"
                    required
                    minLength={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Opening float verified / supplier COD settlement"
                    className={INPUT_CLS}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="shift-delta" className="block text-xs font-medium text-zinc-400">
                    Cash delta (USD)
                  </label>
                  <input
                    id="shift-delta"
                    inputMode="decimal"
                    required
                    value={cashDeltaUsd}
                    onChange={(e) => setCashDeltaUsd(e.target.value)}
                    className={`${INPUT_CLS} tabular-nums font-mono`}
                  />
                </div>
                <div className="flex items-end sm:col-span-2">
                  <button
                    type="submit"
                    disabled={shiftBusy}
                    className="h-9 w-full rounded-lg bg-zinc-100 px-4 text-xs font-medium text-zinc-950 shadow-sm transition-all hover:bg-white active:scale-[0.99] disabled:opacity-40"
                  >
                    {shiftBusy ? 'Saving...' : 'Log entry'}
                  </button>
                </div>
              </form>
              {shiftError && (
                <p role="alert" className="mt-3 text-xs text-red-400">
                  {shiftError}
                </p>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">
                    Shift ledger
                  </h2>
                  <p className="mt-0.5 text-[13px] text-zinc-400">
                    Ordered newest first. Managers and Owners can reconcile open entries.
                  </p>
                </div>
                <span className="tabular-nums font-mono text-xs text-zinc-500">
                  {shifts.length} entries
                </span>
              </div>

              {shifts.length === 0 ? (
                <p className="px-6 py-8 text-xs text-zinc-500">No shift entries recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/[0.08] text-[11px] font-medium text-zinc-500">
                      <tr>
                        <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">
                          Timestamp (UTC)
                        </th>
                        <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Station</th>
                        <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Summary</th>
                        <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">
                          Operator
                        </th>
                        <th className="whitespace-nowrap px-5 py-3 text-right font-medium sm:px-6">
                          Cash delta
                        </th>
                        <th className="whitespace-nowrap px-5 py-3 text-right font-medium sm:px-6">
                          State
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {shifts.map((s) => {
                        const usd = s.cashDeltaCents / 100;
                        return (
                          <tr key={s.id} className="transition-colors hover:bg-white/[0.02]">
                            <td className="tabular-nums whitespace-nowrap px-5 py-3.5 font-mono text-zinc-500 sm:px-6">
                              {fmtUtc(s.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5 font-mono text-zinc-200 sm:px-6">
                              {s.station}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-zinc-200 sm:px-6">
                              {s.summary}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5 font-mono text-zinc-500 sm:px-6">
                              {s.authorEmail}
                            </td>
                            <td
                              className={`tabular-nums whitespace-nowrap px-5 py-3.5 text-right font-mono font-medium sm:px-6 ${
                                usd < 0 ? 'text-amber-400' : 'text-zinc-200'
                              }`}
                            >
                              {usd >= 0 ? `+$${usd.toFixed(2)}` : `-$${Math.abs(usd).toFixed(2)}`}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-right sm:px-6">
                              {s.status === 'VERIFIED' ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-300">
                                  <Check className="h-3.5 w-3.5 text-[#4ECDC4]" aria-hidden="true" />
                                  <span>Verified</span>
                                </span>
                              ) : canVerifyShift ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const r = await fetch(`/api/shifts/${s.id}/verify`, {
                                      method: 'POST',
                                    });
                                    if (r.ok) router.refresh();
                                  }}
                                  className="h-7 rounded-md border border-white/[0.09] bg-[#0C0C0E] px-2.5 font-medium text-zinc-300 transition-colors hover:border-white/[0.20] hover:text-zinc-100"
                                >
                                  Verify
                                </button>
                              ) : (
                                <span className="font-mono text-[11px] text-amber-400/90">
                                  Open
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'TEAM' && canReadTeam && (
          <TeamPanel
            canManage={canManageTeam}
            canRevokeSessions={canRevoke}
            members={members}
            sessions={sessions}
          />
        )}

        {activeTab === 'AUDIT' && canReadAudit && (
          <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] shadow-card">
            <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">
                  Security &amp; operations audit
                </h2>
                <p className="mt-0.5 text-[13px] text-zinc-400">
                  Append-only trail of logins, PIN unlocks, role updates, and 403 denials.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <CustomSelect
                  id="audit-action"
                  ariaLabel="Filter audit log by event type"
                  value={auditActionFilter}
                  options={auditActionOptions}
                  onChange={setAuditActionFilter}
                  mono
                  className="w-full sm:w-auto sm:min-w-[195px]"
                />
                <div className="relative w-full sm:w-60">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                    aria-hidden="true"
                  />
                  <label htmlFor="audit-search" className="sr-only">
                    Search audit events
                  </label>
                  <input
                    id="audit-search"
                    type="search"
                    value={auditQuery}
                    onChange={(e) => setAuditQuery(e.target.value)}
                    placeholder="Filter actor, target, detail..."
                    className="h-9 w-full rounded-lg border border-white/[0.09] bg-[#0C0C0E] pl-8 pr-3 text-xs text-zinc-100 transition-all placeholder:text-zinc-600 hover:border-white/[0.16] focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/[0.06]"
                  />
                </div>
              </div>
            </div>

            {filteredAudits.length === 0 ? (
              <p className="px-6 py-8 text-xs text-zinc-500">
                No audit events match the active filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] text-[11px] font-medium text-zinc-500">
                    <tr>
                      <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">
                        Timestamp (UTC)
                      </th>
                      <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Event</th>
                      <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Actor</th>
                      <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Target</th>
                      <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {filteredAudits.map((a) => {
                      const isAlert = ALERT_ACTIONS.has(a.action);
                      const isWarn = WARN_ACTIONS.has(a.action);
                      return (
                        <tr key={a.id} className="transition-colors hover:bg-white/[0.02]">
                          <td className="tabular-nums whitespace-nowrap px-5 py-3.5 font-mono text-zinc-500 sm:px-6">
                            {fmtUtc(a.createdAt)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 sm:px-6">
                            <span
                              className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[11px] ${
                                isAlert
                                  ? 'border-red-500/25 bg-red-500/[0.06] text-red-400'
                                  : isWarn
                                    ? 'border-amber-500/25 bg-amber-500/[0.06] text-amber-400'
                                    : 'border-white/[0.08] bg-white/[0.03] text-zinc-300'
                              }`}
                            >
                              {a.action}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-zinc-400 sm:px-6">
                            {a.actorEmail}
                          </td>
                          <td className="tabular-nums whitespace-nowrap px-5 py-3.5 font-mono text-zinc-200 sm:px-6">
                            {a.target}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-zinc-400 sm:px-6">
                            {a.detail}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      <PinSwitchModal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        operators={pinOperators}
        currentEmail={currentUser.email}
      />
    </div>
  );
}
