import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register', '/register-school', '/forgot-password', '/setup'];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Never gate Next.js API routes — they handle their own auth
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(path)) {
    return NextResponse.next();
  }

  // Token check - auth handled by Python FastAPI backend
  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
