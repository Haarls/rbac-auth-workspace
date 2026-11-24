'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { RoleName } from '@/lib/permissions';

export interface TeamMemberRow {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  hasPin: boolean;
  pinLockedUntil: string | null;
  createdAt: string;
}

export interface ActiveSessionRow {
  id: string;
  userEmail: string;
  userRole: RoleName;
  method: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface TeamPanelProps {
  canManage: boolean;
  canRevokeSessions: boolean;
  members: TeamMemberRow[];
  sessions: ActiveSessionRow[];
}

export function TeamPanel({ canManage, canRevokeSessions, members, sessions }: TeamPanelProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleName>('STAFF');
  const [pin, setPin] = useState('');
  const [pinEditTarget, setPinEditTarget] = useState<string | null>(null);
  const [pinResetValue, setPinResetValue] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setBusyId('create');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          ...(pin ? { pin } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ kind: 'err', text: data.error ?? `Failed (HTTP ${res.status}).` });
        return;
      }
      setName('');
      setEmail('');
      setPassword('');
      setPin('');
      setRole('STAFF');
      setFeedback({ kind: 'ok', text: 'Operator created.' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(userId: string, nextRole: RoleName) {
    setFeedback(null);
    setBusyId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ kind: 'err', text: data.error ?? `Failed (HTTP ${res.status}).` });
        return;
      }
      setFeedback({ kind: 'ok', text: `Updated role to ${nextRole}.` });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handlePinReset(userId: string) {
    setFeedback(null);
    setBusyId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinResetValue }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ kind: 'err', text: data.error ?? `Failed (HTTP ${res.status}).` });
        return;
      }
      setPinEditTarget(null);
      setPinResetValue('');
      setFeedback({ kind: 'ok', text: 'Operator PIN updated.' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setFeedback(null);
    setBusyId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/revoke`, { method: 'POST' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ kind: 'err', text: data.error ?? `Failed (HTTP ${res.status}).` });
        return;
      }
      setFeedback({ kind: 'ok', text: 'Session revoked immediately.' });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="status"
          className={`rounded border bg-surface px-3 py-2 text-xs ${
            feedback.kind === 'ok'
              ? 'border-ok/40 text-ok'
              : 'border-danger/40 text-danger'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {canManage && (
        <section className="rounded border border-line bg-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Provision Operator
          </h2>
          <form onSubmit={handleCreateUser} className="mt-3 grid gap-3 sm:grid-cols-5">
            <div>
              <label htmlFor="new-name" className="block text-xs text-muted">
                Name
              </label>
              <input
                id="new-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink"
                placeholder="Ana Torres"
              />
            </div>
            <div>
              <label htmlFor="new-email" className="block text-xs text-muted">
                Email
              </label>
              <input
                id="new-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink"
                placeholder="ana@ops.dev"
              />
            </div>
            <div>
              <label htmlFor="new-pass" className="block text-xs text-muted">
                Password (8+ chars)
              </label>
              <input
                id="new-pass"
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink"
              />
            </div>
            <div>
              <label htmlFor="new-pin" className="block text-xs text-muted">
                PIN (optional)
              </label>
              <input
                id="new-pin"
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="tabular-nums mt-1 w-full rounded border border-line bg-canvas px-2.5 py-1.5 font-mono text-xs text-ink"
                placeholder="4-6 digits"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="new-role" className="block text-xs text-muted">
                  Role
                </label>
                <select
                  id="new-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleName)}
                  className="mt-1 w-full rounded border border-line bg-canvas px-2 py-1.5 text-xs text-ink"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="OWNER">OWNER</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={busyId === 'create'}
                className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-canvas hover:opacity-90 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-x-auto rounded border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Team Directory ({members.length})
          </h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Operator</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">PIN Status</th>
              <th className="px-4 py-2.5 font-medium">Created (UTC)</th>
              {canManage && <th className="px-4 py-2.5 text-right font-medium">PIN Control</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => {
              const locked =
                m.pinLockedUntil !== null && Date.parse(m.pinLockedUntil) > Date.now();
              return (
                <tr key={m.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-ink">{m.name}</div>
                    <div className="font-mono text-muted">{m.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    {canManage ? (
                      <select
                        aria-label={`Role for ${m.email}`}
                        value={m.role}
                        disabled={busyId === m.id}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as RoleName)}
                        className="rounded border border-line bg-canvas px-2 py-1 font-mono text-xs text-ink"
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="STAFF">STAFF</option>
                      </select>
                    ) : (
                      <span className="font-mono text-ink">{m.role}</span>
                    )}
                  </td>
                  <td className="tabular-nums px-4 py-2.5">
                    {locked ? (
                      <span className="text-danger">Locked</span>
                    ) : m.hasPin ? (
                      <span className="text-ok">Assigned</span>
                    ) : (
                      <span className="text-muted">Unset</span>
                    )}
                  </td>
                  <td className="tabular-nums px-4 py-2.5 font-mono text-muted">
                    {m.createdAt.slice(0, 16).replace('T', ' ')}
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-right">
                      {pinEditTarget === m.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            aria-label={`New PIN for ${m.email}`}
                            inputMode="numeric"
                            maxLength={6}
                            value={pinResetValue}
                            onChange={(e) =>
                              setPinResetValue(e.target.value.replace(/\D/g, '').slice(0, 6))
                            }
                            placeholder="4-6 digits"
                            className="tabular-nums w-24 rounded border border-line bg-canvas px-2 py-1 font-mono text-xs text-ink"
                          />
                          <button
                            type="button"
                            disabled={pinResetValue.length < 4 || busyId === m.id}
                            onClick={() => handlePinReset(m.id)}
                            className="rounded bg-accent px-2 py-1 text-xs font-semibold text-canvas disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPinEditTarget(null);
                              setPinResetValue('');
                            }}
                            className="px-1.5 py-1 text-xs text-muted hover:text-ink"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPinEditTarget(m.id);
                            setPinResetValue('');
                          }}
                          className="rounded border border-line px-2.5 py-1 text-xs text-muted hover:text-ink"
                        >
                          {m.hasPin ? 'Rotate PIN' : 'Set PIN'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {canRevokeSessions && (
        <section className="overflow-x-auto rounded border border-line bg-surface">
          <div className="border-b border-line px-4 py-3">
            <h2 className="tabular-nums text-xs font-semibold uppercase tracking-wider text-muted">
              Active Sessions ({sessions.length})
            </h2>
          </div>
          {sessions.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted">No active sessions found.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Session ID</th>
                  <th className="px-4 py-2.5 font-medium">Operator</th>
                  <th className="px-4 py-2.5 font-medium">Auth Method</th>
                  <th className="px-4 py-2.5 font-medium">Issued (UTC)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="tabular-nums px-4 py-2.5 font-mono text-ink">
                      {s.id.slice(0, 12)}
                      {s.isCurrent && <span className="ml-2 text-accent">(current)</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted">
                      {s.userEmail} · {s.userRole}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted">{s.method}</td>
                    <td className="tabular-nums px-4 py-2.5 font-mono text-muted">
                      {s.createdAt.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => handleRevokeSession(s.id)}
                        className="rounded border border-danger/40 px-2.5 py-1 text-xs text-danger hover:bg-danger/10 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
