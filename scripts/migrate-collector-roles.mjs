/**
 * One-time migration: role "collector" → "user"
 *
 * Requires Firebase Admin credentials via env:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 *
 * Usage:
 *   node scripts/migrate-collector-roles.mjs
 *   node scripts/migrate-collector-roles.mjs --dry-run
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const dryRun = process.argv.includes('--dry-run');

function initAdmin() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      'Missing Firebase Admin env vars. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.'
    );
    process.exit(1);
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

async function main() {
  initAdmin();
  const db = getFirestore();

  const snapshot = await db.collection('users').where('role', '==', 'collector').get();

  if (snapshot.empty) {
    console.log('No users with role "collector" found.');
    return;
  }

  console.log(`Found ${snapshot.size} user(s) with role "collector".`);

  if (dryRun) {
    snapshot.docs.forEach((doc) => console.log(`  [dry-run] would update ${doc.id}`));
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      role: 'user',
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`Updated ${snapshot.size} user(s) to role "user".`);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
