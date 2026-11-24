import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma, writeAuditLog } from './db';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSessionJwt, verifySessionJwt } from './jwt';
import { hasPermission, requiredRoleLabel, type Permission, type RoleName } from './permissions';

export interface AuthenticatedContext {
  sessionId: string;
  method: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: RoleName;
  };
}

export async function getActiveSession(): Promise<AuthenticatedContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySessionJwt(token);
  if (!claims) return null;

  // Always resolve role and revocation state from PostgreSQL so demotions or session revocations apply immediately.
  const session = await prisma.session.findUnique({
    where: { id: claims.sid },
    include: { user: true },
  });

  if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return {
    sessionId: session.id,
    method: session.method,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    },
  };
}

export async function issueSessionCookie(params: {
  userId: string;
  email: string;
  role: RoleName;
  method: 'PASSWORD' | 'PIN';
  userAgent?: string | null;
}): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      method: params.method,
      userAgent: params.userAgent ? params.userAgent.slice(0, 180) : null,
      expiresAt,
    },
  });

  const jwt = await signSessionJwt({
    sid: session.id,
    sub: params.userId,
    email: params.email,
    role: params.role,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  return session.id;
}

export async function requireApiPermission(
  permission: Permission,
  targetResource: string,
): Promise<{ ok: true; ctx: AuthenticatedContext } | { ok: false; response: NextResponse }> {
  const ctx = await getActiveSession();
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ error: '401 Unauthorized: Active session required.' }, { status: 401 }),
    };
  }

  if (!hasPermission(ctx.user.role, permission)) {
    const needed = requiredRoleLabel(permission);
    await writeAuditLog({
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: 'ACCESS_DENIED_403',
      target: targetResource,
      detail: `Role ${ctx.user.role} lacks '${permission}' (${needed} required)`,
    });

    return {
      ok: false,
      response: NextResponse.json(
        { error: `403 Forbidden: ${needed} role required.` },
        { status: 403 },
      ),
    };
  }

  return { ok: true, ctx };
}
