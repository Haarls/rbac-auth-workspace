'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

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
  mono?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function CustomSelect<V extends string = string>({
  id,
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  mono = false,
  size = 'md',
  className = '',
}: CustomSelectProps<V>) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; minWidth: number } | null>(
    null,
  );

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex] ?? options[0];

  const syncCoords = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const minWidth = Math.max(rect.width, 196);
    const maxLeft = Math.max(8, window.innerWidth - minWidth - 8);
    setCoords({
      top: rect.bottom + 6,
      left: Math.min(Math.max(8, rect.left), maxLeft),
      minWidth,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) syncCoords();
  }, [open, syncCoords]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', syncCoords);
    window.addEventListener('scroll', syncCoords, true);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', syncCoords);
      window.removeEventListener('scroll', syncCoords, true);
    };
  }, [open, syncCoords]);

  function commit(idx: number) {
    const opt = options[idx];
    if (opt && opt.value !== value) {
      onChange(opt.value);
    }
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setActiveIndex(selectedIndex);
        setOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(activeIndex);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  const heightCls = size === 'sm' ? 'h-8' : 'h-9';
  const stateCls = open
    ? 'border-white/30 ring-2 ring-white/[0.06]'
    : 'border-white/[0.09] hover:border-white/[0.16]';

  return (
    <div ref={containerRef} className="inline-block w-full sm:w-auto">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            setActiveIndex(selectedIndex);
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex items-center justify-between gap-2 rounded-lg border bg-[#0C0C0E] pl-3 pr-9 text-left text-xs text-zinc-100 transition-all disabled:pointer-events-none disabled:opacity-50 ${heightCls} ${stateCls} ${mono ? 'font-mono' : ''} ${className}`}
      >
        <span className="inline-flex min-w-0 items-center gap-2 truncate">
          {selected?.dotClass && (
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${selected.dotClass}`} />
          )}
          <span className="truncate">{selected?.label ?? value}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 transition-transform ${
            open ? 'rotate-180 text-zinc-200' : ''
          }`}
        />
      </button>

      {open && coords && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            minWidth: coords.minWidth,
          }}
          className="z-[70] max-h-64 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#111113] p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_18px_38px_-10px_rgba(0,0,0,0.8)]"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            let rowCls = 'text-zinc-300 hover:bg-white/[0.06]';
            if (idx === activeIndex) {
              rowCls = 'bg-white/[0.06] text-zinc-100';
            } else if (isSelected) {
              rowCls = 'text-zinc-100';
            }

            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(idx);
                }}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-xs transition-colors ${mono ? 'font-mono' : ''} ${rowCls}`}
              >
                <span className="inline-flex min-w-0 items-center gap-2 truncate">
                  {opt.dotClass && (
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${opt.dotClass}`} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#4ECDC4]" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
