'use client';

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
        className="w-full max-w-sm rounded border border-line bg-surface p-5"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 id="pin-switch-title" className="text-sm font-semibold text-ink">
            Quick Operator Switch
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-0.5 text-xs text-muted hover:text-ink"
          >
            Esc
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
              className="mt-1.5 w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink"
            >
              {operators.map((op) => (
                <option key={op.email} value={op.email}>
                  {op.name} ({op.role}) — {op.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="switch-pin" className="block text-xs font-medium text-muted">
              Operator PIN (4–6 digits)
            </label>
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
              className="tabular-nums mt-1.5 w-full rounded border border-line bg-canvas px-3 py-2 font-mono text-sm tracking-widest text-ink"
              placeholder="••••"
            />
          </div>

          {error && (
            <p role="alert" className="tabular-nums rounded border border-danger/40 bg-canvas px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || pin.length < 4}
              className="rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-canvas hover:opacity-90 disabled:opacity-50"
            >
              {pending ? 'Switching...' : 'Switch Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
