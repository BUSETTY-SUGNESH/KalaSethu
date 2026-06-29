import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db } from './config';
import { assertAppCheck } from './utils/app-check';
import { assertRateLimit } from './utils/rate-limit';

export const verifyArtist = functions.region('asia-south1').https.onCall(async (data, context) => {
  // Only admins can call this
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'verifyArtist');
  
  // Verify admin status
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  const userData = userDoc.data();
  if (userData?.role !== 'admin' && userData?.role !== 'moderator') {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin or moderator');
  }

  const { targetUserId, isVerified, verificationId } = data;
  if (!targetUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'Target User ID is required');
  }

  try {
    const role = isVerified ? 'verified_artist' : 'artist';
    const status = isVerified ? 'approved' : 'rejected';
    
    await db.collection("users").doc(targetUserId).update({
      role,
      isVerified,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update the verification application document status
    if (verificationId) {
      await db.collection("artistVerifications").doc(verificationId).update({
        status,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        reviewNotes: isVerified ? "Approved via admin console." : "Rejected via admin console."
      });
    } else {
      const verifSnap = await db.collection("artistVerifications")
        .where("artistId", "==", targetUserId)
        .where("status", "==", "pending")
        .limit(1)
        .get();
      if (!verifSnap.empty) {
        await verifSnap.docs[0].ref.update({
          status,
          reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          reviewNotes: isVerified ? "Approved via admin console." : "Rejected via admin console."
        });
      }
    }

    // Notify the user
    await db.collection("users").doc(targetUserId).collection("notifications").add({
      userId: targetUserId,
      title: "Verification Status Updated",
      message: isVerified ? "Congratulations! You are now a Verified Artisan." : "Your verification status has been updated.",
      type: "system",
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (isVerified) {
      try {
        const targetSnap = await db.collection("users").doc(targetUserId).get();
        const targetData = targetSnap.data();
        const { provisionArtistCommunity } = await import('./community-provisioning');
        await provisionArtistCommunity(
          targetUserId,
          targetData?.displayName || 'Artist',
          targetData?.avatarUrl
        );
      } catch (provisionError) {
        console.error('Failed to provision artist community', provisionError);
      }
    }

    return { success: true, role, isVerified };
  } catch (error) {
    console.error("Verification error", error);
    throw new functions.https.HttpsError('internal', 'Failed to update verification status');
  }
});

// A scheduled function to aggregate analytics for the admin dashboard
export const aggregateAnalytics = functions.region('asia-south1').pubsub.schedule('every 24 hours').onRun(async (context) => {
  try {
    const [usersSnap, artworksSnap, ordersSnap] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("artworks").count().get(),
      db.collection("orders").count().get()
    ]);
    
    await db.collection("analytics").doc("platform_stats").set({
      totalUsers: usersSnap.data().count,
      totalArtworks: artworksSnap.data().count,
      totalOrders: ordersSnap.data().count,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log("Successfully aggregated analytics");
  } catch (error) {
    console.error("Error aggregating analytics", error);
  }
  
  return null;
});
