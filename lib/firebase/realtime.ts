'use client';

import { getDatabase, ref, onValue, set, onDisconnect, serverTimestamp, remove, type Database } from 'firebase/database';
import { app } from './config';

let database: Database | null = null;

function getRtdb(): Database | null {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) return null;
  if (!database) {
    database = getDatabase(app);
  }
  return database;
}

export type PresenceStatus = 'online' | 'idle' | 'offline';

export function subscribeToPresence(
  userId: string,
  callback: (status: PresenceStatus, lastSeen?: number) => void
): () => void {
  const db = getRtdb();
  if (!db) return () => {};

  const presenceRef = ref(db, `presence/${userId}`);
  const unsubscribe = onValue(presenceRef, (snap) => {
    const val = snap.val();
    if (!val) {
      callback('offline');
      return;
    }
    callback(val.status || 'offline', val.lastSeen);
  });
  return unsubscribe;
}

export async function setUserOnline(userId: string): Promise<void> {
  const db = getRtdb();
  if (!db) return;

  const presenceRef = ref(db, `presence/${userId}`);
  await set(presenceRef, { status: 'online', lastSeen: serverTimestamp() });
  await onDisconnect(presenceRef).set({ status: 'offline', lastSeen: serverTimestamp() });
}

export async function setUserIdle(userId: string): Promise<void> {
  const db = getRtdb();
  if (!db) return;
  await set(ref(db, `presence/${userId}`), { status: 'idle', lastSeen: serverTimestamp() });
}

export async function setTypingDm(roomId: string, userId: string, isTyping: boolean): Promise<void> {
  const db = getRtdb();
  if (!db) return;
  const path = ref(db, `typing/dm/${roomId}/${userId}`);
  if (isTyping) {
    await set(path, { at: Date.now() });
  } else {
    await remove(path);
  }
}

export async function setTypingChannel(
  communityId: string,
  channelId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const db = getRtdb();
  if (!db) return;
  const path = ref(db, `typing/channel/${communityId}/${channelId}/${userId}`);
  if (isTyping) {
    await set(path, { at: Date.now() });
  } else {
    await remove(path);
  }
}

export function subscribeToDmTyping(
  roomId: string,
  currentUserId: string,
  callback: (userIds: string[]) => void
): () => void {
  const db = getRtdb();
  if (!db) return () => {};

  const typingRef = ref(db, `typing/dm/${roomId}`);
  const now = Date.now();
  return onValue(typingRef, (snap) => {
    const val = snap.val() || {};
    const active = Object.entries(val)
      .filter(([uid, data]) => {
        if (uid === currentUserId) return false;
        const at = (data as { at?: number })?.at || 0;
        return now - at < 5000 || Date.now() - at < 5000;
      })
      .map(([uid]) => uid);
    callback(active);
  });
}

export function subscribeToChannelTyping(
  communityId: string,
  channelId: string,
  currentUserId: string,
  callback: (userIds: string[]) => void
): () => void {
  const db = getRtdb();
  if (!db) return () => {};

  const typingRef = ref(db, `typing/channel/${communityId}/${channelId}`);
  return onValue(typingRef, (snap) => {
    const val = snap.val() || {};
    const active = Object.entries(val)
      .filter(([uid, data]) => {
        if (uid === currentUserId) return false;
        const at = (data as { at?: number })?.at || 0;
        return Date.now() - at < 5000;
      })
      .map(([uid]) => uid);
    callback(active);
  });
}
