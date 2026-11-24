import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiPermission } from '../../../lib/auth';
import { hashSecret } from '../../../lib/crypto';
import { prisma, writeAuditLog } from '../../../lib/db';
import { MAX_USERS_PER_SANDBOX } from '../../../lib/sandbox';
import { checkWriteRateLimit, extractClientIp, parseJsonBody } from '../../../lib/security';

const CreateUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().max(100).email().transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(64),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF']),
  pin: z.string().trim().regex(/^\d{4,6}$/).optional(),
});

export async function GET() {
  const guard = await requireApiPermission('team:read', 'GET /api/users');
  if (!guard.ok) return guard.response;

  const users = await prisma.user.findMany({
    where: { sandboxId: guard.ctx.sandboxId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      pinHash: true,
      pinLockedUntil: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      hasPin: Boolean(u.pinHash),
      pinLockedUntil: u.pinLockedUntil?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const limited = checkWriteRateLimit(extractClientIp(request.headers));
  if (limited) return limited;

  const guard = await requireApiPermission('team:manage', 'POST /api/users');
  if (!guard.ok) return guard.response;

  const raw = await parseJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = CreateUserSchema.safeParse(raw.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload: name, valid email, 8-64 char password, and valid role required.' },
      { status: 400 },
    );
  }

  const { sandboxId } = guard.ctx;
  const userCount = await prisma.user.count({ where: { sandboxId } });
  if (userCount >= MAX_USERS_PER_SANDBOX) {
    return NextResponse.json(
      { error: `Sandbox limit reached (max ${MAX_USERS_PER_SANDBOX} operators).` },
      { status: 429 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { sandboxId_email: { sandboxId, email: parsed.data.email } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Email is already registered in this sandbox.' }, { status: 409 });
  }

  const passwordHash = await hashSecret(parsed.data.password);
  const pinHash = parsed.data.pin ? await hashSecret(parsed.data.pin) : null;

  const created = await prisma.user.create({
    data: {
      sandboxId,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      pinHash,
      role: parsed.data.role,
    },
  });

  await writeAuditLog({
    sandboxId,
    actorId: guard.ctx.user.id,
    actorEmail: guard.ctx.user.email,
    action: 'USER_CREATED',
    target: created.email,
    detail: `Created operator with role ${created.role}${pinHash ? ' and PIN' : ''}`,
  });

  return NextResponse.json(
    { user: { id: created.id, email: created.email, name: created.name, role: created.role } },
    { status: 201 },
  );
}
