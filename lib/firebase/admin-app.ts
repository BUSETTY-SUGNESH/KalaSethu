// Server-only: shared Firebase Admin app initialization (no auth/firestore imports).
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';

let adminApp: App | undefined;

export function getAdminApp(): App {
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
