import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiPermission } from '../../../../lib/auth';
import { hashSecret } from '../../../../lib/crypto';
import { prisma, writeAuditLog } from '../../../../lib/db';
import { checkWriteRateLimit, extractClientIp, parseJsonBody } from '../../../../lib/security';

const UpdateUserSchema = z
  .object({
    role: z.enum(['OWNER', 'MANAGER', 'STAFF']).optional(),
    pin: z.string().trim().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits.').optional(),
  })
  .refine((d) => d.role !== undefined || d.pin !== undefined, {
    message: 'Provide role or pin to update.',
  });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = checkWriteRateLimit(extractClientIp(request.headers));
  if (limited) return limited;

  const { id } = await context.params;
  const guard = await requireApiPermission('team:manage', `PATCH /api/users/${id}`);
  if (!guard.ok) return guard.response;

  const raw = await parseJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = UpdateUserSchema.safeParse(raw.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid role or PIN (must be 4-6 digits).' },
      { status: 400 },
    );
  }

  const { sandboxId } = guard.ctx;
  const target = await prisma.user.findFirst({ where: { id, sandboxId } });
  if (!target) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  if (parsed.data.role && target.role === 'OWNER' && parsed.data.role !== 'OWNER') {
    const ownerCount = await prisma.user.count({ where: { sandboxId, role: 'OWNER' } });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot demote the last OWNER in the workspace.' },
        { status: 400 },
      );
    }
  }

  const pinHash = parsed.data.pin ? await hashSecret(parsed.data.pin) : undefined;
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(parsed.data.role ? { role: parsed.data.role } : {}),
      ...(pinHash !== undefined ? { pinHash, pinFailedCount: 0, pinLockedUntil: null } : {}),
    },
  });

  if (parsed.data.role && parsed.data.role !== target.role) {
    await writeAuditLog({
      sandboxId,
      actorId: guard.ctx.user.id,
      actorEmail: guard.ctx.user.email,
      action: 'ROLE_CHANGED',
      target: target.email,
      detail: `${target.role} -> ${updated.role}`,
    });
  }

  if (pinHash !== undefined) {
    await writeAuditLog({
      sandboxId,
      actorId: guard.ctx.user.id,
      actorEmail: guard.ctx.user.email,
      action: 'PIN_UPDATED',
      target: target.email,
      detail: 'Operator PIN rotated and lockout counter cleared',
    });
  }

  return NextResponse.json({
    user: { id: updated.id, email: updated.email, role: updated.role },
  });
}
