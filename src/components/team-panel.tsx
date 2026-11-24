'use client';

import { KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { ROLE_DOT, type RoleName } from '@/lib/permissions';
import {
  BTN_PRIMARY,
  CARD_CLS,
  fmtUtc,
  INPUT_CLS,
  TD_CLS,
  TH_CLS,
  type RequestState,
} from '@/lib/ui';
import { CustomSelect, type SelectOption } from './custom-select';
import { SessionsTable, type ActiveSessionRow } from './sessions-table';

export type { ActiveSessionRow };

export interface TeamMemberRow {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  hasPin: boolean;
  pinLockedUntil: string | null;
  createdAt: string;
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

const NewOperatorSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  pin: z
    .string()
    .regex(/^\d{4}$/)
    .optional()
    .or(z.literal('')),
});

const PROVISION_FIELDS = [
  {
    id: 'new-name',
    name: 'name',
    label: 'Name',
    type: 'text',
    placeholder: 'Ana Torres',
    span: 'lg:col-span-2',
    required: true,
  },
  {
    id: 'new-email',
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'ana@ops.dev',
    span: 'lg:col-span-3',
    required: true,
  },
  {
    id: 'new-pass',
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: '8+ chars',
    span: 'lg:col-span-2',
    required: true,
    minLength: 8,
  },
] as const;

export function TeamPanel({ canManage, canRevokeSessions, members, sessions }: TeamPanelProps) {
  const router = useRouter();
  const [newRole, setNewRole] = useState<RoleName>('STAFF');
  const [pinEditTarget, setPinEditTarget] = useState<string | null>(null);
  const [pinResetValue, setPinResetValue] = useState('');
  const [req, setReq] = useState<RequestState>({ status: 'idle' });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function mutate(
    key: string,
    url: string,
    init: RequestInit,
    okMsg: string,
    onOk?: () => void,
  ) {
    setBusyId(key);
    setReq({ status: 'loading' });
    try {
      const res = await fetch(url, init);
      const data = (await res.json()) as { error?: string };
      if (!res.ok)
        return setReq({ status: 'error', message: data.error ?? `Failed (HTTP ${res.status}).` });
      onOk?.();
      setReq({ status: 'ok', message: okMsg });
      router.refresh();
    } catch {
      setReq({ status: 'error', message: 'Network error while updating workspace.' });
    } finally {
      setBusyId(null);
    }
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = NewOperatorSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      return setReq({
        status: 'error',
        message: 'Valid name, email, 8+ char password, and optional 4-digit PIN required.',
      });
    }
    const { pin, ...rest } = parsed.data;
    void mutate(
      'create',
      '/api/users',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, role: newRole, ...(pin ? { pin } : {}) }),
      },
      'Operator provisioned.',
      () => {
        form.reset();
        setNewRole('STAFF');
      },
    );
  }

  return (
    <div className="space-y-6">
      {(req.status === 'ok' || req.status === 'error') && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${req.status === 'ok' ? 'border-white/[0.10] bg-[#111113] text-zinc-200' : 'border-red-500/25 bg-red-500/[0.06] text-red-400'}`}
        >
          {req.message}
        </div>
      )}

      {canManage && (
        <section className={`${CARD_CLS} p-5 sm:p-6`}>
          <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">
            Provision operator
          </h2>
          <p className="mt-0.5 text-[13px] text-zinc-400">
            Create workspace credentials and optionally assign a 4-digit station PIN.
          </p>
          <form onSubmit={handleCreate} className="mt-5 grid gap-3.5 lg:grid-cols-12">
            {PROVISION_FIELDS.map((f) => (
              <div key={f.id} className={f.span}>
                <label htmlFor={f.id} className="block text-xs font-medium text-zinc-400">
                  {f.label}
                </label>
                <input
                  id={f.id}
                  name={f.name}
                  type={f.type}
                  required={f.required}
                  minLength={'minLength' in f ? f.minLength : undefined}
                  placeholder={f.placeholder}
                  className={INPUT_CLS}
                />
              </div>
            ))}
            <div className="lg:col-span-2">
              <label htmlFor="new-pin" className="block text-xs font-medium text-zinc-400">
                Station PIN
              </label>
              <input
                id="new-pin"
                name="pin"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
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
                    value={newRole}
                    options={ROLE_OPTIONS}
                    onChange={setNewRole}
                    mono
                    className="w-full"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busyId === 'create'}
                className={`${BTN_PRIMARY} h-9 shrink-0`}
              >
                Create
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={`${CARD_CLS} overflow-hidden`}>
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
                <th className={TH_CLS}>Operator</th>
                <th className={TH_CLS}>Role</th>
                <th className={TH_CLS}>PIN</th>
                <th className={TH_CLS}>Created</th>
                {canManage && <th className={`${TH_CLS} text-right`}>Controls</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {members.map((m) => {
                const locked =
                  m.pinLockedUntil !== null && Date.parse(m.pinLockedUntil) > Date.now();
                let pinColorCls = 'text-zinc-500';
                let pinLabel = 'Unset';
                if (locked) {
                  pinColorCls = 'text-red-400';
                  pinLabel = 'Locked';
                } else if (m.hasPin) {
                  pinColorCls = 'text-zinc-300';
                  pinLabel = 'Configured';
                }

                return (
                  <tr key={m.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className={TD_CLS}>
                      <div className="text-[13px] font-medium text-zinc-100">{m.name}</div>
                      <div className="mt-0.5 font-mono text-xs text-zinc-500">{m.email}</div>
                    </td>
                    <td className={TD_CLS}>
                      {canManage ? (
                        <CustomSelect
                          ariaLabel={`Role for ${m.email}`}
                          value={m.role}
                          options={ROLE_OPTIONS}
                          disabled={busyId === m.id}
                          mono
                          size="sm"
                          className="min-w-[144px]"
                          onChange={(r) =>
                            void mutate(
                              m.id,
                              `/api/users/${m.id}`,
                              {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ role: r }),
                              },
                              `Updated ${m.email} role to ${r}.`,
                            )
                          }
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                          <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[m.role]}`} />
                          <span>{m.role}</span>
                        </span>
                      )}
                    </td>
                    <td className={`${TD_CLS} tabular-nums`}>
                      <span
                        className={`inline-flex items-center gap-1.5 font-mono text-xs ${pinColorCls}`}
                      >
                        {(locked || m.hasPin) && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${locked ? 'bg-red-400' : 'bg-[#4ECDC4]'}`}
                          />
                        )}
                        <span>{pinLabel}</span>
                      </span>
                    </td>
                    <td className={`${TD_CLS} tabular-nums font-mono text-zinc-500`}>
                      {fmtUtc(m.createdAt, 16)}
                    </td>
                    {canManage && (
                      <td className={`${TD_CLS} text-right`}>
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
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#0C0C0E] px-2.5 text-xs font-medium text-zinc-300 hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-zinc-100"
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
        <SessionsTable
          sessions={sessions}
          busyId={busyId}
          onRevoke={(sid) =>
            void mutate(
              sid,
              `/api/sessions/${sid}/revoke`,
              { method: 'POST' },
              'Session revoked immediately.',
            )
          }
        />
      )}
    </div>
  );
}
