import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const verifyArtist = functions.https.onCall(async (data, context) => {
  // Only admins can call this
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  // Verify admin status
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  const userData = userDoc.data();
  if (userData?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin');
  }

  const { targetUserId, isVerified } = data;
  if (!targetUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'Target User ID is required');
  }

  try {
    const role = isVerified ? 'verified_artist' : 'artist';
    
    await db.collection("users").doc(targetUserId).update({
      role,
      isVerified,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Notify the user
    await db.collection("users").doc(targetUserId).collection("notifications").add({
      userId: targetUserId,
      title: "Verification Status Updated",
      message: isVerified ? "Congratulations! You are now a Verified Artisan." : "Your verification status has been updated.",
      type: "system",
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, role, isVerified };
  } catch (error) {
    console.error("Verification error", error);
    throw new functions.https.HttpsError('internal', 'Failed to update verification status');
  }
});

// A scheduled function to aggregate analytics for the admin dashboard
export const aggregateAnalytics = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
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
