import { NextResponse } from 'next/server';
import { requireApiPermission } from '../../../../../lib/auth';
import { prisma, writeAuditLog } from '../../../../../lib/db';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const guard = await requireApiPermission('session:revoke', `POST /api/sessions/${id}/revoke`);
  if (!guard.ok) return guard.response;

  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: { email: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  if (session.revokedAt === null) {
    await prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    await writeAuditLog({
      actorId: guard.ctx.user.id,
      actorEmail: guard.ctx.user.email,
      action: 'SESSION_REVOKED',
      target: `${session.user.email} (${id.slice(0, 8)})`,
      detail: `Revoked ${session.method} session immediately`,
    });
  }

  return NextResponse.json({ revoked: true });
}
