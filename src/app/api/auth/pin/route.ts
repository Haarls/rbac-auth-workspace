import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getActiveSession, issueSessionCookie } from '@/lib/auth';
import { evaluatePinAttempt, verifySecret } from '@/lib/crypto';
import { prisma, writeAuditLog } from '@/lib/db';

const PinUnlockSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits.'),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = PinUnlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Select an operator and enter a 4-6 digit PIN.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.pinHash) {
    return NextResponse.json({ error: 'No PIN configured for this operator.' }, { status: 401 });
  }

  const now = new Date();
  const currentlyLocked = user.pinLockedUntil !== null && user.pinLockedUntil.getTime() > now.getTime();
  const pinMatched = currentlyLocked ? false : await verifySecret(parsed.data.pin, user.pinHash);

  const outcome = evaluatePinAttempt(
    { failedCount: user.pinFailedCount, lockedUntil: user.pinLockedUntil },
    pinMatched,
    now,
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pinFailedCount: outcome.nextFailedCount,
      pinLockedUntil: outcome.nextLockedUntil,
    },
  });

  if (outcome.status === 'LOCKED') {
    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: 'AUTH_PIN_LOCKED',
      target: `user:${user.email}`,
      detail: outcome.message ?? 'PIN locked due to repeated failures',
    });
    return NextResponse.json({ error: outcome.message }, { status: 429 });
  }

  if (outcome.status === 'INVALID') {
    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: 'AUTH_PIN_FAILED',
      target: `user:${user.email}`,
      detail: `${outcome.remainingAttempts} attempts remaining`,
    });
    return NextResponse.json(
      { error: outcome.message, remainingAttempts: outcome.remainingAttempts },
      { status: 401 },
    );
  }

  const prior = await getActiveSession();
  if (prior && prior.sessionId) {
    await prisma.session.updateMany({
      where: { id: prior.sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
  } else {
    await cookies();
  }

  const sessionId = await issueSessionCookie({
    userId: user.id,
    email: user.email,
    role: user.role,
    method: 'PIN',
    userAgent: request.headers.get('user-agent'),
  });

  await writeAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: 'AUTH_PIN_SWITCH',
    target: `session:${sessionId.slice(0, 10)}`,
    detail: prior
      ? `Operator switched from ${prior.user.email} to ${user.email} (${user.role})`
      : `Unlocked terminal via PIN (${user.role})`,
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
