// Server-only module — do not import from client components.

import { getAdminDb } from '@/lib/firebase/admin-db';
import {
  DEFAULT_FEATURE_FLAG_STATE,
  type FeatureFlagId,
} from '@/lib/feature-flags/constants';

const CACHE_TTL_MS = 30_000;

let cache: { flags: Record<FeatureFlagId, boolean>; expiresAt: number } | null = null;

export async function getFeatureFlagsServer(): Promise<Record<FeatureFlagId, boolean>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.flags;
  }

  const flags = { ...DEFAULT_FEATURE_FLAG_STATE };

  try {
    const db = await getAdminDb();
    const snap = await db.collection('featureFlags').get();
    for (const doc of snap.docs) {
      const id = doc.id as FeatureFlagId;
      if (id in flags) {
        flags[id] = doc.data().enabled === true;
      }
    }
  } catch (error) {
    console.error('Failed to load feature flags from Firestore', error);
  }

  cache = { flags, expiresAt: now + CACHE_TTL_MS };
  return flags;
}

export function invalidateFeatureFlagsCache(): void {
  cache = null;
}

export async function isFeatureEnabledServer(flagId: FeatureFlagId): Promise<boolean> {
  const flags = await getFeatureFlagsServer();
  return flags[flagId] ?? DEFAULT_FEATURE_FLAG_STATE[flagId];
}
