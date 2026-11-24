'use client';

import {
  useEffect,
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';

export function BrandIsotipo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeCls = size === 'sm' ? 'h-6 w-6 rounded-md' : 'h-7 w-7 rounded-lg';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center border border-white/10 bg-[#111113] shadow-card ${sizeCls}`}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M3.5 3V13M12.5 3V13M3.5 8H9.5"
          stroke="#F4F4F5"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="12.5" cy="8" r="1.75" fill="#4ECDC4" />
      </svg>
    </span>
  );
}

interface PinOtpInputProps {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function PinOtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
}: PinOtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 4 }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) {
      requestAnimationFrame(() => refs.current[0]?.focus());
    }
  }, [autoFocus]);

  function setAt(idx: number, char: string) {
    const next = [...digits];
    next[idx] = char;
    const joined = next.join('');
    onChange(joined);

    if (char && idx < 3) {
      refs.current[idx + 1]?.focus();
    }
    if (char && next.every((d) => d.length === 1)) {
      onComplete?.(joined);
    }
  }

  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      setAt(idx, e.key);
      return;
    }

    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      refs.current[idx - 1]?.focus();
      return;
    }

    if (e.key === 'ArrowRight' && idx < 3) {
      e.preventDefault();
      refs.current[idx + 1]?.focus();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (digits[idx]) {
        next[idx] = '';
      } else if (idx > 0) {
        next[idx - 1] = '';
        refs.current[idx - 1]?.focus();
      }
      onChange(next.join(''));
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    onChange(pasted);
    refs.current[Math.min(pasted.length, 3)]?.focus();
    if (pasted.length === 4) {
      onComplete?.(pasted);
    }
  }

  return (
    <div
      role="group"
      aria-label="4-digit Station PIN"
      className="flex items-center justify-center gap-3"
    >
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          aria-label={`PIN digit ${idx + 1} of 4`}
          value={digit}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const clean = e.target.value.replace(/\D/g, '').slice(-1);
            if (clean) setAt(idx, clean);
          }}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          className="tabular-nums h-13 w-12 rounded-xl border border-white/[0.10] bg-[#0C0C0E] text-center font-mono text-lg text-zinc-100 transition-all hover:border-white/[0.16] focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/[0.06] disabled:opacity-50"
        />
      ))}
    </div>
  );
}
