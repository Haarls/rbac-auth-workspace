import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_WRITES_PER_MIN = 25;
export const MAX_PAYLOAD_BYTES = 32_768;

const buckets = new Map<string, number[]>();

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || '127.0.0.1';
}

export function hashClientIp(ip: string): string {
  const secret = process.env.AUTH_SECRET || 'dev-only-rbac-workspace-secret-key-32b!';
  return createHash('sha256').update(`${ip}:${secret}`).digest('hex');
}

export function checkWriteRateLimit(ip: string, now = Date.now()): NextResponse | null {
  const cutoff = now - WINDOW_MS;
  const recent = (buckets.get(ip) ?? []).filter((ts) => ts > cutoff);

  if (recent.length >= MAX_WRITES_PER_MIN) {
    buckets.set(ip, recent);
    return NextResponse.json(
      { error: '429 Too Many Requests: Rate limit exceeded (25/min).' },
      { status: 429 },
    );
  }

  recent.push(now);
  buckets.set(ip, recent);
  if (buckets.size > 2_000) {
    for (const [key, list] of buckets) {
      if (list.every((ts) => ts <= cutoff)) buckets.delete(key);
    }
  }
  return null;
}

export async function parseJsonBody(
  request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  const lenHeader = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(lenHeader) && lenHeader > MAX_PAYLOAD_BYTES) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Payload exceeds 32KB limit.' }, { status: 413 }),
    };
  }

  const raw = await request.text().catch(() => '');
  if (Buffer.byteLength(raw, 'utf8') > MAX_PAYLOAD_BYTES) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Payload exceeds 32KB limit.' }, { status: 413 }),
    };
  }

  try {
    return { ok: true, data: raw ? JSON.parse(raw) : null };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 }),
    };
  }
}

export function resetRateLimitsForTest(): void {
  buckets.clear();
}
