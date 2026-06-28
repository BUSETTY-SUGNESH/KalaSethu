// ============================================================
// KalaSetu — Artwork Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { artworkRepository } from '@/lib/repositories';
import { deleteFile, deleteDirectory, uploadMultipleFiles } from '@/lib/firebase/storage';
import { functions } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';
import type {
  Artwork,
  ArtworkFormData,
  ArtworkImage,
  ArtworkStatus,
  PaginatedResult,
} from '@/app/types';
import type { DocumentSnapshot } from '@/lib/firebase/firestore';

// --- Create Artwork ---
export async function createArtwork(
  artistId: string,
  artistName: string,
  artistVerified: boolean,
  data: ArtworkFormData,
  images: ArtworkImage[]
): Promise<string> {
  const now = new Date().toISOString();
  const artwork: Omit<Artwork, 'id'> = {
    ...data,
    artistId,
    artistName,
    artistVerified,
    artistAvatarUrl: undefined,
    currency: 'INR',
    images,
    thumbnailUrl: images[0]?.thumbnailUrl || images[0]?.url || '',
    status: 'draft',
    isFeatured: false,
    viewCount: 0,
    likeCount: 0,
    favoriteCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  return artworkRepository.create(artwork);
}

// --- Get Single Artwork ---
export async function getArtwork(artworkId: string): Promise<Artwork | null> {
  return artworkRepository.findById(artworkId);
}

// --- Update Artwork ---
export async function updateArtwork(
  artworkId: string,
  data: Partial<Artwork>
): Promise<void> {
  return artworkRepository.update(artworkId, data);
}

// --- Update Artwork Status ---
export async function updateArtworkStatus(
  artworkId: string,
  status: ArtworkStatus
): Promise<void> {
  return artworkRepository.setStatus(artworkId, status);
}

// --- Publish Artwork (via Cloud Function for status moderation) ---
export async function publishArtwork(
  artworkId: string
): Promise<{ status: 'published' | 'pending' }> {
  const submitFn = httpsCallable(functions, 'submitArtworkForReview');
  const result = await submitFn({ artworkId });
  const data = result.data as { success: boolean; status: 'published' | 'pending' };
  return { status: data.status };
}

// --- Archive Artwork ---
export async function archiveArtwork(artworkId: string): Promise<void> {
  return artworkRepository.setStatus(artworkId, 'archived');
}

// --- Delete Artwork ---
export async function deleteArtwork(artworkId: string): Promise<void> {
  const artwork = await artworkRepository.findById(artworkId);
  if (artwork) {
    const paths = artwork.images?.map((img) => img.storagePath).filter(Boolean) ?? [];
    await Promise.all(paths.map((p) => deleteFile(p).catch(() => {})));
    if (artwork.artistId) {
      await deleteDirectory(`artworks/${artwork.artistId}/${artworkId}`).catch(() => {});
    }
  }
  await artworkRepository.delete(artworkId);
}

// --- Create and publish artwork from auction modal upload ---
export async function createAndPublishArtworkForAuction(
  artistId: string,
  artistName: string,
  artistVerified: boolean,
  title: string,
  imageFile: File,
  startPrice: number
): Promise<{ artworkId: string; title: string; imageUrl: string; publishStatus: 'published' | 'pending' }> {
  let artworkId: string | null = null;

  try {
    artworkId = await createArtwork(
      artistId,
      artistName,
      artistVerified,
      {
        title,
        description: '',
        category: 'other',
        medium: 'Not specified',
        dimensions: 'Not specified',
        year: new Date().getFullYear(),
        price: startPrice,
        listingType: 'auction',
        tags: [],
        isCommissionable: false,
      },
      []
    );

    const uploadedImages = await uploadMultipleFiles(
      [imageFile],
      `artworks/${artistId}/${artworkId}`
    );

    const images: ArtworkImage[] = uploadedImages.map((image, index) => ({
      id: image.fileName,
      url: image.downloadURL,
      thumbnailUrl: image.downloadURL,
      storagePath: image.fullPath,
      isPrimary: index === 0,
      order: index,
    }));

    const imageUrl = images[0]?.url || '';
    await updateArtwork(artworkId, {
      images,
      thumbnailUrl: imageUrl,
    });

    const { status: publishStatus } = await publishArtwork(artworkId);

    return { artworkId, title, imageUrl, publishStatus };
  } catch (error) {
    if (artworkId) {
      await deleteArtwork(artworkId).catch(() => {});
    }
    throw error;
  }
}

// --- Get Artworks by Artist ---
export async function getArtworksByArtist(
  artistId: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Artwork>> {
  return artworkRepository.findByArtist(artistId, pageSize, lastDoc);
}

// --- Get Published Artworks (for marketplace) ---
export async function getPublishedArtworks(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null,
  filters?: {
    category?: string;
    medium?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular';
  }
): Promise<PaginatedResult<Artwork>> {
  return artworkRepository.findPublished(pageSize, lastDoc, filters);
}

// --- Get Featured Artworks ---
export async function getFeaturedArtworks(count: number = 10): Promise<Artwork[]> {
  return artworkRepository.findFeatured(count);
}

// --- Search Artworks ---
export async function searchArtworks(
  searchTerm: string,
  maxResults: number = 30
): Promise<Artwork[]> {
  return artworkRepository.searchArtworks(searchTerm, maxResults);
}

// --- Increment View Count ---
export async function incrementArtworkViews(artworkId: string): Promise<void> {
  return artworkRepository.incrementViews(artworkId);
}

// --- Toggle Favorite ---
export async function incrementArtworkFavorites(
  artworkId: string,
  delta: number
): Promise<void> {
  return artworkRepository.incrementFavorites(artworkId, delta);
}

// --- Get Artworks by Category ---
export async function getArtworksByCategory(
  category: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Artwork>> {
  return artworkRepository.findByCategory(category, pageSize, lastDoc);
}

// --- Get Pending Artworks (for admin) ---
export async function getPendingArtworks(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Artwork>> {
  return artworkRepository.findPending(pageSize, lastDoc);
}
