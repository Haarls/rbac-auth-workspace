'use client';

import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { ROLE_DOT } from '@/lib/permissions';
import { BTN_PRIMARY, type RequestState } from '@/lib/ui';
import { PinOtpInput } from './pin-otp-input';

const AUTH_MODES = [
  { id: 'PASSWORD', label: 'Password' },
  { id: 'PIN', label: 'Station PIN' },
] as const;
const DEMO_PILLS = [
  { label: 'Owner', account: DEMO_ACCOUNTS[0]! },
  { label: 'Manager', account: DEMO_ACCOUNTS[1]! },
  { label: 'Staff', account: DEMO_ACCOUNTS[2]! },
] as const;

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'PASSWORD' | 'PIN'>('PASSWORD');
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0]?.email ?? '');
  const [password, setPassword] = useState<string>(DEMO_ACCOUNTS[0]?.password ?? '');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [req, setReq] = useState<RequestState>({ status: 'idle' });

  const matchedDemo = DEMO_ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
  const pending = req.status === 'loading';

  async function submitAuth(authMode: 'PASSWORD' | 'PIN', pinOverride?: string) {
    if (pending) return;
    const effectivePin = pinOverride ?? pin;
    if (authMode === 'PIN' && effectivePin.length < 4) return;

    setReq({ status: 'loading' });
    try {
      const res = await fetch(authMode === 'PASSWORD' ? '/api/auth/login' : '/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          authMode === 'PASSWORD' ? { email, password } : { email, pin: effectivePin },
        ),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (authMode === 'PIN') setPin('');
        return setReq({
          status: 'error',
          message: data.error ?? `Authentication failed (HTTP ${res.status}).`,
        });
      }
      router.push('/');
      router.refresh();
    } catch {
      setReq({ status: 'error', message: 'Network error while contacting authentication server.' });
    }
  }

  return (
    <div className="w-full max-w-[390px] rounded-2xl border border-white/[0.08] bg-[#111113] p-5 shadow-elevated sm:p-7">
      <h1 className="text-xl font-semibold tracking-[-0.025em] text-zinc-100">Sign in</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
        Enter your credentials or unlock with a station PIN
      </p>

      <div
        role="tablist"
        aria-label="Authentication method"
        className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-white/[0.06] bg-[#09090B] p-1 text-xs"
      >
        {AUTH_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => {
              setMode(m.id);
              setReq({ status: 'idle' });
            }}
            className={`h-7 rounded-md font-medium transition-colors ${mode === m.id ? 'bg-white/[0.08] text-zinc-100 shadow-card' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitAuth(mode);
        }}
        className="mt-5 space-y-4"
      >
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="auth-email" className="text-xs font-medium text-zinc-400">
              Email
            </label>
            {matchedDemo && (
              <span className="tabular-nums inline-flex items-center gap-1.5 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-300">
                <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[matchedDemo.role]}`} />
                <span>{matchedDemo.role}</span>
              </span>
            )}
          </div>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@demo.dev"
            className="mt-1.5 h-10 w-full rounded-lg border border-white/[0.09] bg-[#0C0C0E] px-3 text-[13px] text-zinc-100 transition-all placeholder:text-zinc-600 hover:border-white/[0.16] focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/[0.06]"
          />
        </div>

        {mode === 'PASSWORD' ? (
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="auth-password" className="text-xs font-medium text-zinc-400">
                Password
              </label>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                <ShieldCheck className="h-3 w-3 text-[#4ECDC4]" aria-hidden="true" />
                <span>HttpOnly · scrypt</span>
              </span>
            </div>
            <div className="relative mt-1.5">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#0C0C0E] pl-3 pr-9 text-[13px] text-zinc-100 transition-all hover:border-white/[0.16] focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/[0.06]"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Passkey PIN</span>
              <span className="tabular-nums font-mono text-[11px] text-zinc-500">
                {matchedDemo ? `Demo PIN: ${matchedDemo.pin}` : 'Auto-unlocks on 4th digit'}
              </span>
            </div>
            <PinOtpInput
              value={pin}
              onChange={(next) => {
                setPin(next);
                if (req.status === 'error') {
                  setReq({ status: 'idle' });
                }
              }}
              onComplete={(code) => void submitAuth('PIN', code)}
              disabled={pending}
              autoFocus
            />
          </div>
        )}

        {req.status === 'error' && (
          <div
            role="alert"
            className="tabular-nums flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{req.message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={pending || (mode === 'PIN' && pin.length < 4)}
          className={`${BTN_PRIMARY} h-10 w-full gap-1.5 text-[13px]`}
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span>Verifying</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
        <span className="text-xs text-zinc-500">Quick demo:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {DEMO_PILLS.map(({ label, account }) => {
            const active = email.trim().toLowerCase() === account.email;
            return (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setPin(account.pin);
                  setReq({ status: 'idle' });
                }}
                className={`inline-flex h-6 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${active ? 'border-white/[0.18] bg-white/[0.08] text-zinc-100' : 'border-white/[0.06] bg-[#0C0C0E] text-zinc-400 hover:border-white/[0.14] hover:text-zinc-200'}`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-[#4ECDC4]" />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
