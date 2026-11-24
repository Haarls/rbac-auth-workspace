'use client';

import type { RoleName } from '@/lib/permissions';
import { CARD_CLS, fmtUtc, TD_CLS, TH_CLS } from '@/lib/ui';

export interface ActiveSessionRow {
  id: string;
  userEmail: string;
  userRole: RoleName;
  method: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

const SESSION_HEADERS = [
  { label: 'Session', align: '' },
  { label: 'Operator', align: '' },
  { label: 'Method', align: '' },
  { label: 'Issued (UTC)', align: '' },
  { label: 'Action', align: 'text-right' },
] as const;

export function SessionsTable({
  sessions,
  busyId,
  onRevoke,
}: {
  sessions: ActiveSessionRow[];
  busyId: string | null;
  onRevoke: (sessionId: string) => void;
}) {
  return (
    <section className={`${CARD_CLS} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">Active sessions</h2>
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
                {SESSION_HEADERS.map((h) => (
                  <th key={h.label} className={`${TH_CLS} ${h.align}`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {sessions.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className={`${TD_CLS} tabular-nums font-mono text-zinc-200`}>
                    <span>{s.id.slice(0, 12)}</span>
                    {s.isCurrent && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4ECDC4]" />
                        <span>current</span>
                      </span>
                    )}
                  </td>
                  <td className={TD_CLS}>
                    <span className="font-mono text-zinc-300">{s.userEmail}</span>
                    <span className="ml-2 font-mono text-[11px] text-zinc-500">{s.userRole}</span>
                  </td>
                  <td className={`${TD_CLS} font-mono text-zinc-500`}>{s.method}</td>
                  <td className={`${TD_CLS} tabular-nums font-mono text-zinc-500`}>
                    {fmtUtc(s.createdAt)}
                  </td>
                  <td className={`${TD_CLS} text-right`}>
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => onRevoke(s.id)}
                      className="h-7 rounded-md border border-red-500/25 bg-red-500/[0.06] px-2.5 text-xs font-medium text-red-400 hover:border-red-500/40 hover:bg-red-500/[0.12] disabled:opacity-40"
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
  );
}
