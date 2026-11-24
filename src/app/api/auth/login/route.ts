import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { issueSessionCookie } from '@/lib/auth';
import { verifySecret } from '@/lib/crypto';
import { prisma, writeAuditLog } from '@/lib/db';

const LoginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid email and password are required.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user ? await verifySecret(parsed.data.password, user.passwordHash) : false;

  if (!user || !valid) {
    await writeAuditLog({
      actorEmail: parsed.data.email,
      action: 'AUTH_LOGIN_FAILED',
      target: 'POST /api/auth/login',
      detail: 'Invalid email or password',
    });
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const sessionId = await issueSessionCookie({
    userId: user.id,
    email: user.email,
    role: user.role,
    method: 'PASSWORD',
    userAgent: request.headers.get('user-agent'),
  });

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: 'AUTH_LOGIN',
    target: `session:${sessionId.slice(0, 10)}`,
    detail: `Signed in via password (${user.role})`,
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
