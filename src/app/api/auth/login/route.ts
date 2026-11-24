import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { issueSessionCookie } from '../../../../lib/auth';
import { verifySecret } from '../../../../lib/crypto';
import { prisma, writeAuditLog } from '../../../../lib/db';
import { ensureSandbox } from '../../../../lib/sandbox';
import { checkWriteRateLimit, extractClientIp, parseJsonBody } from '../../../../lib/security';

const LoginSchema = z.object({
  email: z.string().trim().max(100).email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(64),
});

export async function POST(request: NextRequest) {
  const ip = extractClientIp(request.headers);
  const limited = checkWriteRateLimit(ip);
  if (limited) return limited;

  const raw = await parseJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = LoginSchema.safeParse(raw.data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid email and password are required.' }, { status: 400 });
  }

  const sbx = await ensureSandbox(ip);
  if (!sbx.ok) return NextResponse.json({ error: sbx.error }, { status: sbx.status });

  const user = await prisma.user.findUnique({
    where: { sandboxId_email: { sandboxId: sbx.sandboxId, email: parsed.data.email } },
  });
  const valid = user ? await verifySecret(parsed.data.password, user.passwordHash) : false;

  if (!user || !valid) {
    await writeAuditLog({
      sandboxId: sbx.sandboxId,
      actorEmail: parsed.data.email,
      action: 'AUTH_LOGIN_FAILED',
      target: 'POST /api/auth/login',
      detail: 'Invalid email or password',
    });
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const sessionId = await issueSessionCookie({
    sandboxId: sbx.sandboxId,
    userId: user.id,
    email: user.email,
    role: user.role,
    method: 'PASSWORD',
    userAgent: request.headers.get('user-agent'),
  });

  await writeAuditLog({
    sandboxId: sbx.sandboxId,
    actorId: user.id,
    actorEmail: user.email,
    action: 'AUTH_LOGIN',
    target: `session:${sessionId.slice(0, 10)}`,
    detail: `Signed in via password (${user.role})`,
  });

  return NextResponse.json({
    sandboxId: sbx.sandboxId,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
