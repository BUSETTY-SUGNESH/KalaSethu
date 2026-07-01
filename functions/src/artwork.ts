import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

import { db } from './config';
import { artworkRepository } from './repositories/artwork.repository';
import { userRepository } from './repositories/user.repository';
import { assertAppCheck } from './utils/app-check';
import { assertRateLimit } from './utils/rate-limit';
import { assertFeatureEnabled, assertNotInMaintenance } from './utils/feature-flags';
import { ChunkedBatchWriter } from './utils/batch-commit';
import { FIRESTORE_TRIGGER_REGION } from './constants/regions';
import { postArtistCommunityAnnouncement } from './utils/community-announcements';

function isKeywordMaintenanceWrite(
  prevData: admin.firestore.DocumentData | undefined,
  data: admin.firestore.DocumentData | undefined
): boolean {
  if (!prevData || !data) return false;
  return (
    (prevData.title || '') === (data.title || '') &&
    (prevData.category || '') === (data.category || '') &&
    prevData.status === data.status &&
    prevData.artistId === data.artistId
  );
}

export const onArtworkWritten = functions.region(FIRESTORE_TRIGGER_REGION).firestore
  .document('artworks/{artworkId}')
  .onWrite(async (change, context) => {
    const artworkId = context.params.artworkId;
    const prevData = change.before.data();
    const data = change.after.data();

    // 1. Handle deletion / stats update
    if (!change.after.exists) {
      if (prevData?.status === 'published' && prevData?.artistId) {
        try {
          await db.collection("users").doc(prevData.artistId).update({
            artworkCount: admin.firestore.FieldValue.increment(-1)
          });
          console.log(`Decremented artworkCount for artist: ${prevData.artistId}`);
        } catch (error) {
          console.error("Error decrementing artworkCount on delete", error);
        }
      }
      return;
    }

    // Skip re-processing when only searchKeywords/updatedAt changed (keyword echo write)
    if (change.before.exists && isKeywordMaintenanceWrite(prevData, data)) {
      return;
    }

    // 2. Handle status change / stats update
    const statusBefore = prevData?.status || 'draft';
    const statusAfter = data?.status || 'draft';
    const artistId = data?.artistId;

    if (artistId) {
      if (statusBefore !== 'published' && statusAfter === 'published') {
        try {
          await db.collection("users").doc(artistId).update({
            artworkCount: admin.firestore.FieldValue.increment(1)
          });
          console.log(`Incremented artworkCount for artist: ${artistId}`);
        } catch (error) {
          console.error("Error incrementing artworkCount", error);
        }
      } else if (statusBefore === 'published' && statusAfter !== 'published') {
        try {
          await db.collection("users").doc(artistId).update({
            artworkCount: admin.firestore.FieldValue.increment(-1)
          });
          console.log(`Decremented artworkCount for artist: ${artistId}`);
        } catch (error) {
          console.error("Error decrementing artworkCount", error);
        }
      }
    }

    // 3. Generate Search Keywords (avoid infinite loops)
    const titleBefore = prevData?.title || '';
    const titleAfter = data?.title || '';
    const catBefore = prevData?.category || '';
    const catAfter = data?.category || '';

    const keywordsNeedUpdate = !data?.searchKeywords || titleBefore !== titleAfter || catBefore !== catAfter;

    if (keywordsNeedUpdate) {
      const words = `${titleAfter} ${catAfter}`.toLowerCase()
        .replace(/[^\w\s]/g, '') // remove punctuation
        .split(/\s+/) // split by spaces
        .filter(w => w.length > 2); // only words of length > 2
      const uniqueKeywords = Array.from(new Set(words));

      const currentKeywords = data?.searchKeywords || [];
      const hasChanged = uniqueKeywords.length !== currentKeywords.length || !uniqueKeywords.every(val => currentKeywords.includes(val));

      if (hasChanged) {
        try {
          await change.after.ref.update({
            searchKeywords: uniqueKeywords,
          });
          console.log(`Generated search keywords for artwork: ${artworkId}`);
        } catch (error) {
          console.error("Error updating searchKeywords", error);
        }
      }
    }

    // 4. Notify followers on publish
    if (statusAfter === 'published' && statusBefore !== 'published') {
      try {
        console.log(`Artwork ${artworkId} published! Notifying followers...`);
        if (artistId) {
          const followersSnap = await db.collection("users").doc(artistId).collection("followers").get();
          const writer = new ChunkedBatchWriter();

          for (const doc of followersSnap.docs) {
            const followerId = doc.id;
            writer.write((batch) => {
              const notifRef = db.collection("users").doc(followerId).collection("notifications").doc();
              batch.set(notifRef, {
                userId: followerId,
                title: "New Artwork Uploaded",
                message: `${data.artistName || "An artist"} has uploaded a new artwork: "${data.title}"`,
                type: "system",
                isRead: false,
                actionUrl: `/artwork/${artworkId}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              });
            });
            await writer.flushIfNeeded();
          }

          await writer.commit();
        }
      } catch (error) {
        console.error("Error processing artwork publication notifications", error);
      }

      try {
        await postArtistCommunityAnnouncement(db, artistId, {
          event: 'artwork_published',
          title: data?.title || 'New artwork',
          body: `${data?.artistName || 'An artist'} published a new artwork: "${data?.title || 'Untitled'}"`,
          actionUrl: `/artwork/${artworkId}`,
          artworkId,
        });
      } catch (error) {
        console.error('Error posting community artwork announcement', error);
      }
    }
  });

export const submitArtworkForReview = functions.region('asia-south1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'submitArtworkForReview');
  await assertNotInMaintenance(context.auth.uid);
  await assertFeatureEnabled('enable_artwork_uploads', 'Artwork uploads are currently disabled.');

  const { artworkId } = data;
  if (!artworkId || typeof artworkId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing artworkId');
  }

  const artwork = await artworkRepository.getArtwork(artworkId);
  if (!artwork) {
    throw new functions.https.HttpsError('not-found', 'Artwork not found');
  }

  if (artwork.artistId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not the artwork owner');
  }

  if (!['draft', 'pending'].includes(artwork.status)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Artwork must be in draft or pending status to submit'
    );
  }

  const userData = await userRepository.getUser(context.auth.uid);
  const isVerified =
    userData?.role === 'verified_artist'
    || userData?.role === 'admin'
    || userData?.isVerified === true;

  const status = isVerified ? 'published' : 'pending';
  const updates: Record<string, unknown> = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (status === 'published') {
    updates.publishedAt = admin.firestore.FieldValue.serverTimestamp();
  }

  try {
    await artworkRepository.updateArtwork(artworkId, updates);
    return { success: true, status };
  } catch (error) {
    console.error('Submit artwork error', error);
    throw new functions.https.HttpsError('internal', 'Failed to submit artwork');
  }
});

export const moderateArtwork = functions.region('asia-south1').https.onCall(async (data, context) => {
  // Only admins can call this
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'moderateArtwork');

  // Verify admin status (simplified)
  const userData = await userRepository.getUser(context.auth.uid);
  if (userData?.role !== 'admin' && userData?.role !== 'moderator') {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin or moderator');
  }

  const { artworkId, action, reason } = data;
  if (!artworkId || !action) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
  }

  try {
    const status = action === 'approve' ? 'published' : 'rejected';
    const updates: Record<string, unknown> = {
      status,
      moderationReason: reason || null,
    };

    if (status === 'published') {
      updates.publishedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await artworkRepository.updateArtwork(artworkId, updates);

    return { success: true, status };
  } catch (error) {
    console.error("Moderation error", error);
    throw new functions.https.HttpsError('internal', 'Failed to moderate artwork');
  }
});
