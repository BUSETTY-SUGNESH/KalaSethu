// ============================================================
// KalaSetu — Firebase Storage Helpers
// ============================================================
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  type StorageReference,
  type UploadTask,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { app } from './config';
import { v4 as uuidv4 } from 'uuid';

const storage = getStorage(app);

// --- Upload with progress tracking ---
export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  state: 'running' | 'paused' | 'success' | 'error';
}

export interface UploadResult {
  downloadURL: string;
  fullPath: string;
  fileName: string;
}

/**
 * Upload a file to Firebase Storage with progress tracking.
 * Path format: {basePath}/{uniqueId}_{originalName}
 */
export async function uploadFile(
  file: File,
  basePath: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const uniqueId = uuidv4().slice(0, 8);
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${uniqueId}_${sanitizedName}`;
  const fullPath = `${basePath}/${fileName}`;
  const storageRef = ref(storage, fullPath);
  const contentType = file.type || inferImageContentType(file.name);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const percentage =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          percentage,
          state: snapshot.state as UploadProgress['state'],
        });
      },
      (error) => {
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          downloadURL,
          fullPath,
          fileName,
        });
      }
    );
  });
}

/**
 * Upload multiple files concurrently.
 */
export async function uploadMultipleFiles(
  files: File[],
  basePath: string,
  onFileProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const uploads = files.map((file, index) =>
    uploadFile(file, basePath, (progress) => onFileProgress?.(index, progress))
  );
  return Promise.all(uploads);
}

/**
 * Upload artwork images to a structured path.
 * Path: artworks/{userId}/{artworkId}/{filename}
 */
export async function uploadArtworkImages(
  userId: string,
  artworkId: string,
  files: File[],
  onFileProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  return uploadMultipleFiles(files, `artworks/${userId}/${artworkId}`, onFileProgress);
}

/**
 * Upload user avatar.
 * Path: users/{userId}/avatar_{filename}
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadFile(file, `users/${userId}`, onProgress);
}

/**
 * Upload verification documents.
 * Path: verifications/{userId}/{filename}
 */
export async function uploadVerificationDoc(
  userId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadFile(file, `verifications/${userId}`, onProgress);
}

/**
 * Delete a file from Storage by its full path.
 */
export async function deleteFile(fullPath: string): Promise<void> {
  const fileRef = ref(storage, fullPath);
  await deleteObject(fileRef);
}

/**
 * Delete all files in a directory.
 */
export async function deleteDirectory(dirPath: string): Promise<void> {
  const dirRef = ref(storage, dirPath);
  const list = await listAll(dirRef);
  const deletePromises = list.items.map((item) => deleteObject(item));
  await Promise.all(deletePromises);
}

/**
 * Get download URL for a file.
 */
export async function getFileURL(fullPath: string): Promise<string> {
  const fileRef = ref(storage, fullPath);
  return getDownloadURL(fileRef);
}

// Validation constants
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB

function inferImageContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    default:
      return 'image/jpeg';
  }
}

/**
 * Validate an image file before upload.
 */
export function validateImageFile(file: File): string | null {
  const contentType = file.type || inferImageContentType(file.name);
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return 'Invalid file type. Allowed: JPEG, PNG, WebP, AVIF.';
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return 'File too large. Maximum size: 10MB.';
  }
  return null;
}

export { storage, ref };
export type { StorageReference, UploadTask };
