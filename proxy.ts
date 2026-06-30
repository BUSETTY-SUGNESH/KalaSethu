import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { openAuthContext } from '@/lib/auth/session-crypto';
import { AUTH_CONTEXT_COOKIE_NAME } from '@/lib/auth/session-config';
import {
  DEFAULT_FEATURE_FLAG_STATE,
  FEATURE_FLAGS,
  FEATURE_FLAG_ROUTE_BLOCKS,
  MAINTENANCE_ALLOWED_PATHS,
  type FeatureFlagId,
} from '@/lib/feature-flags/constants';

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

function isPathAllowed(pathname: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(pathname));
}

async function loadFeatureFlags(request: NextRequest): Promise<Record<FeatureFlagId, boolean>> {
  const secret = process.env.MIDDLEWARE_SECRET;
  if (!secret) {
    return { ...DEFAULT_FEATURE_FLAG_STATE };
  }

  try {
    const url = new URL('/api/internal/feature-flags', request.url);
    const response = await fetch(url, {
      headers: { 'x-middleware-secret': secret },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { ...DEFAULT_FEATURE_FLAG_STATE };
    }

    return { ...DEFAULT_FEATURE_FLAG_STATE, ...(await response.json()) };
  } catch {
    return { ...DEFAULT_FEATURE_FLAG_STATE };
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authContext = await openAuthContext(
    request.cookies.get(AUTH_CONTEXT_COOKIE_NAME)?.value
  );
  const isAdmin = authContext?.role === 'admin';

  if (pathname.startsWith('/admin')) {
    if (!authContext) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    if (!isAdmin) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
  }

  const flags = await loadFeatureFlags(request);

  if (flags[FEATURE_FLAGS.MAINTENANCE_MODE] && !isAdmin) {
    const allowedDuringMaintenance = isPathAllowed(pathname, MAINTENANCE_ALLOWED_PATHS);
    if (!allowedDuringMaintenance) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/maintenance', request.url)));
    }
  }

  for (const block of FEATURE_FLAG_ROUTE_BLOCKS) {
    if (flags[block.flag] === false && isPathAllowed(pathname, block.patterns)) {
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('feature_disabled', block.flag);
      return applySecurityHeaders(NextResponse.redirect(redirectUrl));
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
