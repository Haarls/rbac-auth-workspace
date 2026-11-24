import { NextResponse, type NextRequest } from 'next/server';
import { ensureSandbox } from '../../../lib/sandbox';
import { checkWriteRateLimit, extractClientIp } from '../../../lib/security';

export async function POST(request: NextRequest) {
  const ip = extractClientIp(request.headers);
  const limited = checkWriteRateLimit(ip);
  if (limited) return limited;

  const res = await ensureSandbox(ip);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ sandboxId: res.sandboxId, expiresAt: res.expiresAt });
}
