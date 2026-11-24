'use client';

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { apiJson, BTN_PRIMARY, CARD_CLS, fmtUtc, INPUT_CLS, TD_CLS, TH_CLS, type RequestState } from '../lib/ui';

export interface ShiftEntryRow {
  id: string;
  station: string;
  summary: string;
  cashDeltaCents: number;
  status: string;
  authorEmail: string;
  createdAt: string;
}

const ShiftFormSchema = z.object({
  station: z.string().trim().min(2).max(24),
  summary: z.string().trim().min(4).max(200),
  cashDeltaUsd: z.coerce.number().finite().min(-100_000).max(100_000),
});

const SHIFT_HEADERS = [
  { label: 'Timestamp (UTC)', align: '' },
  { label: 'Station', align: '' },
  { label: 'Summary', align: '' },
  { label: 'Operator', align: '' },
  { label: 'Cash delta', align: 'text-right' },
  { label: 'State', align: 'text-right' },
] as const;

export function ShiftPanel({ shifts, canVerify }: { shifts: ShiftEntryRow[]; canVerify: boolean }) {
  const router = useRouter();
  const [req, setReq] = useState<RequestState>({ status: 'idle' });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = ShiftFormSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setReq({ status: 'error', message: 'Enter station, 4+ char note, and valid USD amount.' });
      return;
    }

    setReq({ status: 'loading' });
    const res = await apiJson('/api/shifts', 'POST', parsed.data);
    if (!res.ok) {
      setReq({ status: 'error', message: res.error });
      return;
    }
    form.reset();
    setReq({ status: 'idle' });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className={`${CARD_CLS} p-5 sm:p-6`}>
        <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">Record shift entry</h2>
        <p className="mt-0.5 text-[13px] text-zinc-400">
          Log register floats, cash variances, or handoff notes into the ledger.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-3.5 sm:grid-cols-12">
          <div className="sm:col-span-2">
            <label htmlFor="shift-station" className="block text-xs font-medium text-zinc-400">
              Station
            </label>
            <input id="shift-station" name="station" required defaultValue="REG-01" className={`${INPUT_CLS} font-mono`} />
          </div>
          <div className="sm:col-span-6">
            <label htmlFor="shift-summary" className="block text-xs font-medium text-zinc-400">
              Operational note
            </label>
            <input
              id="shift-summary"
              name="summary"
              required
              minLength={4}
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
              name="cashDeltaUsd"
              inputMode="decimal"
              required
              defaultValue="0.00"
              className={`${INPUT_CLS} tabular-nums font-mono`}
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <button type="submit" disabled={req.status === 'loading'} className={`${BTN_PRIMARY} h-9 w-full`}>
              {req.status === 'loading' ? 'Saving...' : 'Log entry'}
            </button>
          </div>
        </form>
        {req.status === 'error' && (
          <p role="alert" className="mt-3 text-xs text-red-400">
            {req.message}
          </p>
        )}
      </section>

      <section className={`${CARD_CLS} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">Shift ledger</h2>
            <p className="mt-0.5 text-[13px] text-zinc-400">
              Ordered newest first. Managers and Owners can reconcile open entries.
            </p>
          </div>
          <span className="tabular-nums font-mono text-xs text-zinc-500">{shifts.length} entries</span>
        </div>

        {shifts.length === 0 ? (
          <p className="px-6 py-8 text-xs text-zinc-500">No shift entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-[11px] font-medium text-zinc-500">
                <tr>
                  {SHIFT_HEADERS.map((h) => (
                    <th key={h.label} className={`${TH_CLS} ${h.align}`}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {shifts.map((s) => {
                  const usd = s.cashDeltaCents / 100;
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className={`${TD_CLS} tabular-nums font-mono text-zinc-500`}>{fmtUtc(s.createdAt)}</td>
                      <td className={`${TD_CLS} font-mono text-zinc-200`}>{s.station}</td>
                      <td className={`${TD_CLS} text-[13px] text-zinc-200`}>{s.summary}</td>
                      <td className={`${TD_CLS} font-mono text-zinc-500`}>{s.authorEmail}</td>
                      <td
                        className={`${TD_CLS} tabular-nums text-right font-mono font-medium ${usd < 0 ? 'text-amber-400' : 'text-zinc-200'}`}
                      >
                        {usd >= 0 ? `+$${usd.toFixed(2)}` : `-$${Math.abs(usd).toFixed(2)}`}
                      </td>
                      <td className={`${TD_CLS} text-right`}>
                        {s.status === 'VERIFIED' && (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-300">
                            <Check className="h-3.5 w-3.5 text-[#4ECDC4]" aria-hidden="true" />
                            <span>Verified</span>
                          </span>
                        )}
                        {s.status !== 'VERIFIED' && canVerify && (
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await apiJson(`/api/shifts/${s.id}/verify`, 'POST');
                              if (r.ok) router.refresh();
                            }}
                            className="h-7 rounded-md border border-white/[0.09] bg-[#0C0C0E] px-2.5 font-medium text-zinc-300 transition-colors hover:border-white/[0.20] hover:text-zinc-100"
                          >
                            Verify
                          </button>
                        )}
                        {s.status !== 'VERIFIED' && !canVerify && (
                          <span className="font-mono text-[11px] text-amber-400/90">Open</span>
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
  );
}
