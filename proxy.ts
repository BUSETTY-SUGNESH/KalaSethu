import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // We handle primary authentication in AuthGuard on the client side 
  // since Firebase Auth is mostly client-side for this architecture.
  // This middleware is just a lightweight redirect for obvious cases if we have a session cookie.
  
  // Basic security headers
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Note: For a full production Firebase app with SSR, we would use firebase-admin
  // to verify session cookies here. For this CSR/SPA hybrid, we rely on the 
  // <AuthGuard> component for route protection, but we enforce headers here.

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
