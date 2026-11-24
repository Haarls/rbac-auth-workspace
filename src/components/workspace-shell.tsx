'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { hasPermission, type RoleName } from '@/lib/permissions';
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
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: RoleName;
    authMethod: string;
  };
  pinOperators: OperatorOption[];
  shifts: ShiftEntryRow[];
  members: TeamMemberRow[];
  sessions: ActiveSessionRow[];
  audits: AuditEntryRow[];
}

type TabKey = 'SHIFTS' | 'TEAM' | 'AUDIT';

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
      if (!q) return true;
      return (
        a.actorEmail.toLowerCase().includes(q) ||
        a.target.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q)
      );
    });
  }, [audits, auditActionFilter, auditQuery]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

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

  async function handleVerifyShift(id: string) {
    const res = await fetch(`/api/shifts/${id}/verify`, { method: 'POST' });
    if (res.ok) router.refresh();
  }

  const activeTab: TabKey =
    (tab === 'TEAM' && !canReadTeam) || (tab === 'AUDIT' && !canReadAudit) ? 'SHIFTS' : tab;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold tracking-tight text-ink">
              OPS WORKSPACE
            </span>
            <span className="rounded border border-line bg-canvas px-2 py-0.5 font-mono text-xs text-ink">
              {currentUser.role}
            </span>
            <span className="text-xs text-muted">
              {currentUser.name} ({currentUser.email}) · via {currentUser.authMethod}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pinOperators.length > 0 && (
              <button
                type="button"
                onClick={() => setPinModalOpen(true)}
                className="rounded border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:border-accent"
              >
                Switch Operator (PIN)
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded border border-line px-3 py-1.5 text-xs text-muted hover:text-ink"
            >
              Sign Out
            </button>
          </div>
        </div>

        <nav
          aria-label="Workspace sections"
          className="mx-auto flex max-w-6xl gap-6 px-4 text-xs font-medium"
        >
          <button
            type="button"
            onClick={() => setTab('SHIFTS')}
            className={`border-b-2 py-2.5 transition-colors ${
              activeTab === 'SHIFTS'
                ? 'border-accent text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Shift Operations
          </button>
          {canReadTeam && (
            <button
              type="button"
              onClick={() => setTab('TEAM')}
              className={`border-b-2 py-2.5 transition-colors ${
                activeTab === 'TEAM'
                  ? 'border-accent text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {canManageTeam ? 'Team & Sessions' : 'Team Directory'}
            </button>
          )}
          {canReadAudit && (
            <button
              type="button"
              onClick={() => setTab('AUDIT')}
              className={`tabular-nums border-b-2 py-2.5 transition-colors ${
                activeTab === 'AUDIT'
                  ? 'border-accent text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              Audit Log ({audits.length})
            </button>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {activeTab === 'SHIFTS' && (
          <div className="space-y-6">
            <section className="rounded border border-line bg-surface p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Record Shift Entry
              </h2>
              <form onSubmit={handleCreateShift} className="mt-3 grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-2">
                  <label htmlFor="shift-station" className="block text-xs text-muted">
                    Station
                  </label>
                  <input
                    id="shift-station"
                    required
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="mt-1 w-full rounded border border-line bg-canvas px-2.5 py-1.5 font-mono text-xs text-ink"
                  />
                </div>
                <div className="sm:col-span-6">
                  <label htmlFor="shift-summary" className="block text-xs text-muted">
                    Operational Note
                  </label>
                  <input
                    id="shift-summary"
                    required
                    minLength={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Opening float verified / supplier COD settlement"
                    className="mt-1 w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink placeholder:text-muted"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="shift-delta" className="block text-xs text-muted">
                    Cash Delta (USD)
                  </label>
                  <input
                    id="shift-delta"
                    inputMode="decimal"
                    required
                    value={cashDeltaUsd}
                    onChange={(e) => setCashDeltaUsd(e.target.value)}
                    className="tabular-nums mt-1 w-full rounded border border-line bg-canvas px-2.5 py-1.5 font-mono text-xs text-ink"
                  />
                </div>
                <div className="flex items-end sm:col-span-2">
                  <button
                    type="submit"
                    disabled={shiftBusy}
                    className="w-full rounded bg-accent px-3 py-1.5 text-xs font-semibold text-canvas hover:opacity-90 disabled:opacity-50"
                  >
                    {shiftBusy ? 'Saving...' : 'Log Entry'}
                  </button>
                </div>
              </form>
              {shiftError && (
                <p role="alert" className="mt-2 text-xs text-danger">
                  {shiftError}
                </p>
              )}
            </section>

            <section className="overflow-x-auto rounded border border-line bg-surface">
              <div className="border-b border-line px-4 py-3">
                <h2 className="tabular-nums text-xs font-semibold uppercase tracking-wider text-muted">
                  Recent Shift Ledger ({shifts.length})
                </h2>
              </div>
              {shifts.length === 0 ? (
                <p className="px-4 py-6 text-xs text-muted">No shift entries recorded yet.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Timestamp (UTC)</th>
                      <th className="px-4 py-2.5 font-medium">Station</th>
                      <th className="px-4 py-2.5 font-medium">Summary</th>
                      <th className="px-4 py-2.5 font-medium">Operator</th>
                      <th className="px-4 py-2.5 text-right font-medium">Cash Delta</th>
                      <th className="px-4 py-2.5 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shifts.map((s) => {
                      const usd = s.cashDeltaCents / 100;
                      return (
                        <tr key={s.id}>
                          <td className="tabular-nums px-4 py-2.5 font-mono text-muted">
                            {s.createdAt.slice(0, 19).replace('T', ' ')}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-ink">{s.station}</td>
                          <td className="px-4 py-2.5 text-ink">{s.summary}</td>
                          <td className="px-4 py-2.5 font-mono text-muted">{s.authorEmail}</td>
                          <td
                            className={`tabular-nums px-4 py-2.5 text-right font-mono ${
                              usd < 0 ? 'text-warn' : 'text-ink'
                            }`}
                          >
                            {usd >= 0 ? `+$${usd.toFixed(2)}` : `-$${Math.abs(usd).toFixed(2)}`}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {s.status === 'VERIFIED' ? (
                              <span className="font-mono text-ok">VERIFIED</span>
                            ) : canVerifyShift ? (
                              <button
                                type="button"
                                onClick={() => handleVerifyShift(s.id)}
                                className="rounded border border-line px-2.5 py-0.5 font-mono text-xs text-ink hover:border-accent"
                              >
                                Verify
                              </button>
                            ) : (
                              <span className="font-mono text-warn">OPEN</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
          <section className="overflow-x-auto rounded border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="tabular-nums text-xs font-semibold uppercase tracking-wider text-muted">
                Security &amp; Operations Audit ({filteredAudits.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="audit-action" className="sr-only">
                  Filter by action
                </label>
                <select
                  id="audit-action"
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="rounded border border-line bg-canvas px-2.5 py-1 font-mono text-xs text-ink"
                >
                  {auditActions.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
                <label htmlFor="audit-search" className="sr-only">
                  Search audit events
                </label>
                <input
                  id="audit-search"
                  type="search"
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  placeholder="Filter actor, target, detail..."
                  className="w-56 rounded border border-line bg-canvas px-2.5 py-1 text-xs text-ink placeholder:text-muted"
                />
              </div>
            </div>

            {filteredAudits.length === 0 ? (
              <p className="px-4 py-6 text-xs text-muted">
                No audit events match the active filter.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Timestamp (UTC)</th>
                    <th className="px-4 py-2.5 font-medium">Action</th>
                    <th className="px-4 py-2.5 font-medium">Actor</th>
                    <th className="px-4 py-2.5 font-medium">Target</th>
                    <th className="px-4 py-2.5 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredAudits.map((a) => {
                    const isAlert =
                      a.action === 'ACCESS_DENIED_403' ||
                      a.action === 'AUTH_PIN_LOCKED' ||
                      a.action === 'SESSION_REVOKED';
                    const isWarn =
                      a.action === 'AUTH_PIN_FAILED' || a.action === 'AUTH_LOGIN_FAILED';
                    return (
                      <tr key={a.id}>
                        <td className="tabular-nums whitespace-nowrap px-4 py-2.5 font-mono text-muted">
                          {a.createdAt.slice(0, 19).replace('T', ' ')}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-2.5 font-mono font-medium ${
                            isAlert ? 'text-danger' : isWarn ? 'text-warn' : 'text-ink'
                          }`}
                        >
                          {a.action}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted">{a.actorEmail}</td>
                        <td className="tabular-nums px-4 py-2.5 font-mono text-ink">{a.target}</td>
                        <td className="px-4 py-2.5 text-muted">{a.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
