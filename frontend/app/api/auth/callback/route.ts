import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/callback
 * Receives token + role from login page, sets cookie server-side (via Set-Cookie header),
 * then redirects to the role dashboard. This guarantees the cookie is present in the
 * very next request so Next.js middleware never blocks it.
 */
export async function POST(req: NextRequest) {
  const { token, role } = await req.json();

  if (!token || !role) {
    return NextResponse.json({ error: 'Missing token or role' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set('auth_token', token, {
    path: '/',
    maxAge: 86400,
    sameSite: 'lax',
    httpOnly: false, // must be readable by client JS too
  });
  return response;
}
