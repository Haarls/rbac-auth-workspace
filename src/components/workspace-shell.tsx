'use client';

import {
  CheckCircle2,
  ClipboardList,
  KeyRound,
  LogOut,
  ScrollText,
  Search,
  Shield,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { hasPermission, ROLE_BADGE, type RoleName } from '@/lib/permissions';
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
  const [station, setStation] = useState('REG-01');
  const [summary, setSummary] = useState('');
  const [cashDeltaUsd, setCashDeltaUsd] = useState('0.00');
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditQuery, setAuditQuery] = useState('');

  const auditActions = useMemo(
    () => ['ALL', ...Array.from(new Set(audits.map((a) => a.action))).sort()],
    [audits],
  );

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

  const navTabs: Array<{ id: TabKey; label: string; icon: ReactNode }> = [
    { id: 'SHIFTS', label: 'Shift Operations', icon: <ClipboardList className="h-3.5 w-3.5" /> },
    ...(canReadTeam
      ? [
          {
            id: 'TEAM' as const,
            label: canManageTeam ? 'Team & Sessions' : 'Team Directory',
            icon: <Users className="h-3.5 w-3.5" />,
          },
        ]
      : []),
    ...(canReadAudit
      ? [
          {
            id: 'AUDIT' as const,
            label: `Audit Log (${audits.length})`,
            icon: <ScrollText className="h-3.5 w-3.5" />,
          },
        ]
      : []),
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
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-ink">
              <Shield className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>Haarls / Ops Workspace</span>
            </div>
            <span
              className={`rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${ROLE_BADGE[currentUser.role]}`}
            >
              {currentUser.role}
            </span>
            <span className="text-xs text-muted">
              {currentUser.name} <span className="font-mono">({currentUser.email})</span> · via{' '}
              <span className="font-mono">{currentUser.authMethod}</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {pinOperators.length > 0 && (
              <button
                type="button"
                onClick={() => setPinModalOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-canvas px-3.5 text-xs font-medium text-ink transition-colors hover:border-accent/60"
              >
                <KeyRound className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                <span>Switch Operator</span>
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
                router.refresh();
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3.5 text-xs font-medium text-muted transition-colors hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <div className="border-t border-line/60">
          <nav
            aria-label="Workspace sections"
            className="mx-auto flex max-w-6xl gap-2 px-6 py-2 text-xs font-medium"
          >
            {navTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`tabular-nums inline-flex h-8 items-center gap-2 rounded-md px-3 transition-colors ${
                  activeTab === item.id
                    ? 'bg-line text-ink'
                    : 'text-muted hover:bg-canvas/60 hover:text-ink'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {activeTab === 'SHIFTS' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-line bg-surface p-6">
              <h2 className="text-sm font-semibold text-ink">Record Shift Entry</h2>
              <p className="mt-0.5 text-xs text-muted">
                Log cash drawer movements, handoffs, or station settlements into the operational ledger.
              </p>

              <form onSubmit={handleCreateShift} className="mt-5 grid gap-4 sm:grid-cols-12">
                <div className="sm:col-span-2">
                  <label htmlFor="shift-station" className="block text-xs font-medium text-muted">
                    Station
                  </label>
                  <input
                    id="shift-station"
                    required
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 font-mono text-xs text-ink"
                  />
                </div>
                <div className="sm:col-span-6">
                  <label htmlFor="shift-summary" className="block text-xs font-medium text-muted">
                    Operational Note
                  </label>
                  <input
                    id="shift-summary"
                    required
                    minLength={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Opening float verified / supplier COD settlement"
                    className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-xs text-ink placeholder:text-muted"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="shift-delta" className="block text-xs font-medium text-muted">
                    Cash Delta (USD)
                  </label>
                  <input
                    id="shift-delta"
                    inputMode="decimal"
                    required
                    value={cashDeltaUsd}
                    onChange={(e) => setCashDeltaUsd(e.target.value)}
                    className="tabular-nums mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 font-mono text-xs text-ink"
                  />
                </div>
                <div className="flex items-end sm:col-span-2">
                  <button
                    type="submit"
                    disabled={shiftBusy}
                    className="h-10 w-full rounded-lg bg-accent px-4 text-xs font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {shiftBusy ? 'Saving...' : 'Log Entry'}
                  </button>
                </div>
              </form>
              {shiftError && (
                <p role="alert" className="mt-3 text-xs text-danger">
                  {shiftError}
                </p>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Recent Shift Ledger</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Ordered newest first. Managers and Owners can reconcile open entries.
                  </p>
                </div>
                <span className="tabular-nums rounded-md border border-line bg-canvas px-2.5 py-1 font-mono text-xs text-muted">
                  {shifts.length} entries
                </span>
              </div>

              {shifts.length === 0 ? (
                <p className="px-6 py-8 text-xs text-muted">No shift entries recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-line bg-canvas/40 text-muted">
                      <tr>
                        <th className="px-6 py-3 font-medium">Timestamp (UTC)</th>
                        <th className="px-6 py-3 font-medium">Station</th>
                        <th className="px-6 py-3 font-medium">Summary</th>
                        <th className="px-6 py-3 font-medium">Operator</th>
                        <th className="px-6 py-3 text-right font-medium">Cash Delta</th>
                        <th className="px-6 py-3 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {shifts.map((s) => {
                        const usd = s.cashDeltaCents / 100;
                        return (
                          <tr key={s.id} className="transition-colors hover:bg-canvas/30">
                            <td className="tabular-nums whitespace-nowrap px-6 py-4 font-mono text-muted">
                              {fmtUtc(s.createdAt)}
                            </td>
                            <td className="px-6 py-4 font-mono font-medium text-ink">{s.station}</td>
                            <td className="px-6 py-4 text-ink">{s.summary}</td>
                            <td className="px-6 py-4 font-mono text-muted">{s.authorEmail}</td>
                            <td
                              className={`tabular-nums px-6 py-4 text-right font-mono font-medium ${
                                usd < 0 ? 'text-warn' : 'text-ink'
                              }`}
                            >
                              {usd >= 0 ? `+$${usd.toFixed(2)}` : `-$${Math.abs(usd).toFixed(2)}`}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {s.status === 'VERIFIED' ? (
                                <span className="inline-flex items-center gap-1 rounded border border-ok/30 bg-ok/10 px-2 py-0.5 font-mono text-[11px] text-ok">
                                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                  <span>VERIFIED</span>
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
                                  className="h-8 rounded-md border border-line bg-canvas px-3 font-mono text-xs text-ink transition-colors hover:border-accent"
                                >
                                  Verify
                                </button>
                              ) : (
                                <span className="inline-block rounded border border-warn/30 bg-warn/10 px-2 py-0.5 font-mono text-[11px] text-warn">
                                  OPEN
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
          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">Security &amp; Operations Audit</h2>
                <p className="mt-0.5 text-xs text-muted">
                  Immutable log of logins, PIN switches, role mutations, and HTTP 403 denials.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <label htmlFor="audit-action" className="sr-only">
                  Filter by action
                </label>
                <select
                  id="audit-action"
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="h-9 rounded-lg border border-line bg-canvas px-3 font-mono text-xs text-ink"
                >
                  {auditActions.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
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
                    className="h-9 w-60 rounded-lg border border-line bg-canvas pl-8 pr-3 text-xs text-ink placeholder:text-muted"
                  />
                </div>
              </div>
            </div>

            {filteredAudits.length === 0 ? (
              <p className="px-6 py-8 text-xs text-muted">
                No audit events match the active filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-canvas/40 text-muted">
                    <tr>
                      <th className="px-6 py-3 font-medium">Timestamp (UTC)</th>
                      <th className="px-6 py-3 font-medium">Action</th>
                      <th className="px-6 py-3 font-medium">Actor</th>
                      <th className="px-6 py-3 font-medium">Target</th>
                      <th className="px-6 py-3 font-medium">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredAudits.map((a) => {
                      const badgeTone = ALERT_ACTIONS.has(a.action)
                        ? 'border-danger/40 bg-danger/10 text-danger'
                        : WARN_ACTIONS.has(a.action)
                          ? 'border-warn/30 bg-warn/10 text-warn'
                          : 'border-line bg-canvas text-ink';
                      return (
                        <tr key={a.id} className="transition-colors hover:bg-canvas/30">
                          <td className="tabular-nums whitespace-nowrap px-6 py-4 font-mono text-muted">
                            {fmtUtc(a.createdAt)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={`inline-block rounded border px-2 py-0.5 font-mono text-[11px] font-medium ${badgeTone}`}
                            >
                              {a.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-muted">{a.actorEmail}</td>
                          <td className="tabular-nums px-6 py-4 font-mono text-ink">{a.target}</td>
                          <td className="px-6 py-4 leading-relaxed text-muted">{a.detail}</td>
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
