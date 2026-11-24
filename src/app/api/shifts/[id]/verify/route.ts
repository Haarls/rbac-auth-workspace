import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth';
import { prisma, writeAuditLog } from '@/lib/db';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const guard = await requireApiPermission('shift:verify', `POST /api/shifts/${id}/verify`);
  if (!guard.ok) return guard.response;

  const existing = await prisma.shiftLog.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Shift entry not found.' }, { status: 404 });
  }

  const updated = await prisma.shiftLog.update({
    where: { id },
    data: { status: 'VERIFIED' },
  });

  await writeAuditLog({
    actorId: guard.ctx.user.id,
    actorEmail: guard.ctx.user.email,
    action: 'SHIFT_VERIFIED',
    target: `${updated.station} (${updated.id.slice(0, 8)})`,
    detail: `Reconciled by ${guard.ctx.user.role}`,
  });

  return NextResponse.json({ shift: updated });
}
