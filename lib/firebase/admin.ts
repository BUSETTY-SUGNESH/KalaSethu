// ============================================================
// KalaSetu — Firebase Admin SDK (Server-side only)
// ============================================================
// Re-exports split modules so Firestore callers never load firebase-admin/auth.
// NEVER import this file from client components or Edge Runtime (proxy.ts).

export { getAdminApp } from './admin-app';
export { getAdminDb } from './admin-db';
export { getAdminAuth } from './admin-auth';
