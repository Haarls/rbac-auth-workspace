'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CARD_CLS, fmtUtc, TD_CLS, TH_CLS } from '@/lib/ui';
import { CustomSelect } from './custom-select';

export interface AuditEntryRow {
  id: string;
  actorEmail: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

const ALERT_ACTIONS = new Set(['ACCESS_DENIED_403', 'AUTH_PIN_LOCKED', 'SESSION_REVOKED']);
const WARN_ACTIONS = new Set(['AUTH_PIN_FAILED', 'AUTH_LOGIN_FAILED']);
const AUDIT_HEADERS = ['Timestamp (UTC)', 'Event', 'Actor', 'Target', 'Detail'] as const;

export function AuditPanel({ audits }: { audits: AuditEntryRow[] }) {
  const [actionFilter, setActionFilter] = useState('ALL');
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const unique = Array.from(new Set(audits.map((a) => a.action))).sort();
    return [
      { value: 'ALL', label: 'All events' },
      ...unique.map((act) => ({
        value: act,
        label: act,
        dotClass: ALERT_ACTIONS.has(act) ? 'bg-red-400' : WARN_ACTIONS.has(act) ? 'bg-amber-400' : 'bg-zinc-500',
      })),
    ];
  }, [audits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return audits.filter((a) => {
      if (actionFilter !== 'ALL' && a.action !== actionFilter) return false;
      return !q || [a.actorEmail, a.target, a.detail, a.action].some((v) => v.toLowerCase().includes(q));
    });
  }, [audits, actionFilter, query]);

  return (
    <section className={`${CARD_CLS} overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">Security &amp; operations audit</h2>
          <p className="mt-0.5 text-[13px] text-zinc-400">
            Append-only trail of logins, PIN unlocks, role updates, and 403 denials.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <CustomSelect
            id="audit-action" ariaLabel="Filter audit log by event type"
            value={actionFilter} options={options} onChange={setActionFilter} mono
            className="w-full sm:w-auto sm:min-w-[195px]"
          />
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <label htmlFor="audit-search" className="sr-only">Search audit events</label>
            <input
              id="audit-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter actor, target, detail..."
              className="h-9 w-full rounded-lg border border-white/[0.09] bg-[#0C0C0E] pl-8 pr-3 text-xs text-zinc-100 transition-all placeholder:text-zinc-600 hover:border-white/[0.16] focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/[0.06]"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-6 py-8 text-xs text-zinc-500">No audit events match the active filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] text-[11px] font-medium text-zinc-500">
              <tr>{AUDIT_HEADERS.map((h) => <th key={h} className={TH_CLS}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((a) => {
                const badgeCls = ALERT_ACTIONS.has(a.action)
                  ? 'border-red-500/25 bg-red-500/[0.06] text-red-400'
                  : WARN_ACTIONS.has(a.action)
                    ? 'border-amber-500/25 bg-amber-500/[0.06] text-amber-400'
                    : 'border-white/[0.08] bg-white/[0.03] text-zinc-300';
                return (
                  <tr key={a.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className={`${TD_CLS} tabular-nums font-mono text-zinc-500`}>{fmtUtc(a.createdAt)}</td>
                    <td className={TD_CLS}>
                      <span className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[11px] ${badgeCls}`}>{a.action}</span>
                    </td>
                    <td className={`${TD_CLS} font-mono text-zinc-400`}>{a.actorEmail}</td>
                    <td className={`${TD_CLS} tabular-nums font-mono text-zinc-200`}>{a.target}</td>
                    <td className={`${TD_CLS} text-zinc-400`}>{a.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
