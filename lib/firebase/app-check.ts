// ============================================================
// KalaSetu — Firebase App Check (reCAPTCHA v3)
//
// Localhost cannot use reCAPTCHA v3 App Check — use a debug token instead.
// Console setup (monitor → enforce):
// 1. Firebase Console → App Check → register web app with reCAPTCHA v3
// 2. Add production domains to reCAPTCHA allowed domains
// 3. Local dev: Firebase Console → App Check → Manage debug tokens → Add
//    Paste NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN in .env.local, restart dev
// 4. After metrics look good, Enforce in Console + ENFORCE_APP_CHECK=true
// ============================================================
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import type { FirebaseApp } from 'firebase/app';

let initialized = false;
let skipLogged = false;

/** UUID shape used for Firebase App Check debug tokens */
function isDebugToken(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

function configureDebugToken(token: string): void {
  (globalThis as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    token;
}

function logDevSkipOnce(): void {
  if (skipLogged) return;
  skipLogged = true;
  console.info(
    '[App Check] Skipped on localhost. To test locally:\n' +
      '  1. Firebase Console → App Check → Manage debug tokens → Add token\n' +
      '  2. Set NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=<token> in .env.local\n' +
      '  3. Restart npm run dev'
  );
}

function resolveInitMode(): 'production' | 'debug' | 'skip' {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  if (!siteKey) {
    return 'skip';
  }

  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN?.trim();

  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }

  // localhost + dev: reCAPTCHA v3 always 403s without a registered debug token
  if (isLocalhost()) {
    if (debugToken && isDebugToken(debugToken)) {
      return 'debug';
    }
    return 'skip';
  }

  // Dev on a non-localhost host (e.g. LAN IP): allow reCAPTCHA if configured
  return 'production';
}

export function initAppCheck(app: FirebaseApp): void {
  if (typeof window === 'undefined' || initialized) {
    return;
  }

  const mode = resolveInitMode();
  if (mode === 'skip') {
    if (process.env.NODE_ENV === 'development') {
      logDevSkipOnce();
    }
    return;
  }

  if (mode === 'debug') {
    configureDebugToken(process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN!.trim());
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!.trim()),
    isTokenAutoRefreshEnabled: true,
  });

  initialized = true;
}
