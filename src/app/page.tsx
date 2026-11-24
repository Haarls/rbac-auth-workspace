import { redirect } from 'next/navigation';
import { WorkspaceShell } from '../components/workspace-shell';
import { getActiveSession } from '../lib/auth';
import { prisma } from '../lib/db';
import { hasPermission } from '../lib/permissions';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage() {
  const ctx = await getActiveSession();
  if (!ctx) redirect('/login');

  const now = new Date();
  const canReadTeam = hasPermission(ctx.user.role, 'team:read');
  const canRevoke = hasPermission(ctx.user.role, 'session:revoke');
  const canReadAudit = hasPermission(ctx.user.role, 'audit:read');

  const [pinUsers, shiftRows, teamRows, sessionRows, auditRows] = await Promise.all([
    prisma.user.findMany({
      where: { pinHash: { not: null } },
      orderBy: { name: 'asc' },
      select: { email: true, name: true, role: true },
    }),
    prisma.shiftLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { author: { select: { email: true } } },
    }),
    canReadTeam
      ? prisma.user.findMany({
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            pinHash: true,
            pinLockedUntil: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    canRevoke
      ? prisma.session.findMany({
          where: { revokedAt: null, expiresAt: { gt: now } },
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { user: { select: { email: true, role: true } } },
        })
      : Promise.resolve([]),
    canReadAudit
      ? prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 80 })
      : Promise.resolve([]),
  ]);

  return (
    <WorkspaceShell
      currentUser={{
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
        authMethod: ctx.method,
      }}
      pinOperators={pinUsers}
      shifts={shiftRows.map((s) => ({
        id: s.id,
        station: s.station,
        summary: s.summary,
        cashDeltaCents: s.cashDeltaCents,
        status: s.status,
        authorEmail: s.author.email,
        createdAt: s.createdAt.toISOString(),
      }))}
      members={teamRows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        hasPin: Boolean(u.pinHash),
        pinLocked: Boolean(u.pinLockedUntil && u.pinLockedUntil > now),
        createdAt: u.createdAt.toISOString(),
      }))}
      sessions={sessionRows.map((s) => ({
        id: s.id,
        userEmail: s.user.email,
        userRole: s.user.role,
        method: s.method,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isCurrent: s.id === ctx.sessionId,
      }))}
      audits={auditRows.map((a) => ({
        id: a.id,
        actorEmail: a.actorEmail,
        action: a.action,
        target: a.target,
        detail: a.detail,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
