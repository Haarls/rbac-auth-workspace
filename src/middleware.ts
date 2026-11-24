import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionJwt } from './lib/jwt';

const PUBLIC_PATHS = ['/login', '/api/sandbox', '/api/auth/login', '/api/auth/pin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySessionJwt(token) : null;

  if (!claims) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid session token required.' },
        { status: 401 },
      );
    }
    const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const loginUrl = host
      ? new URL('/login', `${proto}://${host}`)
      : new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
