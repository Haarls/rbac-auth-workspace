'use client';

import {
  AlertCircle,
  ArrowUpRight,
  Delete,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { ROLE_BADGE } from '@/lib/permissions';

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'] as const;

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'PASSWORD' | 'PIN'>('PASSWORD');
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0]?.email ?? '');
  const [password, setPassword] = useState<string>(DEMO_ACCOUNTS[0]?.password ?? '');
  const [pin, setPin] = useState<string>(DEMO_ACCOUNTS[0]?.pin ?? '');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      const res = await fetch(mode === 'PASSWORD' ? '/api/auth/login' : '/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'PASSWORD' ? { email, password } : { email, pin }),
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
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
      <section className="lg:col-span-5">
        <div className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-xs text-muted">
          <Shield className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          <span>Haarls / RBAC Workspace</span>
        </div>

        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          Hybrid operator access &amp; shift governance
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">
          Signed HS256 HttpOnly session cookies paired with scrypt-salted Station PINs, 5-strike database lockout, and append-only PostgreSQL audit logging.
        </p>

        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
              Demo Accounts
            </span>
            <span className="text-xs text-muted">Select to autofill</span>
          </div>

          <div className="space-y-2.5">
            {DEMO_ACCOUNTS.map((acct) => {
              const isSelected = email === acct.email;
              return (
                <button
                  key={acct.email}
                  type="button"
                  onClick={() => {
                    setEmail(acct.email);
                    setPassword(acct.password);
                    setPin(acct.pin);
                    setError(null);
                  }}
                  className={`group w-full rounded-lg border p-3.5 text-left transition-colors ${
                    isSelected
                      ? 'border-accent bg-surface'
                      : 'border-line bg-surface/60 hover:border-muted/50 hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{acct.name}</span>
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${ROLE_BADGE[acct.role]}`}
                      >
                        {acct.role}
                      </span>
                    </div>
                    <span className="tabular-nums inline-flex items-center gap-1 font-mono text-xs text-muted">
                      PIN {acct.pin}
                      <ArrowUpRight
                        className={`h-3.5 w-3.5 transition-colors ${
                          isSelected ? 'text-accent' : 'text-muted group-hover:text-ink'
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted">{acct.email}</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted/90">{acct.scopeNote}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lg:col-span-7">
        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Sign in to workspace
            </h1>
            <p className="mt-1 text-sm text-muted">
              Authenticate with operator credentials or unlock an assigned station PIN.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Authentication method"
            className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-line bg-canvas p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'PASSWORD'}
              onClick={() => {
                setMode('PASSWORD');
                setError(null);
              }}
              className={`seg-btn inline-flex h-9 items-center justify-center gap-2 rounded-md text-xs font-medium transition-colors sm:text-sm ${
                mode === 'PASSWORD' ? 'bg-line text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Email &amp; Password</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'PIN'}
              onClick={() => {
                setMode('PIN');
                setError(null);
              }}
              className={`seg-btn inline-flex h-9 items-center justify-center gap-2 rounded-md text-xs font-medium transition-colors sm:text-sm ${
                mode === 'PIN' ? 'bg-line text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Station PIN</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-muted">
                Operator Email
              </label>
              <div className="relative mt-1.5">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-canvas pl-10 pr-3.5 text-sm text-ink transition-colors placeholder:text-muted"
                  placeholder="operator@demo.dev"
                />
              </div>
            </div>

            {mode === 'PASSWORD' ? (
              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-muted">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-password"
                    type={showSecret ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-lg border border-line bg-canvas pl-10 pr-10 text-sm text-ink transition-colors"
                  />
                  <button
                    type="button"
                    aria-label={showSecret ? 'Hide password' : 'Show password'}
                    onClick={() => setShowSecret((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-pin" className="block text-xs font-medium text-muted">
                    Station PIN (4–6 digits)
                  </label>
                  <span className="tabular-nums font-mono text-xs text-muted">
                    {pin.length}/6 digits
                  </span>
                </div>
                <div className="relative mt-1.5">
                  <KeyRound
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-pin"
                    type={showSecret ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="\d{4,6}"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="tabular-nums h-12 w-full rounded-lg border border-line bg-canvas pl-10 pr-10 font-mono text-lg tracking-[0.4em] text-ink transition-colors placeholder:tracking-normal placeholder:text-muted"
                    placeholder="••••"
                  />
                  <button
                    type="button"
                    aria-label={showSecret ? 'Hide PIN' : 'Show PIN'}
                    onClick={() => setShowSecret((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div
                  role="group"
                  aria-label="Station numeric keypad"
                  className="mt-3 grid grid-cols-3 gap-2"
                >
                  {PAD_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      aria-label={
                        key === 'CLR' ? 'Clear PIN' : key === 'DEL' ? 'Backspace' : `Digit ${key}`
                      }
                      onClick={() => handlePadPress(key)}
                      className={`tabular-nums inline-flex h-10 items-center justify-center rounded-lg border border-line bg-canvas font-mono transition-colors hover:border-accent/60 active:bg-line ${
                        key === 'CLR'
                          ? 'text-xs font-medium text-muted hover:text-ink'
                          : 'text-sm font-medium text-ink'
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
            )}

            {error && (
              <div
                role="alert"
                className="tabular-nums flex items-center gap-2.5 rounded-lg border border-danger/40 bg-canvas px-3.5 py-2.5 text-xs text-danger"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending || (mode === 'PIN' && pin.length < 4)}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              <span>
                {pending
                  ? 'Authenticating...'
                  : mode === 'PASSWORD'
                    ? 'Sign in to workspace'
                    : 'Unlock station'}
              </span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
