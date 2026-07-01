// Server-only: Auth via firebase-admin (loads jwks-rsa; use only in Node.js API routes).
import type { Auth } from 'firebase-admin/auth';
import { getAdminApp } from './admin-app';

let adminAuth: Auth | undefined;
let adminAuthPromise: Promise<Auth> | undefined;

export async function getAdminAuth(): Promise<Auth> {
  if (adminAuth) return adminAuth;

  if (!adminAuthPromise) {
    adminAuthPromise = (async () => {
      const { getAuth } = await import('firebase-admin/auth');
      adminAuth = getAuth(getAdminApp());
      return adminAuth;
    })();
  }

  return adminAuthPromise;
}
