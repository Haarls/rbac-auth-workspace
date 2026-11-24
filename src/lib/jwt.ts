import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import type { RoleName } from './permissions';

export const SESSION_COOKIE = 'rbac_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export interface SessionTokenClaims {
  sid: string;
  sub: string;
  email: string;
  role: RoleName;
}

function getSigningKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET must be at least 32 characters in production');
    }
    return new TextEncoder().encode('dev-only-rbac-workspace-secret-key-32b!');
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionJwt(claims: SessionTokenClaims): Promise<string> {
  return new SignJWT({ sid: claims.sid, email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSigningKey());
}

export async function verifySessionJwt(token: string): Promise<SessionTokenClaims | null> {
  try {
    const { payload: p } = await jwtVerify(token, getSigningKey(), { algorithms: ['HS256'] });
    if (
      typeof p.sid !== 'string' ||
      typeof p.sub !== 'string' ||
      typeof p.email !== 'string' ||
      (p.role !== 'OWNER' && p.role !== 'MANAGER' && p.role !== 'STAFF')
    ) {
      return null;
    }
    return { sid: p.sid, sub: p.sub, email: p.email, role: p.role };
  } catch {
    return null;
  }
}
