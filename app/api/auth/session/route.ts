import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin-auth';
import { getAdminDb } from '@/lib/firebase/admin-db';
import { sealAuthContext } from '@/lib/auth/session-crypto';
import {
  AUTH_CONTEXT_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  type AuthContextPayload,
} from '@/lib/auth/session-config';

export const runtime = 'nodejs';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_SEC,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body?.idToken;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const expiresInMs = SESSION_MAX_AGE_SEC * 1000;
    const adminAuth = await getAdminAuth();
    const adminDb = await getAdminDb();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: expiresInMs });

    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userSnap.data();

    if (userData?.isBanned === true) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    const role = typeof userData?.role === 'string' ? userData.role : 'user';
    const authPayload: AuthContextPayload = {
      uid: decoded.uid,
      role,
      exp: Date.now() + expiresInMs,
    };

    const sealedAuth = await sealAuthContext(authPayload);
    const response = NextResponse.json({ ok: true, role });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, COOKIE_OPTIONS);
    response.cookies.set(AUTH_CONTEXT_COOKIE_NAME, sealedAuth, COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error('Session creation failed', error);
    return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(AUTH_CONTEXT_COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
