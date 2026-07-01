// Server-only: Firestore via firebase-admin (does not load firebase-admin/auth).
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminApp } from './admin-app';

let adminDb: Firestore | undefined;
let adminDbPromise: Promise<Firestore> | undefined;

export async function getAdminDb(): Promise<Firestore> {
  if (adminDb) return adminDb;

  if (!adminDbPromise) {
    adminDbPromise = (async () => {
      const { getFirestore } = await import('firebase-admin/firestore');
      adminDb = getFirestore(getAdminApp());
      return adminDb;
    })();
  }

  return adminDbPromise;
}
