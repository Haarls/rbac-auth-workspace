export type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; message: string };

export const CARD_CLS = 'rounded-xl border border-white/[0.08] bg-[#111113] shadow-card';
export const INPUT_CLS =
  'mt-1.5 h-9 w-full rounded-lg border border-white/[0.09] bg-[#0C0C0E] px-3 text-xs text-zinc-100 transition-all placeholder:text-zinc-600 hover:border-white/[0.16] focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/[0.06]';
export const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-lg bg-zinc-100 px-4 text-xs font-medium text-zinc-950 shadow-sm transition-all hover:bg-white active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40';
export const BTN_GHOST =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111113] px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-zinc-100';
export const TH_CLS = 'whitespace-nowrap px-5 py-3 font-medium sm:px-6';
export const TD_CLS = 'whitespace-nowrap px-5 py-3.5 sm:px-6';

export const fmtUtc = (iso: string, len = 19) => iso.slice(0, len).replace('T', ' ');
