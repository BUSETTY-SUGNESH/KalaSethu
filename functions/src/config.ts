import * as admin from 'firebase-admin';

// Initialize firebase-admin if it hasn't been initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
