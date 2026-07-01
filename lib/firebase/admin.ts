// ============================================================
// KalaSetu — Firebase Admin SDK (Server-side only)
// ============================================================
// Used in Next.js API routes and server components only.
// NEVER import this file in client components.

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App | undefined;

function ensureAdminApp(): App {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials are not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.'
    );
  }

  adminApp =
    getApps().length > 0
      ? getApps()[0]!
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });

  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(ensureAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(ensureAdminApp());
}

function bindProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = getInstance();
      const value = Reflect.get(instance, prop, instance);
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
    },
  });
}

/** @deprecated Prefer getAdminAuth() for explicit lazy initialization */
export const adminAuth = bindProxy(getAdminAuth);

/** @deprecated Prefer getAdminDb() for explicit lazy initialization */
export const adminDb = bindProxy(getAdminDb);

export { ensureAdminApp as getAdminApp };
