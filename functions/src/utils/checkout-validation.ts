import * as ff from 'firebase-functions/v1';
import { db } from '../config';

export interface ClientOrderItem {
  artworkId: string;
  artistId?: string;
  artistName?: string;
  artworkTitle?: string;
  artworkImageUrl?: string;
  quantity?: number;
  price?: number;
}

export interface ValidatedOrderItem {
  artworkId: string;
  artworkTitle: string;
  price: number;
  artistId: string;
  artistName: string;
  artworkImageUrl: string;
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export async function validateCheckoutItems(
  clientItems: ClientOrderItem[]
): Promise<ValidatedOrderItem[]> {
  if (clientItems.length === 0) {
    throw new ff.https.HttpsError('invalid-argument', 'Order must contain at least one item');
  }

  const artworkIds = [...new Set(clientItems.map((item) => item.artworkId).filter(Boolean))];
  if (artworkIds.length !== clientItems.length) {
    throw new ff.https.HttpsError('invalid-argument', 'Each order item must have a unique artworkId');
  }

  const artworkRefs = artworkIds.map((id) => db.collection('artworks').doc(id));
  const artworkSnaps = await db.getAll(...artworkRefs);

  const validatedItems: ValidatedOrderItem[] = [];

  for (let i = 0; i < artworkIds.length; i++) {
    const clientItem = clientItems.find((item) => item.artworkId === artworkIds[i]);
    const artworkSnap = artworkSnaps[i];

    if (!clientItem) {
      throw new ff.https.HttpsError('invalid-argument', 'Mismatched order items');
    }
    if (!artworkSnap.exists) {
      throw new ff.https.HttpsError('not-found', `Artwork ${artworkIds[i]} not found`);
    }

    const artwork = artworkSnap.data()!;
    const serverArtistId = artwork.artistId as string | undefined;
    const clientArtistId = clientItem.artistId;

    if (!serverArtistId) {
      throw new ff.https.HttpsError('failed-precondition', `Artwork ${artworkIds[i]} has no artist`);
    }
    if (clientArtistId && clientArtistId !== serverArtistId) {
      throw new ff.https.HttpsError('invalid-argument', `Artist mismatch for artwork ${artworkIds[i]}`);
    }
    if (artwork.status !== 'published') {
      throw new ff.https.HttpsError('failed-precondition', `Artwork ${artworkIds[i]} is not available for purchase`);
    }
    if (artwork.listingType !== 'fixed_price') {
      throw new ff.https.HttpsError('failed-precondition', `Artwork ${artworkIds[i]} is not listed for fixed-price sale`);
    }
    if (typeof artwork.price !== 'number' || artwork.price <= 0) {
      throw new ff.https.HttpsError('failed-precondition', `Artwork ${artworkIds[i]} has an invalid price`);
    }

    const quantity = clientItem.quantity || 1;
    if (quantity !== 1) {
      throw new ff.https.HttpsError('invalid-argument', 'Quantity must be 1 for artwork purchases');
    }

    validatedItems.push({
      artworkId: artworkIds[i],
      artworkTitle: (artwork.title as string) || clientItem.artworkTitle || 'Artwork',
      price: artwork.price as number,
      artistId: serverArtistId,
      artistName: (artwork.artistName as string) || clientItem.artistName || 'Unknown Artist',
      artworkImageUrl: (artwork.thumbnailUrl as string) || clientItem.artworkImageUrl || '',
      quantity,
    });
  }

  return validatedItems;
}

export function computeServerTotalPaise(items: ValidatedOrderItem[]): number {
  const serverTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return Math.round(serverTotal * 100);
}
