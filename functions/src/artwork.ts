import * as functions from "firebase-functions/v1";


import { artworkRepository } from './repositories/artwork.repository';
import { userRepository } from './repositories/user.repository';

export const onArtworkWritten = functions.firestore
  .document('artworks/{artworkId}')
  .onWrite(async (change, context) => {
    // If the document was deleted, do nothing
    if (!change.after.exists) return;

    const data = change.after.data();
    const prevData = change.before.data();
    const artworkId = context.params.artworkId;

    // Check if status changed to 'published'
    if (data?.status === 'published' && prevData?.status !== 'published') {
      try {
        // Send a notification to followers (simulated)
        // In a real app, you'd fetch followers of data.artistId and create notifications
        console.log(`Artwork ${artworkId} published! Notifying followers...`);
      } catch (error) {
        console.error("Error processing artwork publication", error);
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
  if (userData?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin');
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
