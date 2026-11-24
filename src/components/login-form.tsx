'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'PASSWORD' | 'PIN'>('PASSWORD');
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0]?.email ?? '');
  const [password, setPassword] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setPin(account.pin);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const endpoint = mode === 'PASSWORD' ? '/api/auth/login' : '/api/auth/pin';
      const payload = mode === 'PASSWORD' ? { email, password } : { email, pin };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Authentication failed (HTTP ${res.status}).`);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Network error while contacting authentication server.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded border border-line bg-surface p-5">
        <div role="tablist" aria-label="Authentication method" className="mb-5 grid grid-cols-2 border-b border-line">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'PASSWORD'}
            onClick={() => {
              setMode('PASSWORD');
              setError(null);
            }}
            className={`border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              mode === 'PASSWORD'
                ? 'border-accent text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Email &amp; Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'PIN'}
            onClick={() => {
              setMode('PIN');
              setError(null);
            }}
            className={`border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              mode === 'PIN'
                ? 'border-accent text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Station PIN
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-muted">
              Operator Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted"
              placeholder="operator@demo.dev"
            />
          </div>

          {mode === 'PASSWORD' ? (
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-muted">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="auth-pin" className="block text-xs font-medium text-muted">
                Numeric PIN (4–6 digits)
              </label>
              <input
                id="auth-pin"
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
          )}

          {error && (
            <div
              role="alert"
              className="rounded border border-danger/40 bg-canvas px-3 py-2 text-xs text-danger tabular-nums"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded bg-accent px-4 py-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending
              ? 'Verifying...'
              : mode === 'PASSWORD'
                ? 'Sign In'
                : 'Unlock Station'}
          </button>
        </form>
      </section>

      <section aria-label="Demo Accounts" className="rounded border border-line bg-surface p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Demo Accounts
          </h2>
          <span className="text-xs text-muted">Click to autofill</span>
        </div>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map((acct) => {
            const selected = email === acct.email && (password === acct.password || pin === acct.pin);
            return (
              <button
                key={acct.email}
                type="button"
                onClick={() => fillDemo(acct)}
                className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                  selected
                    ? 'border-accent bg-canvas'
                    : 'border-line bg-canvas/60 hover:border-muted/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-ink">{acct.email}</span>
                  <span className="tabular-nums font-mono text-muted">
                    {acct.role} · PIN {acct.pin}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{acct.scopeNote}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
