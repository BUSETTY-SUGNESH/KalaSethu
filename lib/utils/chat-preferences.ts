/**
 * Per-user chat UI preferences (local only — does not alter server messaging).
 */

export interface ChatUserPreferences {
  mutedRoomIds: string[];
  pinnedRoomIds: string[];
  clearedRooms: Record<string, string>; // roomId -> ISO clearedAt
  blockedUserIds: string[];
}

const STORAGE_KEY = 'kalasethu_chat_prefs';

function loadAll(): Record<string, ChatUserPreferences> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ChatUserPreferences>) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, ChatUserPreferences>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function prefsFor(userId: string): ChatUserPreferences {
  const all = loadAll();
  return (
    all[userId] ?? {
      mutedRoomIds: [],
      pinnedRoomIds: [],
      clearedRooms: {},
      blockedUserIds: [],
    }
  );
}

function writePrefs(userId: string, prefs: ChatUserPreferences) {
  const all = loadAll();
  all[userId] = prefs;
  saveAll(all);
}

export function getChatPreferences(userId: string): ChatUserPreferences {
  return prefsFor(userId);
}

export function isRoomMuted(userId: string, roomId: string): boolean {
  return prefsFor(userId).mutedRoomIds.includes(roomId);
}

export function isRoomPinned(userId: string, roomId: string): boolean {
  return prefsFor(userId).pinnedRoomIds.includes(roomId);
}

export function getChatClearedAt(userId: string, roomId: string): string | null {
  return prefsFor(userId).clearedRooms[roomId] ?? null;
}

export function isUserBlocked(userId: string, targetUserId: string): boolean {
  return prefsFor(userId).blockedUserIds.includes(targetUserId);
}

export function toggleRoomMuted(userId: string, roomId: string): boolean {
  const prefs = prefsFor(userId);
  const muted = prefs.mutedRoomIds.includes(roomId);
  prefs.mutedRoomIds = muted
    ? prefs.mutedRoomIds.filter((id) => id !== roomId)
    : [...prefs.mutedRoomIds, roomId];
  writePrefs(userId, prefs);
  return !muted;
}

export function toggleRoomPinned(userId: string, roomId: string): boolean {
  const prefs = prefsFor(userId);
  const pinned = prefs.pinnedRoomIds.includes(roomId);
  prefs.pinnedRoomIds = pinned
    ? prefs.pinnedRoomIds.filter((id) => id !== roomId)
    : [...prefs.pinnedRoomIds, roomId];
  writePrefs(userId, prefs);
  return !pinned;
}

export function clearChatForUser(userId: string, roomId: string): void {
  const prefs = prefsFor(userId);
  prefs.clearedRooms[roomId] = new Date().toISOString();
  writePrefs(userId, prefs);
}

export function blockUser(userId: string, targetUserId: string): void {
  const prefs = prefsFor(userId);
  if (!prefs.blockedUserIds.includes(targetUserId)) {
    prefs.blockedUserIds = [...prefs.blockedUserIds, targetUserId];
    writePrefs(userId, prefs);
  }
}

export function sortRoomsByPin<T extends { id: string }>(
  userId: string,
  rooms: T[]
): T[] {
  const pinned = new Set(prefsFor(userId).pinnedRoomIds);
  return [...rooms].sort((a, b) => {
    const aPin = pinned.has(a.id) ? 1 : 0;
    const bPin = pinned.has(b.id) ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    return 0;
  });
}
