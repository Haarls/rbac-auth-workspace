import { NextResponse, type NextRequest } from 'next/server';
import { requireApiPermission } from '../../../../../lib/auth';
import { prisma, writeAuditLog } from '../../../../../lib/db';
import { checkWriteRateLimit, extractClientIp } from '../../../../../lib/security';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = checkWriteRateLimit(extractClientIp(request.headers));
  if (limited) return limited;

  const { id } = await context.params;
  const guard = await requireApiPermission('shift:verify', `POST /api/shifts/${id}/verify`);
  if (!guard.ok) return guard.response;

  const { sandboxId } = guard.ctx;
  const existing = await prisma.shiftLog.findFirst({ where: { id, sandboxId } });
  if (!existing) {
    return NextResponse.json({ error: 'Shift entry not found.' }, { status: 404 });
  }

  const updated = await prisma.shiftLog.update({
    where: { id: existing.id },
    data: { status: 'VERIFIED' },
  });

  await writeAuditLog({
    sandboxId,
    actorId: guard.ctx.user.id,
    actorEmail: guard.ctx.user.email,
    action: 'SHIFT_VERIFIED',
    target: `${updated.station} (${updated.id.slice(0, 8)})`,
    detail: `Reconciled by ${guard.ctx.user.role}`,
  });

  return NextResponse.json({ shift: updated });
}
