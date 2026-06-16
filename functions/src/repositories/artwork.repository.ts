import { db } from '../config';
import * as admin from 'firebase-admin';
import type { Artwork } from '../types';

export const artworkRepository = {
  async getArtwork(artworkId: string): Promise<Artwork | null> {
    const snap = await db.collection('artworks').doc(artworkId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Artwork;
  },

  async updateArtwork(artworkId: string, data: Partial<Artwork>): Promise<void> {
    await db.collection('artworks').doc(artworkId).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
};
