import * as functions from "firebase-functions/v1";
import { db } from './config';

// Cleanup old notifications (e.g., older than 30 days) to save space
export const cleanupOldNotifications = functions.region('asia-south1').pubsub.schedule('every 24 hours').onRun(async (context) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  try {
    let deletedCount = 0;
    let hasMore = true;

    while (hasMore) {
      const oldNotifsSnapshot = await db.collectionGroup('notifications')
        .where('createdAt', '<', thirtyDaysAgo)
        .limit(500)
        .get();

      if (oldNotifsSnapshot.empty) {
        hasMore = false;
        break;
      }

      const batch = db.batch();
      oldNotifsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      await batch.commit();

      if (oldNotifsSnapshot.size < 500) {
        hasMore = false;
      }
    }
    
    console.log(`Successfully cleaned up ${deletedCount} old notifications`);
  } catch (error) {
    console.error("Error cleaning up notifications", error);
  }
  
  return null;
});
