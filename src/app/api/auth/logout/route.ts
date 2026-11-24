import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getActiveSession } from '../../../../lib/auth';
import { prisma, writeAuditLog } from '../../../../lib/db';
import { SESSION_COOKIE } from '../../../../lib/jwt';
import { checkWriteRateLimit, extractClientIp } from '../../../../lib/security';

export async function POST(request: NextRequest) {
  const limited = checkWriteRateLimit(extractClientIp(request.headers));
  if (limited) return limited;

  const ctx = await getActiveSession();
  if (ctx) {
    await prisma.session.updateMany({
      where: { id: ctx.sessionId, sandboxId: ctx.sandboxId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await writeAuditLog({
      sandboxId: ctx.sandboxId,
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
