'use client';

import { AlertCircle, ArrowRight, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ROLE_DOT, type RoleName } from '@/lib/permissions';
import { BTN_GHOST, BTN_PRIMARY, type RequestState } from '@/lib/ui';
import { CustomSelect } from './custom-select';
import { PinOtpInput } from './pin-otp-input';

export interface OperatorOption {
  email: string;
  name: string;
  role: RoleName;
}

interface PinSwitchModalProps {
  open: boolean;
  onClose: () => void;
  operators: OperatorOption[];
  currentEmail: string;
}

export function PinSwitchModal({ open, onClose, operators, currentEmail }: PinSwitchModalProps) {
  const router = useRouter();
  const [selectedEmail, setSelectedEmail] = useState(
    operators.find((o) => o.email !== currentEmail)?.email ?? operators[0]?.email ?? '',
  );
  const [pin, setPin] = useState('');
  const [req, setReq] = useState<RequestState>({ status: 'idle' });

  const selectOptions = useMemo(
    () => operators.map((op) => ({ value: op.email, label: `${op.name} (${op.role})`, dotClass: ROLE_DOT[op.role] })),
    [operators],
  );

  useEffect(() => {
    if (!open) return;
    setPin('');
    setReq({ status: 'idle' });
    setSelectedEmail(operators.find((o) => o.email !== currentEmail)?.email ?? operators[0]?.email ?? '');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, currentEmail, operators, onClose]);

  if (!open) return null;
  const pending = req.status === 'loading';

  async function submitPinSwitch(code: string) {
    if (pending || code.length < 4) return;
    setReq({ status: 'loading' });
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedEmail, pin: code }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPin('');
        return setReq({ status: 'error', message: data.error ?? `PIN switch failed (HTTP ${res.status}).` });
      }
      onClose();
      router.refresh();
    } catch {
      setReq({ status: 'error', message: 'Network error while switching operator.' });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="pin-switch-title" className="w-full max-w-[360px] rounded-2xl border border-white/[0.08] bg-[#111113] p-5 shadow-elevated sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="pin-switch-title" className="text-base font-medium tracking-[-0.02em] text-zinc-100">Switch operator</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Select an operator and enter their 4-digit PIN</p>
          </div>
          <button type="button" aria-label="Close modal" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => (e.preventDefault(), void submitPinSwitch(pin))} className="mt-5 space-y-4">
          <div>
            <label htmlFor="switch-operator" className="block text-xs font-medium text-zinc-400">Operator</label>
            <div className="mt-1.5">
              <CustomSelect
                id="switch-operator" ariaLabel="Select target operator" value={selectedEmail} options={selectOptions}
                onChange={(next) => (setSelectedEmail(next), setPin(''), setReq({ status: 'idle' }))}
                className="h-10 w-full text-[13px]"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Station PIN</span>
              <span className="font-mono text-[11px] text-zinc-500">4 digits</span>
            </div>
            <PinOtpInput
              value={pin} onChange={(next) => (setPin(next), req.status === 'error' && setReq({ status: 'idle' }))}
              onComplete={(code) => void submitPinSwitch(code)} disabled={pending} autoFocus
            />
          </div>

          {req.status === 'error' && (
            <div role="alert" className="tabular-nums flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{req.message}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={`${BTN_GHOST} h-9 px-3.5`}>Cancel</button>
            <button type="submit" disabled={pending || pin.length < 4} className={`${BTN_PRIMARY} h-9 gap-1.5 px-3.5`}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                : <><span>Unlock</span><ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
