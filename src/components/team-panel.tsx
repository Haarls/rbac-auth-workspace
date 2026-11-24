'use client';

import { KeyRound, ShieldOff, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROLE_BADGE, type RoleName } from '@/lib/permissions';

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

const FIELD_CLS =
  'mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-xs text-ink transition-colors placeholder:text-muted';

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

  async function mutate(
    key: string,
    url: string,
    init: RequestInit,
    okMessage: string,
    onSuccess?: () => void,
  ) {
    setFeedback(null);
    setBusyId(key);
    try {
      const res = await fetch(url, init);
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ kind: 'err', text: data.error ?? `Request failed (HTTP ${res.status}).` });
        return;
      }
      onSuccess?.();
      setFeedback({ kind: 'ok', text: okMessage });
      router.refresh();
    } catch {
      setFeedback({ kind: 'err', text: 'Network error while updating workspace.' });
    } finally {
      setBusyId(null);
    }
  }

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    void mutate(
      'create',
      '/api/users',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, ...(pin ? { pin } : {}) }),
      },
      'Operator provisioned.',
      () => {
        setName('');
        setEmail('');
        setPassword('');
        setPin('');
        setRole('STAFF');
      },
    );
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="status"
          className={`rounded-lg border bg-surface px-4 py-3 text-xs font-medium ${
            feedback.kind === 'ok' ? 'border-ok/40 text-ok' : 'border-danger/40 text-danger'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {canManage && (
        <section className="rounded-xl border border-line bg-surface p-6">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-ink">Provision Operator</h2>
          </div>
          <p className="mt-1 text-xs text-muted">
            Create workspace credentials and optionally assign a 4–6 digit station PIN.
          </p>

          <form onSubmit={handleCreateUser} className="mt-5 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-2">
              <label htmlFor="new-name" className="block text-xs font-medium text-muted">
                Full Name
              </label>
              <input
                id="new-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={FIELD_CLS}
                placeholder="Ana Torres"
              />
            </div>
            <div className="lg:col-span-3">
              <label htmlFor="new-email" className="block text-xs font-medium text-muted">
                Operator Email
              </label>
              <input
                id="new-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={FIELD_CLS}
                placeholder="ana@ops.dev"
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="new-pass" className="block text-xs font-medium text-muted">
                Password
              </label>
              <input
                id="new-pass"
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={FIELD_CLS}
                placeholder="8+ chars"
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="new-pin" className="block text-xs font-medium text-muted">
                Station PIN
              </label>
              <input
                id="new-pin"
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${FIELD_CLS} tabular-nums font-mono`}
                placeholder="4–6 digits"
              />
            </div>
            <div className="flex items-end gap-2.5 lg:col-span-3">
              <div className="flex-1">
                <label htmlFor="new-role" className="block text-xs font-medium text-muted">
                  Role
                </label>
                <select
                  id="new-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleName)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink transition-colors"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="OWNER">OWNER</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={busyId === 'create'}
                className="h-10 shrink-0 rounded-lg bg-accent px-4 text-xs font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Team Directory</h2>
            <p className="mt-0.5 text-xs text-muted">
              Active workspace operators, assigned roles, and station PIN status.
            </p>
          </div>
          <span className="tabular-nums rounded-md border border-line bg-canvas px-2.5 py-1 font-mono text-xs text-muted">
            {members.length} operators
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-canvas/40 text-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Operator</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">PIN Status</th>
                <th className="px-6 py-3 font-medium">Created (UTC)</th>
                {canManage && <th className="px-6 py-3 text-right font-medium">PIN Control</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((m) => {
                const locked = m.pinLockedUntil !== null && Date.parse(m.pinLockedUntil) > Date.now();
                return (
                  <tr key={m.id} className="transition-colors hover:bg-canvas/30">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-ink">{m.name}</div>
                      <div className="mt-0.5 font-mono text-xs text-muted">{m.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {canManage ? (
                        <select
                          aria-label={`Role for ${m.email}`}
                          value={m.role}
                          disabled={busyId === m.id}
                          onChange={(e) => {
                            const nextRole = e.target.value as RoleName;
                            void mutate(
                              m.id,
                              `/api/users/${m.id}`,
                              {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ role: nextRole }),
                              },
                              `Updated ${m.email} role to ${nextRole}.`,
                            );
                          }}
                          className="h-8 rounded-md border border-line bg-canvas px-2.5 font-mono text-xs text-ink"
                        >
                          <option value="OWNER">OWNER</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="STAFF">STAFF</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${ROLE_BADGE[m.role]}`}
                        >
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] ${
                          locked
                            ? 'border-danger/40 bg-danger/10 text-danger'
                            : m.hasPin
                              ? 'border-ok/30 bg-ok/10 text-ok'
                              : 'border-line bg-canvas text-muted'
                        }`}
                      >
                        {locked ? 'Locked' : m.hasPin ? 'Assigned' : 'Unset'}
                      </span>
                    </td>
                    <td className="tabular-nums px-6 py-4 font-mono text-muted">
                      {m.createdAt.slice(0, 16).replace('T', ' ')}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        {pinEditTarget === m.id ? (
                          <div className="inline-flex items-center gap-2">
                            <input
                              aria-label={`New PIN for ${m.email}`}
                              inputMode="numeric"
                              maxLength={6}
                              value={pinResetValue}
                              onChange={(e) =>
                                setPinResetValue(e.target.value.replace(/\D/g, '').slice(0, 6))
                              }
                              placeholder="4–6 digits"
                              className="tabular-nums h-8 w-24 rounded-md border border-line bg-canvas px-2.5 font-mono text-xs text-ink"
                            />
                            <button
                              type="button"
                              disabled={pinResetValue.length < 4 || busyId === m.id}
                              onClick={() =>
                                void mutate(
                                  m.id,
                                  `/api/users/${m.id}`,
                                  {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ pin: pinResetValue }),
                                  },
                                  'Operator PIN rotated.',
                                  () => {
                                    setPinEditTarget(null);
                                    setPinResetValue('');
                                  },
                                )
                              }
                              className="h-8 rounded-md bg-accent px-2.5 text-xs font-semibold text-canvas disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setPinEditTarget(null)}
                              className="h-8 px-2 text-xs text-muted hover:text-ink"
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
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-canvas px-3 text-xs font-medium text-muted transition-colors hover:border-accent/60 hover:text-ink"
                          >
                            <KeyRound className="h-3 w-3" aria-hidden="true" />
                            <span>{m.hasPin ? 'Rotate PIN' : 'Set PIN'}</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {canRevokeSessions && (
        <section className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Active Sessions</h2>
              <p className="mt-0.5 text-xs text-muted">
                Revoking a session invalidates its HttpOnly JWT on the next server request.
              </p>
            </div>
            <span className="tabular-nums rounded-md border border-line bg-canvas px-2.5 py-1 font-mono text-xs text-muted">
              {sessions.length} active
            </span>
          </div>

          {sessions.length === 0 ? (
            <p className="px-6 py-8 text-xs text-muted">No active sessions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-canvas/40 text-muted">
                  <tr>
                    <th className="px-6 py-3 font-medium">Session ID</th>
                    <th className="px-6 py-3 font-medium">Operator</th>
                    <th className="px-6 py-3 font-medium">Method</th>
                    <th className="px-6 py-3 font-medium">Issued (UTC)</th>
                    <th className="px-6 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sessions.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-canvas/30">
                      <td className="tabular-nums px-6 py-4 font-mono text-ink">
                        <span>{s.id.slice(0, 12)}</span>
                        {s.isCurrent && (
                          <span className="ml-2 rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                            current
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-ink">{s.userEmail}</span>
                        <span
                          className={`ml-2 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${ROLE_BADGE[s.userRole]}`}
                        >
                          {s.userRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-muted">{s.method}</td>
                      <td className="tabular-nums px-6 py-4 font-mono text-muted">
                        {s.createdAt.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() =>
                            void mutate(
                              s.id,
                              `/api/sessions/${s.id}/revoke`,
                              { method: 'POST' },
                              'Session revoked immediately.',
                            )
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-danger/40 px-3 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                        >
                          <ShieldOff className="h-3 w-3" aria-hidden="true" />
                          <span>Revoke</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
