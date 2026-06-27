import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { db } from '../config';

export const RATE_LIMITS = {
  placeBid: { max: 20, windowMs: 60_000 },
  paymentCreateOrder: { max: 10, windowMs: 60_000 },
  verifyPayment: { max: 5, windowMs: 60_000 },
  submitArtworkForReview: { max: 5, windowMs: 3_600_000 },
  moderateArtwork: { max: 30, windowMs: 60_000 },
  verifyArtist: { max: 20, windowMs: 60_000 },
  followUser: { max: 30, windowMs: 60_000 },
  unfollowUser: { max: 30, windowMs: 60_000 },
  sendChatMessage: { max: 60, windowMs: 60_000 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

export async function assertRateLimit(
  uid: string,
  action: RateLimitAction
): Promise<void> {
  const { max, windowMs } = RATE_LIMITS[action];
  const ref = db.collection('_rateLimits').doc(`${uid}_${action}`);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) {
      transaction.set(ref, { count: 1, windowStart: now });
      return;
    }

    const data = snap.data() as { count: number; windowStart: number };
    if (now - data.windowStart > windowMs) {
      transaction.set(ref, { count: 1, windowStart: now });
      return;
    }

    if (data.count >= max) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Rate limit exceeded. Please try again later.'
      );
    }

    transaction.update(ref, {
      count: admin.firestore.FieldValue.increment(1),
    });
  });
}
