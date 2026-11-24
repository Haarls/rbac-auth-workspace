import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

const MAX_AUDITS_PER_SANDBOX = 200;
const MAX_SHIFTS_PER_SANDBOX = 100;

export async function writeAuditLog(entry: {
  sandboxId: string;
  actorId?: string | null;
  actorEmail: string;
  action: string;
  target: string;
  detail: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      sandboxId: entry.sandboxId,
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail,
      action: entry.action,
      target: entry.target,
      detail: entry.detail.slice(0, 200),
    },
  });

  const stale = await prisma.auditLog.findMany({
    where: { sandboxId: entry.sandboxId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: MAX_AUDITS_PER_SANDBOX,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.auditLog.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
  }
}

export async function pruneSandboxShifts(sandboxId: string): Promise<void> {
  const stale = await prisma.shiftLog.findMany({
    where: { sandboxId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: MAX_SHIFTS_PER_SANDBOX,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.shiftLog.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
  }
}
