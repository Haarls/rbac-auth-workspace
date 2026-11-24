'use client';

import { KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROLE_DOT, type RoleName } from '@/lib/permissions';
import { CustomSelect, type SelectOption } from './custom-select';

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

const ROLE_OPTIONS: readonly SelectOption<RoleName>[] = [
  { value: 'OWNER', label: 'OWNER', dotClass: ROLE_DOT.OWNER },
  { value: 'MANAGER', label: 'MANAGER', dotClass: ROLE_DOT.MANAGER },
  { value: 'STAFF', label: 'STAFF', dotClass: ROLE_DOT.STAFF },
];

const INPUT_CLS =
  'mt-1.5 h-9 w-full rounded-lg border border-white/[0.09] bg-[#0C0C0E] px-3 text-xs text-zinc-100 transition-all placeholder:text-zinc-600 hover:border-white/[0.16] focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/[0.06]';

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
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${
            feedback.kind === 'ok'
              ? 'border-white/[0.10] bg-[#111113] text-zinc-200'
              : 'border-red-500/25 bg-red-500/[0.06] text-red-400'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {canManage && (
        <section className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 shadow-card sm:p-6">
          <div>
            <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">
              Provision operator
            </h2>
            <p className="mt-0.5 text-[13px] text-zinc-400">
              Create workspace credentials and optionally assign a 4-digit station PIN.
            </p>
          </div>

          <form onSubmit={handleCreateUser} className="mt-5 grid gap-3.5 lg:grid-cols-12">
            <div className="lg:col-span-2">
              <label htmlFor="new-name" className="block text-xs font-medium text-zinc-400">
                Name
              </label>
              <input
                id="new-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLS}
                placeholder="Ana Torres"
              />
            </div>
            <div className="lg:col-span-3">
              <label htmlFor="new-email" className="block text-xs font-medium text-zinc-400">
                Email
              </label>
              <input
                id="new-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLS}
                placeholder="ana@ops.dev"
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="new-pass" className="block text-xs font-medium text-zinc-400">
                Password
              </label>
              <input
                id="new-pass"
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT_CLS}
                placeholder="8+ chars"
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="new-pin" className="block text-xs font-medium text-zinc-400">
                Station PIN
              </label>
              <input
                id="new-pin"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={`${INPUT_CLS} tabular-nums font-mono`}
                placeholder="4 digits"
              />
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end lg:col-span-3">
              <div className="flex-1">
                <label htmlFor="new-role" className="block text-xs font-medium text-zinc-400">
                  Role
                </label>
                <div className="mt-1.5">
                  <CustomSelect
                    id="new-role"
                    ariaLabel="Role for new operator"
                    value={role}
                    options={ROLE_OPTIONS}
                    onChange={setRole}
                    mono
                    className="w-full"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busyId === 'create'}
                className="h-9 shrink-0 rounded-lg bg-zinc-100 px-4 text-xs font-medium text-zinc-950 shadow-sm transition-all hover:bg-white active:scale-[0.99] disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">
              Team directory
            </h2>
            <p className="mt-0.5 text-[13px] text-zinc-400">
              Operators, assigned RBAC roles, and station passkey PIN status.
            </p>
          </div>
          <span className="tabular-nums font-mono text-xs text-zinc-500">
            {members.length} members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] text-[11px] font-medium text-zinc-500">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Operator</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Role</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">PIN</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Created</th>
                {canManage && (
                  <th className="whitespace-nowrap px-5 py-3 text-right font-medium sm:px-6">
                    Controls
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {members.map((m) => {
                const locked = m.pinLockedUntil !== null && Date.parse(m.pinLockedUntil) > Date.now();
                return (
                  <tr key={m.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-5 py-3.5 sm:px-6">
                      <div className="text-[13px] font-medium text-zinc-100">{m.name}</div>
                      <div className="mt-0.5 font-mono text-xs text-zinc-500">{m.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 sm:px-6">
                      {canManage ? (
                        <CustomSelect
                          ariaLabel={`Role for ${m.email}`}
                          value={m.role}
                          options={ROLE_OPTIONS}
                          disabled={busyId === m.id}
                          mono
                          size="sm"
                          onChange={(nextRole) => {
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
                          className="min-w-[144px]"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                          <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[m.role]}`} />
                          <span>{m.role}</span>
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums whitespace-nowrap px-5 py-3.5 sm:px-6">
                      {locked ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          <span>Locked</span>
                        </span>
                      ) : m.hasPin ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#4ECDC4]" />
                          <span>Configured</span>
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-zinc-500">Unset</span>
                      )}
                    </td>
                    <td className="tabular-nums whitespace-nowrap px-5 py-3.5 font-mono text-zinc-500 sm:px-6">
                      {m.createdAt.slice(0, 16).replace('T', ' ')}
                    </td>
                    {canManage && (
                      <td className="whitespace-nowrap px-5 py-3.5 text-right sm:px-6">
                        {pinEditTarget === m.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              aria-label={`New PIN for ${m.email}`}
                              inputMode="numeric"
                              maxLength={4}
                              value={pinResetValue}
                              onChange={(e) =>
                                setPinResetValue(e.target.value.replace(/\D/g, '').slice(0, 4))
                              }
                              placeholder="4 digits"
                              className="tabular-nums h-8 w-20 rounded-md border border-white/[0.12] bg-[#0C0C0E] px-2.5 text-center font-mono text-xs text-zinc-100 focus:border-white/30 focus:outline-none"
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
                              className="h-8 rounded-md bg-zinc-100 px-2.5 text-xs font-medium text-zinc-950 hover:bg-white disabled:opacity-40"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setPinEditTarget(null)}
                              className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-200"
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
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#0C0C0E] px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-zinc-100"
                          >
                            <KeyRound className="h-3 w-3 text-zinc-500" aria-hidden="true" />
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
        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">
                Active sessions
              </h2>
              <p className="mt-0.5 text-[13px] text-zinc-400">
                Revoking a session invalidates its HttpOnly token on the next request.
              </p>
            </div>
            <span className="tabular-nums font-mono text-xs text-zinc-500">
              {sessions.length} active
            </span>
          </div>

          {sessions.length === 0 ? (
            <p className="px-6 py-8 text-xs text-zinc-500">No active sessions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-[11px] font-medium text-zinc-500">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Session</th>
                    <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Operator</th>
                    <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">Method</th>
                    <th className="whitespace-nowrap px-5 py-3 font-medium sm:px-6">
                      Issued (UTC)
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-right font-medium sm:px-6">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {sessions.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="tabular-nums whitespace-nowrap px-5 py-3.5 font-mono text-zinc-200 sm:px-6">
                        <span>{s.id.slice(0, 12)}</span>
                        {s.isCurrent && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4ECDC4]" />
                            <span>current</span>
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 sm:px-6">
                        <span className="font-mono text-zinc-300">{s.userEmail}</span>
                        <span className="ml-2 font-mono text-[11px] text-zinc-500">
                          {s.userRole}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-zinc-500 sm:px-6">
                        {s.method}
                      </td>
                      <td className="tabular-nums whitespace-nowrap px-5 py-3.5 font-mono text-zinc-500 sm:px-6">
                        {s.createdAt.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right sm:px-6">
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
                          className="h-7 rounded-md border border-red-500/25 bg-red-500/[0.06] px-2.5 text-xs font-medium text-red-400 transition-colors hover:border-red-500/40 hover:bg-red-500/[0.12] disabled:opacity-40"
                        >
                          Revoke
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
