import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function writeAuditLog(entry: {
  actorId?: string | null;
  actorEmail: string;
  action: string;
  target: string;
  detail: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail,
      action: entry.action,
      target: entry.target,
      detail: entry.detail,
    },
  });
}
