'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  dotClass?: string;
}

interface CustomSelectProps<V extends string = string> {
  id?: string;
  ariaLabel?: string;
  value: V;
  options: readonly SelectOption<V>[];
  onChange: (next: V) => void;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect<V extends string = string>({
  id, ariaLabel, value, options, onChange, disabled = false, className = 'h-9',
}: CustomSelectProps<V>) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  const selectedIdx = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIdx] ?? options[0];

  function openMenu() {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const minWidth = Math.max(r.width, 192);
    setRect({ top: r.bottom + 6, left: Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - minWidth - 8)), minWidth });
    requestAnimationFrame(() => (listRef.current?.children[selectedIdx] as HTMLButtonElement | undefined)?.focus());
  }

  function closeMenu(focusTrigger = false) {
    setRect(null);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (!rect) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const cur = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeMenu(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(cur + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(cur - 1 + items.length) % items.length]?.focus();
    }
  }

  return (
    <div className="inline-block w-full sm:w-auto" onKeyDown={handleKeyDown} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setRect(null); }}>
      <button
        ref={triggerRef} id={id} type="button" role="combobox" aria-label={ariaLabel}
        aria-expanded={rect !== null} aria-haspopup="listbox" aria-controls={listboxId} disabled={disabled}
        onClick={() => (rect ? setRect(null) : openMenu())}
        className={`relative inline-flex items-center justify-between gap-2 rounded-lg border bg-[#0C0C0E] pl-3 pr-9 text-left text-xs text-zinc-100 transition-all disabled:pointer-events-none disabled:opacity-50 ${rect ? 'border-white/30 ring-2 ring-white/[0.06]' : 'border-white/[0.09] hover:border-white/[0.16]'} ${className}`}
      >
        <span className="inline-flex min-w-0 items-center gap-2 truncate">
          {selected?.dotClass && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${selected.dotClass}`} />}
          <span className="truncate">{selected?.label ?? value}</span>
        </span>
        <ChevronDown aria-hidden="true" className={`pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 transition-transform ${rect ? 'rotate-180 text-zinc-200' : ''}`} />
      </button>

      {rect && (
        <div
          ref={listRef} id={listboxId} role="listbox" aria-label={ariaLabel}
          style={{ position: 'fixed', top: rect.top, left: rect.left, minWidth: rect.minWidth }}
          className="z-[70] max-h-64 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#111113] p-1 font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_18px_38px_-10px_rgba(0,0,0,0.8)]"
        >
          {options.map((opt) => (
            <button
              key={opt.value} type="button" role="option" aria-selected={opt.value === value}
              onClick={() => {
                if (opt.value !== value) onChange(opt.value);
                closeMenu(true);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-white/[0.06] hover:text-zinc-100 focus:bg-white/[0.06] focus:text-zinc-100 focus:outline-none ${opt.value === value ? 'text-zinc-100' : 'text-zinc-300'}`}
            >
              <span className="inline-flex min-w-0 items-center gap-2 truncate">
                {opt.dotClass && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${opt.dotClass}`} />}
                <span className="truncate">{opt.label}</span>
              </span>
              {opt.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-[#4ECDC4]" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
