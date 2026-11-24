'use client';

import { KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROLE_DOT, type RoleName } from '@/lib/permissions';
import { apiJson, CARD_CLS, fmtUtc, TD_CLS, TH_CLS, type RequestState } from '@/lib/ui';
import { CustomSelect } from './custom-select';
import { ProvisionForm, ROLE_OPTIONS } from './provision-form';
import { SessionsTable, type ActiveSessionRow } from './sessions-table';

export type { ActiveSessionRow };

export interface TeamMemberRow {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  hasPin: boolean;
  pinLocked: boolean;
  createdAt: string;
}

interface TeamPanelProps {
  canManage: boolean;
  canRevokeSessions: boolean;
  members: TeamMemberRow[];
  sessions: ActiveSessionRow[];
}

export function TeamPanel({ canManage, canRevokeSessions, members, sessions }: TeamPanelProps) {
  const router = useRouter();
  const [pinTarget, setPinTarget] = useState<string | null>(null);
  const [pinDraft, setPinDraft] = useState('');
  const [req, setReq] = useState<RequestState>({ status: 'idle' });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function mutate(key: string, url: string, method: 'POST' | 'PATCH', body: unknown, okMsg: string, onOk?: () => void) {
    setBusyId(key);
    setReq({ status: 'loading' });
    const res = await apiJson(url, method, body);
    setBusyId(null);
    if (!res.ok) return setReq({ status: 'error', message: res.error });
    onOk?.();
    setReq({ status: 'ok', message: okMsg });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {(req.status === 'ok' || req.status === 'error') && (
        <div role="status" className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${req.status === 'ok' ? 'border-white/[0.10] bg-[#111113] text-zinc-200' : 'border-red-500/25 bg-red-500/[0.06] text-red-400'}`}>
          {req.message}
        </div>
      )}

      {canManage && (
        <ProvisionForm
          busy={busyId === 'create'}
          onValidationError={(message) => setReq({ status: 'error', message })}
          onSubmitOperator={(payload, resetForm) => void mutate('create', '/api/users', 'POST', payload, 'Operator provisioned.', resetForm)}
        />
      )}

      <section className={`${CARD_CLS} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">Team directory</h2>
            <p className="mt-0.5 text-[13px] text-zinc-400">Operators, assigned RBAC roles, and station passkey PIN status.</p>
          </div>
          <span className="tabular-nums font-mono text-xs text-zinc-500">{members.length} members</span>
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
                const pinState = m.pinLocked
                  ? { label: 'Locked', cls: 'text-red-400', dot: 'bg-red-400' }
                  : m.hasPin
                    ? { label: 'Configured', cls: 'text-zinc-300', dot: 'bg-[#4ECDC4]' }
                    : { label: 'Unset', cls: 'text-zinc-500', dot: '' };

                return (
                  <tr key={m.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className={TD_CLS}>
                      <div className="text-[13px] font-medium text-zinc-100">{m.name}</div>
                      <div className="mt-0.5 font-mono text-xs text-zinc-500">{m.email}</div>
                    </td>
                    <td className={TD_CLS}>
                      {canManage ? (
                        <CustomSelect
                          ariaLabel={`Role for ${m.email}`} value={m.role} options={ROLE_OPTIONS} disabled={busyId === m.id}
                          className="h-8 min-w-[144px] font-mono"
                          onChange={(r) => void mutate(m.id, `/api/users/${m.id}`, 'PATCH', { role: r }, `Updated ${m.email} role to ${r}.`)}
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                          <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[m.role]}`} />
                          <span>{m.role}</span>
                        </span>
                      )}
                    </td>
                    <td className={`${TD_CLS} tabular-nums`}>
                      <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${pinState.cls}`}>
                        {pinState.dot && <span className={`h-1.5 w-1.5 rounded-full ${pinState.dot}`} />}
                        <span>{pinState.label}</span>
                      </span>
                    </td>
                    <td className={`${TD_CLS} tabular-nums font-mono text-zinc-500`}>{fmtUtc(m.createdAt, 16)}</td>
                    {canManage && (
                      <td className={`${TD_CLS} text-right`}>
                        {pinTarget === m.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              aria-label={`New PIN for ${m.email}`} inputMode="numeric" maxLength={4} value={pinDraft}
                              onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4 digits"
                              className="tabular-nums h-8 w-20 rounded-md border border-white/[0.12] bg-[#0C0C0E] px-2.5 text-center font-mono text-xs text-zinc-100 focus:border-white/30 focus:outline-none"
                            />
                            <button
                              type="button" disabled={pinDraft.length < 4 || busyId === m.id}
                              onClick={() =>
                                void mutate(m.id, `/api/users/${m.id}`, 'PATCH', { pin: pinDraft }, 'Operator PIN rotated.', () => {
                                  setPinTarget(null);
                                  setPinDraft('');
                                })
                              }
                              className="h-8 rounded-md bg-zinc-100 px-2.5 text-xs font-medium text-zinc-950 hover:bg-white disabled:opacity-40"
                            >
                              Save
                            </button>
                            <button type="button" onClick={() => setPinTarget(null)} className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-200">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPinTarget(m.id);
                              setPinDraft('');
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
          sessions={sessions} busyId={busyId}
          onRevoke={(sid) => void mutate(sid, `/api/sessions/${sid}/revoke`, 'POST', undefined, 'Session revoked immediately.')}
        />
      )}
    </div>
  );
}
