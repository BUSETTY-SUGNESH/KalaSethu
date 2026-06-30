// ============================================================
// KalaSetu — Admin Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { adminRepository } from '@/lib/repositories';
import { functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import type {
  ArtistVerification,
  VerificationStatus,
  Report,
  ReportStatus,
  AdminLog,
  PaginatedResult,
  PlatformAnalytics,
  PlatformStats,
  FeatureFlag,
} from '@/app/types';
import type { DocumentSnapshot } from '@/lib/firebase/firestore';

// ── Artist Verification ─────────────────────────────────────

export async function submitVerification(
  data: Omit<ArtistVerification, 'id' | 'status' | 'submittedAt' | 'updatedAt'>
): Promise<string> {
  const now = new Date().toISOString();
  const verification: Omit<ArtistVerification, 'id'> = {
    ...data,
    status: 'pending' as VerificationStatus,
    submittedAt: now,
    updatedAt: now,
  };
  return adminRepository.createVerification(verification);
}

export async function getVerification(
  verificationId: string
): Promise<ArtistVerification | null> {
  return adminRepository.findVerification(verificationId);
}

export async function getVerificationByArtist(
  artistId: string
): Promise<ArtistVerification | null> {
  return adminRepository.findVerificationByArtist(artistId);
}

export async function getPendingVerifications(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<ArtistVerification>> {
  return adminRepository.getPendingVerifications(pageSize, lastDoc);
}

export async function reviewVerification(
  verificationId: string,
  reviewerId: string,
  reviewerName: string,
  status: 'approved' | 'rejected',
  reviewNotes: string,
  rejectionReason?: string
): Promise<void> {
  const now = new Date().toISOString();
  const updates: Partial<ArtistVerification> = {
    status,
    reviewerId,
    reviewerName,
    reviewNotes,
    reviewedAt: now,
  };

  if (status === 'approved') {
    updates.badgeGrantedAt = now;
    // Badge valid for 1 year
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    updates.badgeExpiresAt = expiry.toISOString();
  } else {
    updates.rejectionReason = rejectionReason;
  }

  return adminRepository.updateVerification(verificationId, updates);
}

// ── Reports / Moderation ────────────────────────────────────

export async function createReport(
  data: Omit<Report, 'id' | 'status' | 'severity' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = new Date().toISOString();
  const report: Omit<Report, 'id'> = {
    ...data,
    status: 'pending' as ReportStatus,
    severity: 'medium' as Report['severity'],
    createdAt: now,
    updatedAt: now,
  };
  return adminRepository.createReport(report);
}

export async function getPendingReports(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Report>> {
  return adminRepository.getPendingReports(pageSize, lastDoc);
}

export async function resolveReport(
  reportId: string,
  reviewerId: string,
  status: 'resolved' | 'dismissed',
  reviewerNotes: string,
  actionTaken?: string
): Promise<void> {
  return adminRepository.updateReport(reportId, {
    status,
    reviewerId,
    reviewerNotes,
    actionTaken,
    resolvedAt: new Date().toISOString(),
  });
}

// ── Admin Logs ──────────────────────────────────────────────

export async function logAdminAction(
  adminId: string,
  adminName: string,
  action: string,
  targetId?: string,
  targetType?: string,
  details?: string
): Promise<void> {
  return adminRepository.createAdminLog({
    adminId,
    adminName,
    action,
    targetId,
    targetType,
    details,
    timestamp: new Date().toISOString(),
  });
}

export async function getAdminLogs(
  pageSize: number = 50,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<AdminLog>> {
  const { collections, paginatedQuery, orderBy } = await import('@/lib/firebase/firestore');
  return paginatedQuery<AdminLog>(
    collections.adminLogs(),
    [orderBy('timestamp', 'desc')],
    pageSize,
    lastDoc
  );
}

// ── Platform Analytics ──────────────────────────────────────

export async function getLatestAnalytics(): Promise<PlatformAnalytics | null> {
  return adminRepository.getLatestAnalytics('monthly');
}

export async function getPlatformStats(): Promise<PlatformStats | null> {
  return adminRepository.getPlatformStats();
}

export async function verifyArtist(
  targetUserId: string,
  isVerified: boolean,
  verificationId: string
): Promise<any> {
  const verifyArtistFn = httpsCallable(functions, 'verifyArtist');
  const result = await verifyArtistFn({ targetUserId, isVerified, verificationId });
  return result.data;
}

export async function moderateArtwork(
  artworkId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<any> {
  const moderateArtworkFn = httpsCallable(functions, 'moderateArtwork');
  const result = await moderateArtworkFn({ artworkId, action, reason });
  return result.data;
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  return adminRepository.getAllFeatureFlags();
}

export async function setFeatureFlag(id: string, enabled: boolean, description?: string): Promise<void> {
  return adminRepository.setFeatureFlag(id, { enabled, description });
}
