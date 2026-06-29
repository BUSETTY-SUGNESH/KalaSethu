/** Shared helpers for DM and channel messaging Cloud Functions */

export function parseMentionUserIds(content: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_-]{1,64})/g) || [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

export function buildContentLower(content: string): string {
  return content.toLowerCase().slice(0, 500);
}

export function truncatePreview(content: string, max = 200): string {
  const plain = content.replace(/[*_~`>#]/g, '').trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

export function lastMessagePreview(
  messageType: string,
  content: string
): string {
  if (messageType === 'image') return 'Photo';
  if (messageType === 'artwork') return 'Shared an artwork';
  if (messageType === 'system') return content.substring(0, 100);
  return truncatePreview(content, 200);
}

export async function resolveUserDisplayName(
  db: import('firebase-admin').firestore.Firestore,
  uid: string,
  fallback?: unknown
): Promise<string> {
  const fromClient = typeof fallback === 'string' ? fallback.trim() : '';
  if (fromClient) return fromClient;

  const snap = await db.collection('users').doc(uid).get();
  const data = snap.data();
  const fromDoc = typeof data?.displayName === 'string' ? data.displayName.trim() : '';
  if (fromDoc) return fromDoc;

  const email = typeof data?.email === 'string' ? data.email.split('@')[0]?.trim() : '';
  return email || 'User';
}

export async function shouldNotifyUser(
  db: import('firebase-admin').firestore.Firestore,
  userId: string,
  notifKey: string
): Promise<boolean> {
  try {
    const userSnap = await db.collection('users').doc(userId).get();
    const prefs = userSnap.data()?.preferences?.notifications;
    if (prefs && typeof prefs === 'object' && notifKey in prefs) {
      return prefs[notifKey] !== false;
    }
  } catch {
    // default to notify
  }
  return true;
}
