import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getActiveSession } from '../../../../lib/auth';
import { prisma, writeAuditLog } from '../../../../lib/db';
import { SESSION_COOKIE } from '../../../../lib/jwt';

export async function POST() {
  const ctx = await getActiveSession();
  if (ctx) {
    await prisma.session.updateMany({
      where: { id: ctx.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await writeAuditLog({
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: 'AUTH_LOGOUT',
      target: `session:${ctx.sessionId.slice(0, 10)}`,
      detail: 'Session terminated by operator',
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
