import { db } from '../config';
import * as admin from 'firebase-admin';

export const notificationRepository = {
  async createNotification(userId: string, data: any): Promise<string> {
    const ref = await db.collection('users').doc(userId).collection('notifications').add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  },
  
  async batchCreateNotification(batch: admin.firestore.WriteBatch, userId: string, data: any): Promise<void> {
    const ref = db.collection('users').doc(userId).collection('notifications').doc();
    batch.set(ref, {
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
};
