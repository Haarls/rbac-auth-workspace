'use client';

import { AlertCircle, Delete, KeyRound, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { RoleName } from '@/lib/permissions';

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

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'] as const;

export function PinSwitchModal({ open, onClose, operators, currentEmail }: PinSwitchModalProps) {
  const router = useRouter();
  const pinInputRef = useRef<HTMLInputElement>(null);
  const [selectedEmail, setSelectedEmail] = useState<string>(
    operators.find((o) => o.email !== currentEmail)?.email ?? operators[0]?.email ?? '',
  );
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPin('');
    setError(null);
    const defaultTarget =
      operators.find((o) => o.email !== currentEmail)?.email ?? operators[0]?.email ?? '';
    setSelectedEmail(defaultTarget);
    const id = requestAnimationFrame(() => pinInputRef.current?.focus());

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, currentEmail, operators, onClose]);

  if (!open) return null;

  function handlePadPress(key: (typeof PAD_KEYS)[number]) {
    setError(null);
    if (key === 'CLR') setPin('');
    else if (key === 'DEL') setPin((prev) => prev.slice(0, -1));
    else setPin((prev) => (prev.length < 6 ? prev + key : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedEmail, pin }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `PIN switch failed (HTTP ${res.status}).`);
        setPin('');
        pinInputRef.current?.focus();
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError('Network error while switching operator.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/85 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-switch-title"
        className="w-full max-w-md rounded-xl border border-line bg-surface p-6"
      >
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 id="pin-switch-title" className="text-base font-semibold text-ink">
              Switch Station Operator
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="switch-operator" className="block text-xs font-medium text-muted">
              Target Operator
            </label>
            <select
              id="switch-operator"
              value={selectedEmail}
              onChange={(e) => {
                setSelectedEmail(e.target.value);
                setError(null);
              }}
              className="mt-1.5 h-11 w-full rounded-lg border border-line bg-canvas px-3.5 text-sm text-ink transition-colors"
            >
              {operators.map((op) => (
                <option key={op.email} value={op.email}>
                  {op.name} ({op.role}) — {op.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="switch-pin" className="block text-xs font-medium text-muted">
                Operator PIN (4–6 digits)
              </label>
              <span className="tabular-nums font-mono text-xs text-muted">{pin.length}/6</span>
            </div>
            <div className="relative mt-1.5">
              <KeyRound
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                ref={pinInputRef}
                id="switch-pin"
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="tabular-nums h-12 w-full rounded-lg border border-line bg-canvas pl-10 pr-3.5 font-mono text-lg tracking-[0.4em] text-ink transition-colors placeholder:tracking-normal placeholder:text-muted"
                placeholder="••••"
              />
            </div>

            <div role="group" aria-label="PIN keypad" className="mt-3 grid grid-cols-3 gap-2">
              {PAD_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePadPress(key)}
                  className={`tabular-nums inline-flex h-9 items-center justify-center rounded-lg border border-line bg-canvas font-mono transition-colors hover:border-accent/60 active:bg-line ${
                    key === 'CLR' ? 'text-xs font-medium text-muted' : 'text-sm font-medium text-ink'
                  }`}
                >
                  {key === 'CLR' ? (
                    'Clear'
                  ) : key === 'DEL' ? (
                    <Delete className="h-4 w-4 text-muted" aria-hidden="true" />
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="tabular-nums flex items-center gap-2 rounded-lg border border-danger/40 bg-canvas px-3.5 py-2.5 text-xs text-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-line px-4 text-xs font-medium text-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || pin.length < 4}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-xs font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              <span>{pending ? 'Switching...' : 'Switch Shift'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
