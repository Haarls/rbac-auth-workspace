import { NextResponse, type NextRequest } from 'next/server';
import { requireApiPermission } from '../../../../../lib/auth';
import { prisma, writeAuditLog } from '../../../../../lib/db';
import { checkWriteRateLimit, extractClientIp } from '../../../../../lib/security';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = checkWriteRateLimit(extractClientIp(request.headers));
  if (limited) return limited;

  const { id } = await context.params;
  const guard = await requireApiPermission('session:revoke', `POST /api/sessions/${id}/revoke`);
  if (!guard.ok) return guard.response;

  const { sandboxId } = guard.ctx;
  const session = await prisma.session.findFirst({
    where: { id, sandboxId },
    include: { user: { select: { email: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  if (session.revokedAt === null) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await writeAuditLog({
      sandboxId,
      actorId: guard.ctx.user.id,
      actorEmail: guard.ctx.user.email,
      action: 'SESSION_REVOKED',
      target: `${session.user.email} (${id.slice(0, 8)})`,
      detail: `Revoked ${session.method} session immediately`,
    });
  }

  return NextResponse.json({ revoked: true });
}
