import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

import { artworkRepository } from './repositories/artwork.repository';
import { userRepository } from './repositories/user.repository';

export const onArtworkWritten = functions.firestore
  .document('artworks/{artworkId}')
  .onWrite(async (change, context) => {
    const artworkId = context.params.artworkId;
    const prevData = change.before.data();
    const data = change.after.data();

    // 1. Handle deletion / stats update
    if (!change.after.exists) {
      if (prevData?.status === 'published' && prevData?.artistId) {
        try {
          await admin.firestore().collection("users").doc(prevData.artistId).update({
            artworkCount: admin.firestore.FieldValue.increment(-1)
          });
          console.log(`Decremented artworkCount for artist: ${prevData.artistId}`);
        } catch (error) {
          console.error("Error decrementing artworkCount on delete", error);
        }
      }
      return;
    }

    // 2. Handle status change / stats update
    const statusBefore = prevData?.status || 'draft';
    const statusAfter = data?.status || 'draft';
    const artistId = data?.artistId;

    if (artistId) {
      if (statusBefore !== 'published' && statusAfter === 'published') {
        try {
          await admin.firestore().collection("users").doc(artistId).update({
            artworkCount: admin.firestore.FieldValue.increment(1)
          });
          console.log(`Incremented artworkCount for artist: ${artistId}`);
        } catch (error) {
          console.error("Error incrementing artworkCount", error);
        }
      } else if (statusBefore === 'published' && statusAfter !== 'published') {
        try {
          await admin.firestore().collection("users").doc(artistId).update({
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
        // We can fetch followers and write notifications
        if (artistId) {
          const followersSnap = await admin.firestore().collection("users").doc(artistId).collection("followers").get();
          const batch = admin.firestore().batch();
          
          followersSnap.docs.forEach(doc => {
            const followerId = doc.id;
            const notifRef = admin.firestore().collection("users").doc(followerId).collection("notifications").doc();
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
          
          await batch.commit();
        }
      } catch (error) {
        console.error("Error processing artwork publication notifications", error);
      }
    }
  });

export const moderateArtwork = functions.https.onCall(async (data, context) => {
  // Only admins can call this
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
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
    
    await artworkRepository.updateArtwork(artworkId, {
      status,
      moderationReason: reason || null,
    });

    return { success: true, status };
  } catch (error) {
    console.error("Moderation error", error);
    throw new functions.https.HttpsError('internal', 'Failed to moderate artwork');
  }
});
