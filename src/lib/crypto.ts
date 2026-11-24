import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCKOUT_MS = 5 * 60 * 1000;

function deriveKey(secret: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(secret, salt, KEY_LENGTH, { N: 16384, r: 8, p: 1 }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await deriveKey(secret, salt);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifySecret(secret: string, storedHash: string): Promise<boolean> {
  const [salt, hexKey] = storedHash.split(':');
  if (!salt || !hexKey) return false;
  const expected = Buffer.from(hexKey, 'hex');
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await deriveKey(secret, salt);
  return timingSafeEqual(actual, expected);
}

export interface PinAttemptOutcome {
  status: 'OK' | 'INVALID' | 'LOCKED';
  nextFailedCount: number;
  nextLockedUntil: Date | null;
  remainingAttempts: number;
  message?: string;
}

export function evaluatePinAttempt(
  current: { failedCount: number; lockedUntil: Date | null },
  pinMatched: boolean,
  now: Date = new Date(),
): PinAttemptOutcome {
  if (current.lockedUntil && current.lockedUntil.getTime() > now.getTime()) {
    const secondsLeft = Math.ceil((current.lockedUntil.getTime() - now.getTime()) / 1000);
    return {
      status: 'LOCKED',
      nextFailedCount: current.failedCount,
      nextLockedUntil: current.lockedUntil,
      remainingAttempts: 0,
      message: `PIN locked. Try again in ${secondsLeft}s.`,
    };
  }

  if (pinMatched) {
    return {
      status: 'OK',
      nextFailedCount: 0,
      nextLockedUntil: null,
      remainingAttempts: MAX_PIN_ATTEMPTS,
    };
  }

  const baseCount =
    current.lockedUntil && current.lockedUntil.getTime() <= now.getTime() ? 0 : current.failedCount;
  const nextFailedCount = baseCount + 1;

  if (nextFailedCount >= MAX_PIN_ATTEMPTS) {
    const nextLockedUntil = new Date(now.getTime() + PIN_LOCKOUT_MS);
    return {
      status: 'LOCKED',
      nextFailedCount,
      nextLockedUntil,
      remainingAttempts: 0,
      message: 'PIN locked for 5m after 5 failed attempts.',
    };
  }

  const remaining = MAX_PIN_ATTEMPTS - nextFailedCount;
  return {
    status: 'INVALID',
    nextFailedCount,
    nextLockedUntil: null,
    remainingAttempts: remaining,
    message: `Invalid PIN. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
  };
}
