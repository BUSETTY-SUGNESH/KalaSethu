// ============================================================
// KalaSetu — Admin Repository (Firestore Implementation)
// Handles verifications, reports, admin logs, analytics, feature flags.
// ============================================================
import {
  collections,
  docRef,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  paginatedQuery,
  type DocumentSnapshot,
} from '@/lib/firebase/firestore';
import type {
  ArtistVerification,
  Report,
  AdminLog,
  PlatformAnalytics,
  FeatureFlag,
  PaginatedResult,
} from '@/app/types';

export const adminRepository = {
  // ── Artist Verifications ──────────────────────────────────

  async findVerification(id: string): Promise<ArtistVerification | null> {
    const snap = await getDoc(docRef.verification(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ArtistVerification;
  },

  async findVerificationByArtist(artistId: string): Promise<ArtistVerification | null> {
    const q = query(
      collections.artistVerifications(),
      where('artistId', '==', artistId),
      orderBy('submittedAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as ArtistVerification;
  },

  async createVerification(data: Omit<ArtistVerification, 'id'>): Promise<string> {
    const ref = await addDoc(collections.artistVerifications(), data);
    return ref.id;
  },

  async updateVerification(id: string, data: Partial<ArtistVerification>): Promise<void> {
    await updateDoc(docRef.verification(id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async getPendingVerifications(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<ArtistVerification>> {
    return paginatedQuery<ArtistVerification>(
      collections.artistVerifications(),
      [where('status', '==', 'pending'), orderBy('submittedAt', 'asc')],
      pageSize,
      lastDoc
    );
  },

  // ── Reports ───────────────────────────────────────────────

  async createReport(data: Omit<Report, 'id'>): Promise<string> {
    const ref = await addDoc(collections.reports(), data);
    return ref.id;
  },

  async updateReport(id: string, data: Partial<Report>): Promise<void> {
    await updateDoc(docRef.report(id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async getPendingReports(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Report>> {
    return paginatedQuery<Report>(
      collections.reports(),
      [where('status', '==', 'pending'), orderBy('createdAt', 'asc')],
      pageSize,
      lastDoc
    );
  },

  // ── Admin Logs ────────────────────────────────────────────

  async createAdminLog(data: Omit<AdminLog, 'id'>): Promise<void> {
    await addDoc(collections.adminLogs(), data);
  },

  // ── Feature Flags ─────────────────────────────────────────

  async getFeatureFlag(id: string): Promise<FeatureFlag | null> {
    const snap = await getDoc(doc(collections.featureFlags(), id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as FeatureFlag;
  },

  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    const snap = await getDocs(collections.featureFlags());
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as FeatureFlag);
  },

  async setFeatureFlag(id: string, data: Partial<FeatureFlag>): Promise<void> {
    await setDoc(doc(collections.featureFlags(), id), data, { merge: true });
  },

  // ── Analytics ─────────────────────────────────────────────

  async getLatestAnalytics(period: PlatformAnalytics['period'] = 'monthly'): Promise<PlatformAnalytics | null> {
    const q = query(
      collections.analytics(),
      where('period', '==', period),
      orderBy('date', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as unknown as PlatformAnalytics;
  },
};
