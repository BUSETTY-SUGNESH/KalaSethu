import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Cleanup old notifications (e.g., older than 30 days) to save space
export const cleanupOldNotifications = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  try {
    // This requires a group collection query or looping through users
    const usersSnapshot = await db.collection("users").get();
    
    let deletedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const oldNotifsSnapshot = await db.collection(`users/${userDoc.id}/notifications`)
        .where("createdAt", "<", thirtyDaysAgo)
        .get();
        
      if (!oldNotifsSnapshot.empty) {
        const batch = db.batch();
        oldNotifsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          deletedCount++;
        });
        await batch.commit();
      }
    }
    
    console.log(`Successfully cleaned up ${deletedCount} old notifications`);
  } catch (error) {
    console.error("Error cleaning up notifications", error);
  }
  
  return null;
});
