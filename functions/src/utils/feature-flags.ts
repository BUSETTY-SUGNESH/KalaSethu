import * as functions from 'firebase-functions/v1';
import { db } from '../config';

const DEFAULT_FLAGS: Record<string, boolean> = {
  maintenance_mode: false,
  enable_auctions: true,
  enable_social_feed: true,
  enable_artwork_uploads: true,
};

let cache: { flags: Record<string, boolean>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

async function loadFeatureFlags(): Promise<Record<string, boolean>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.flags;
  }

  const flags = { ...DEFAULT_FLAGS };
  const snap = await db.collection('featureFlags').get();
  for (const doc of snap.docs) {
    if (doc.id in flags) {
      flags[doc.id] = doc.data().enabled === true;
    }
  }

  cache = { flags, expiresAt: now + CACHE_TTL_MS };
  return flags;
}

export async function assertFeatureEnabled(
  flagId: string,
  disabledMessage?: string
): Promise<void> {
  const flags = await loadFeatureFlags();
  const enabled = flags[flagId] ?? DEFAULT_FLAGS[flagId] ?? true;
  if (!enabled) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      disabledMessage || `Feature "${flagId}" is currently disabled.`
    );
  }
}

export async function assertNotInMaintenance(uid?: string): Promise<void> {
  const flags = await loadFeatureFlags();
  if (!flags.maintenance_mode) {
    return;
  }

  if (uid) {
    const snap = await db.collection('users').doc(uid).get();
    const role = snap.data()?.role;
    if (role === 'admin') {
      return;
    }
  }

  throw new functions.https.HttpsError(
    'failed-precondition',
    'The platform is in maintenance mode. Please try again later.'
  );
}
