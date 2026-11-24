import { PrismaClient } from '@prisma/client';
import { hashSecret } from '../src/lib/crypto';
import { DEMO_ACCOUNTS } from '../src/lib/demo-accounts';

const prisma = new PrismaClient();

async function main() {
  const usersByEmail = new Map<string, string>();

  for (const acct of DEMO_ACCOUNTS) {
    const passwordHash = await hashSecret(acct.password);
    const pinHash = await hashSecret(acct.pin);

    const user = await prisma.user.upsert({
      where: { email: acct.email },
      update: {
        name: acct.name,
        passwordHash,
        pinHash,
        role: acct.role,
        pinFailedCount: 0,
        pinLockedUntil: null,
      },
      create: {
        name: acct.name,
        email: acct.email,
        passwordHash,
        pinHash,
        role: acct.role,
      },
    });
    usersByEmail.set(acct.email, user.id);
  }

  const ownerId = usersByEmail.get('owner@demo.dev')!;
  const managerId = usersByEmail.get('manager@demo.dev')!;
  const staffId = usersByEmail.get('staff@demo.dev')!;

  const shiftCount = await prisma.shiftLog.count();
  if (shiftCount === 0) {
    await prisma.shiftLog.createMany({
      data: [
        {
          station: 'REG-01',
          summary: 'Morning drawer float verified',
          cashDeltaCents: 25000,
          status: 'VERIFIED',
          authorId: staffId,
        },
        {
          station: 'WAREHOUSE-A',
          summary: 'Freight carrier COD settlement #4812',
          cashDeltaCents: -8450,
          status: 'VERIFIED',
          authorId: managerId,
        },
        {
          station: 'REG-02',
          summary: 'Afternoon shift register handoff',
          cashDeltaCents: 61240,
          status: 'OPEN',
          authorId: staffId,
        },
      ],
    });
  }

  const auditCount = await prisma.auditLog.count();
  if (auditCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        {
          actorId: ownerId,
          actorEmail: 'owner@demo.dev',
          action: 'USER_CREATED',
          target: 'manager@demo.dev',
          detail: 'Provisioned initial MANAGER operator with station PIN',
        },
        {
          actorId: ownerId,
          actorEmail: 'owner@demo.dev',
          action: 'USER_CREATED',
          target: 'staff@demo.dev',
          detail: 'Provisioned initial STAFF operator with station PIN',
        },
        {
          actorId: staffId,
          actorEmail: 'staff@demo.dev',
          action: 'ACCESS_DENIED_403',
          target: 'GET /api/users',
          detail: "Role STAFF lacks 'team:read' (MANAGER required)",
        },
        {
          actorId: managerId,
          actorEmail: 'manager@demo.dev',
          action: 'AUTH_PIN_SWITCH',
          target: 'session:seed-init',
          detail: 'Operator switched from staff@demo.dev to manager@demo.dev (MANAGER)',
        },
      ],
    });
  }

  console.log('Seed completed: owner@demo.dev (1042), manager@demo.dev (2084), staff@demo.dev (3096)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
