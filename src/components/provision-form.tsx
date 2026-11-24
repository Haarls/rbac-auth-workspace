'use client';

import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ROLE_DOT, type RoleName } from '../lib/permissions';
import { BTN_PRIMARY, CARD_CLS, INPUT_CLS } from '../lib/ui';
import { CustomSelect, type SelectOption } from './custom-select';

export const ROLE_OPTIONS: readonly SelectOption<RoleName>[] = [
  { value: 'OWNER', label: 'OWNER', dotClass: ROLE_DOT.OWNER },
  { value: 'MANAGER', label: 'MANAGER', dotClass: ROLE_DOT.MANAGER },
  { value: 'STAFF', label: 'STAFF', dotClass: ROLE_DOT.STAFF },
];

const NewOperatorSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().max(100).email(),
  password: z.string().min(8).max(64),
  pin: z.string().trim().regex(/^\d{4,6}$/).optional().or(z.literal('')),
});

const FIELDS = [
  { id: 'new-name', name: 'name', label: 'Name', type: 'text', placeholder: 'Ana Torres', span: 'lg:col-span-2' },
  { id: 'new-email', name: 'email', label: 'Email', type: 'email', placeholder: 'ana@ops.dev', span: 'lg:col-span-3' },
  { id: 'new-pass', name: 'password', label: 'Password', type: 'password', placeholder: '8+ chars', span: 'lg:col-span-2' },
] as const;

interface ProvisionFormProps {
  busy: boolean;
  onValidationError: (msg: string) => void;
  onSubmitOperator: (payload: Record<string, unknown>, resetForm: () => void) => void;
}

export function ProvisionForm({ busy, onValidationError, onSubmitOperator }: ProvisionFormProps) {
  const [role, setRole] = useState<RoleName>('STAFF');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = NewOperatorSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      onValidationError('Valid name, email, 8+ char password, and optional 4-digit PIN required.');
      return;
    }
    const { pin, ...rest } = parsed.data;
    onSubmitOperator({ ...rest, role, ...(pin ? { pin } : {}) }, () => {
      form.reset();
      setRole('STAFF');
    });
  }

  return (
    <section className={`${CARD_CLS} p-5 sm:p-6`}>
      <h2 className="text-sm font-medium tracking-[-0.015em] text-zinc-100">Provision operator</h2>
      <p className="mt-0.5 text-[13px] text-zinc-400">
        Create workspace credentials and optionally assign a 4-digit station PIN.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3.5 lg:grid-cols-12">
        {FIELDS.map((f) => (
          <div key={f.id} className={f.span}>
            <label htmlFor={f.id} className="block text-xs font-medium text-zinc-400">
              {f.label}
            </label>
            <input id={f.id} name={f.name} type={f.type} required placeholder={f.placeholder} className={INPUT_CLS} />
          </div>
        ))}

        <div className="lg:col-span-2">
          <label htmlFor="new-pin" className="block text-xs font-medium text-zinc-400">
            Station PIN
          </label>
          <input
            id="new-pin"
            name="pin"
            inputMode="numeric"
            pattern="\d{4,6}"
            maxLength={6}
            placeholder="4-6 digits"
            className={`${INPUT_CLS} tabular-nums font-mono`}
          />
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end lg:col-span-3">
          <div className="flex-1">
            <label htmlFor="new-role" className="block text-xs font-medium text-zinc-400">
              Role
            </label>
            <div className="mt-1.5">
              <CustomSelect
                id="new-role"
                ariaLabel="Role for new operator"
                value={role}
                options={ROLE_OPTIONS}
                onChange={setRole}
                className="h-9 w-full font-mono"
              />
            </div>
          </div>
          <button type="submit" disabled={busy} className={`${BTN_PRIMARY} h-9 shrink-0`}>
            Create
          </button>
        </div>
      </form>
    </section>
  );
}
