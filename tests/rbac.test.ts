import { describe, expect, it } from 'vitest';
import { evaluatePinAttempt, hashSecret, verifySecret } from '../src/lib/crypto';
import { signSessionJwt, verifySessionJwt } from '../src/lib/jwt';
import { hasPermission, requiredRoleLabel } from '../src/lib/permissions';
import { checkWriteRateLimit, parseJsonBody, resetRateLimitsForTest } from '../src/lib/security';

describe('rbac-auth-workspace security primitives', () => {
  it('enforces granular RBAC matrix across OWNER, MANAGER, and STAFF', () => {
    expect(hasPermission('OWNER', 'team:manage')).toBe(true);
    expect(hasPermission('OWNER', 'session:revoke')).toBe(true);

    expect(hasPermission('MANAGER', 'team:read')).toBe(true);
    expect(hasPermission('MANAGER', 'shift:verify')).toBe(true);
    expect(hasPermission('MANAGER', 'team:manage')).toBe(false);
    expect(hasPermission('MANAGER', 'session:revoke')).toBe(false);

    expect(hasPermission('STAFF', 'shift:create')).toBe(true);
    expect(hasPermission('STAFF', 'team:read')).toBe(false);
    expect(hasPermission('STAFF', 'audit:read')).toBe(false);

    expect(requiredRoleLabel('team:manage')).toBe('OWNER');
    expect(requiredRoleLabel('team:read')).toBe('MANAGER');
    expect(requiredRoleLabel('shift:create')).toBe('STAFF');
  });

  it('hashes passwords and PINs with unique random salts and verifies in constant time', async () => {
    const hashA = await hashSecret('DemoOwner!2026');
    const hashB = await hashSecret('DemoOwner!2026');

    expect(hashA).not.toBe(hashB);
    expect(await verifySecret('DemoOwner!2026', hashA)).toBe(true);
    expect(await verifySecret('WrongPass!2026', hashA)).toBe(false);
    expect(await verifySecret('DemoOwner!2026', 'malformed')).toBe(false);
  });

  it('locks operator PIN for 5 minutes after 5 consecutive failures and resets after expiry', () => {
    const t0 = new Date('2026-11-23T20:00:00.000Z');
    let state: { failedCount: number; lockedUntil: Date | null } = {
      failedCount: 0,
      lockedUntil: null,
    };

    for (let i = 1; i <= 4; i++) {
      const res = evaluatePinAttempt(state, false, t0);
      expect(res.status).toBe('INVALID');
      expect(res.remainingAttempts).toBe(5 - i);
      state = { failedCount: res.nextFailedCount, lockedUntil: res.nextLockedUntil };
    }

    const fifth = evaluatePinAttempt(state, false, t0);
    expect(fifth.status).toBe('LOCKED');
    expect(fifth.remainingAttempts).toBe(0);
    expect(fifth.message).toBe('PIN locked for 5m after 5 failed attempts.');

    state = { failedCount: fifth.nextFailedCount, lockedUntil: fifth.nextLockedUntil };

    // Even a matching PIN is rejected while lock window is active
    const duringLock = evaluatePinAttempt(state, true, new Date(t0.getTime() + 60_000));
    expect(duringLock.status).toBe('LOCKED');

    // After 5m + 1s, valid PIN succeeds and clears failedCount
    const afterExpiry = evaluatePinAttempt(state, true, new Date(t0.getTime() + 301_000));
    expect(afterExpiry.status).toBe('OK');
    expect(afterExpiry.nextFailedCount).toBe(0);
    expect(afterExpiry.nextLockedUntil).toBeNull();
  });

  it('signs HS256 sandbox-scoped session JWTs and rejects tampered tokens', async () => {
    const token = await signSessionJwt({
      sid: 'sess_12345',
      sbx: 'sbx_abc',
      sub: 'usr_99',
      email: 'owner@demo.dev',
      role: 'OWNER',
    });

    const verified = await verifySessionJwt(token);
    expect(verified).toEqual({
      sid: 'sess_12345',
      sbx: 'sbx_abc',
      sub: 'usr_99',
      email: 'owner@demo.dev',
      role: 'OWNER',
    });

    const tampered = `${token.slice(0, -4)}xxxx`;
    expect(await verifySessionJwt(tampered)).toBeNull();
  });

  it('enforces 25/min IP write rate limit and rejects >32KB JSON payloads', async () => {
    resetRateLimitsForTest();
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 25; i++) {
      expect(checkWriteRateLimit('203.0.113.10', t0 + i * 10)).toBeNull();
    }
    const blocked = checkWriteRateLimit('203.0.113.10', t0 + 1_000);
    expect(blocked?.status).toBe(429);
    expect(checkWriteRateLimit('203.0.113.10', t0 + 61_000)).toBeNull();

    const hugeReq = new Request('http://localhost/api/shifts', {
      method: 'POST',
      body: JSON.stringify({ pad: 'a'.repeat(35_000) }),
    });
    const parsed = await parseJsonBody(hugeReq);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.response.status).toBe(413);
  });
});
