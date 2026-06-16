import { db } from '../config';
import * as admin from 'firebase-admin';
import type { User } from '../types';

export const userRepository = {
  async getUser(userId: string): Promise<User | null> {
    const snap = await db.collection('users').doc(userId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as User;
  },

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    await db.collection('users').doc(userId).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
};
