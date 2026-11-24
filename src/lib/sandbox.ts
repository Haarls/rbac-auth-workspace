import { cookies } from 'next/headers';
import { hashSecret } from './crypto';
import { prisma } from './db';
import { DEMO_ACCOUNTS } from './demo-accounts';
import { SANDBOX_COOKIE, SESSION_TTL_SECONDS } from './jwt';
import { hashClientIp } from './security';

export const MAX_USERS_PER_SANDBOX = 15;
const MAX_SANDBOXES_PER_IP_HOUR = 3;
const MAX_ACTIVE_SANDBOXES = 150;
const HOUR_MS = 60 * 60 * 1000;

type DemoHashEntry = { email: string; name: string; role: 'OWNER' | 'MANAGER' | 'STAFF'; passwordHash: string; pinHash: string };
let cachedDemoHashes: Promise<DemoHashEntry[]> | null = null;

function getDemoHashes(): Promise<DemoHashEntry[]> {
  if (!cachedDemoHashes) {
    cachedDemoHashes = Promise.all(
      DEMO_ACCOUNTS.map(async (acct) => ({
        email: acct.email,
        name: acct.name,
        role: acct.role,
        passwordHash: await hashSecret(acct.password),
        pinHash: await hashSecret(acct.pin),
      })),
    );
  }
  return cachedDemoHashes;
}

export async function seedSandboxData(sandboxId: string): Promise<void> {
  const accounts = await getDemoHashes();
  const ids = new Map<string, string>();

  for (const acct of accounts) {
    const user = await prisma.user.create({
      data: {
        sandboxId,
        name: acct.name,
        email: acct.email,
        passwordHash: acct.passwordHash,
        pinHash: acct.pinHash,
        role: acct.role,
      },
    });
    ids.set(acct.email, user.id);
  }

  const ownerId = ids.get('owner@demo.dev')!;
  const managerId = ids.get('manager@demo.dev')!;
  const staffId = ids.get('staff@demo.dev')!;

  await prisma.shiftLog.createMany({
    data: [
      { sandboxId, station: 'REG-01', summary: 'Morning drawer float verified', cashDeltaCents: 25000, status: 'VERIFIED', authorId: staffId },
      { sandboxId, station: 'WAREHOUSE-A', summary: 'Freight carrier COD settlement #4812', cashDeltaCents: -8450, status: 'VERIFIED', authorId: managerId },
      { sandboxId, station: 'REG-02', summary: 'Afternoon shift register handoff', cashDeltaCents: 61240, status: 'OPEN', authorId: staffId },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { sandboxId, actorId: ownerId, actorEmail: 'owner@demo.dev', action: 'USER_CREATED', target: 'manager@demo.dev', detail: 'Provisioned initial MANAGER operator with station PIN' },
      { sandboxId, actorId: ownerId, actorEmail: 'owner@demo.dev', action: 'USER_CREATED', target: 'staff@demo.dev', detail: 'Provisioned initial STAFF operator with station PIN' },
      { sandboxId, actorId: staffId, actorEmail: 'staff@demo.dev', action: 'ACCESS_DENIED_403', target: 'GET /api/users', detail: "Role STAFF lacks 'team:read' (MANAGER required)" },
      { sandboxId, actorId: managerId, actorEmail: 'manager@demo.dev', action: 'AUTH_PIN_SWITCH', target: 'session:seed-init', detail: 'Operator switched from staff@demo.dev to manager@demo.dev (MANAGER)' },
    ],
  });
}

export async function ensureSandbox(
  clientIp: string,
): Promise<{ ok: true; sandboxId: string; expiresAt: string } | { ok: false; status: number; error: string }> {
  const now = new Date();
  const cookieStore = await cookies();
  const existingId = cookieStore.get(SANDBOX_COOKIE)?.value;

  if (existingId) {
    const existing = await prisma.sandbox.findFirst({
      where: { id: existingId, expiresAt: { gt: now } },
      select: { id: true, expiresAt: true },
    });
    if (existing) {
      return { ok: true, sandboxId: existing.id, expiresAt: existing.expiresAt.toISOString() };
    }
  }

  await prisma.sandbox.deleteMany({ where: { expiresAt: { lt: now } } });

  const ipHash = hashClientIp(clientIp);
  const [recentByIp, activeTotal] = await Promise.all([
    prisma.sandbox.count({
      where: { ipHash, createdAt: { gte: new Date(now.getTime() - HOUR_MS) } },
    }),
    prisma.sandbox.count({ where: { expiresAt: { gt: now } } }),
  ]);

  if (recentByIp >= MAX_SANDBOXES_PER_IP_HOUR) {
    return { ok: false, status: 429, error: 'Too many sandboxes created from this IP (max 3/hour).' };
  }
  if (activeTotal >= MAX_ACTIVE_SANDBOXES) {
    return { ok: false, status: 429, error: 'Global active sandbox limit reached. Try again later.' };
  }

  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  const sandbox = await prisma.sandbox.create({ data: { ipHash, expiresAt } });
  await seedSandboxData(sandbox.id);

  cookieStore.set(SANDBOX_COOKIE, sandbox.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  return { ok: true, sandboxId: sandbox.id, expiresAt: expiresAt.toISOString() };
}
