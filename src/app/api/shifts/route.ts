import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiPermission } from '../../../lib/auth';
import { prisma, pruneSandboxShifts, writeAuditLog } from '../../../lib/db';
import { checkWriteRateLimit, extractClientIp, parseJsonBody } from '../../../lib/security';

const CreateShiftSchema = z.object({
  station: z.string().trim().min(2).max(24),
  summary: z.string().trim().min(4).max(200),
  cashDeltaUsd: z.number().finite().min(-100_000).max(100_000),
});

export async function POST(request: NextRequest) {
  const limited = checkWriteRateLimit(extractClientIp(request.headers));
  if (limited) return limited;

  const guard = await requireApiPermission('shift:create', 'POST /api/shifts');
  if (!guard.ok) return guard.response;

  const raw = await parseJsonBody(request);
  if (!raw.ok) return raw.response;

  const parsed = CreateShiftSchema.safeParse(raw.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Station, summary (4-200 chars), and valid cash amount required.' },
      { status: 400 },
    );
  }

  const { sandboxId } = guard.ctx;
  const cashDeltaCents = Math.round(parsed.data.cashDeltaUsd * 100);
  const shift = await prisma.shiftLog.create({
    data: {
      sandboxId,
      station: parsed.data.station.toUpperCase(),
      summary: parsed.data.summary,
      cashDeltaCents,
      authorId: guard.ctx.user.id,
    },
  });

  await pruneSandboxShifts(sandboxId);
  await writeAuditLog({
    sandboxId,
    actorId: guard.ctx.user.id,
    actorEmail: guard.ctx.user.email,
    action: 'SHIFT_RECORDED',
    target: `${shift.station} (${shift.id.slice(0, 8)})`,
    detail: `Logged ${(cashDeltaCents / 100).toFixed(2)} USD — ${shift.summary}`,
  });

  return NextResponse.json({ shift }, { status: 201 });
}
