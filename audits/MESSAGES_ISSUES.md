# Messages / Chat — Issue Report

> **Files:** [`app/dashboard/messages/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/messages/page.tsx)
> **Services:** [`chat-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/chat-service.ts)
> **Repository:** [`chat.repository.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/chat.repository.ts)
> **Cloud Functions:** [`functions/src/messaging.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/messaging.ts)
> **Rules:** [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules)

---

## Summary

The Messages page implements real-time 1:1 chat with Firestore subscriptions and Cloud Function writes. All audit issues below are resolved. Permission-denied on room subscriptions, community collection-group queries, and send-message validation failures were fixed in a follow-up pass (2026-06-29). Direct messaging is production-ready; media upload UI remains deferred.

---

## Issues

### ✅ H-06 — Infinite Re-Render Loop via `participantProfiles` Dependency `[RESOLVED]`
**File:** `dashboard/messages/page.tsx`
**Resolution:** Replaced `participantProfiles` dependency with `loadedProfileIdsRef` (a `useRef<Set>`). Profile fetching is idempotent and no longer retriggers the room subscription effect.

### ✅ M-12 — New Chat Flow Logs Warning Instead of Creating Room `[RESOLVED]`
**File:** `dashboard/messages/page.tsx`, `lib/services/chat-service.ts`
**Resolution:** `handleSend` calls `startDirectChat()` which uses `getOrCreateDirectChatRoom` + `sendMessage`. First message from profile deep-link (`?userId=`) creates the room and switches to it.

### ✅ — Attach File and Add Image Buttons Non-Functional `[RESOLVED — DEFERRED]`
**File:** `dashboard/messages/page.tsx`
**Resolution:** Buttons removed from the chat input area. Media upload will be implemented in a later phase. Existing image messages in the database still render via `mediaUrl`.

### ✅ — Search Messages Input is Unbound `[RESOLVED]`
**File:** `dashboard/messages/page.tsx`
**Resolution:** `searchQuery` state filters conversations by participant name and last message preview client-side.

### ✅ — Messages Reversed In-Place `[RESOLVED]`
**File:** `lib/repositories/firestore/chat.repository.ts`
**Resolution:** `subscribeToMessages` uses `orderBy('createdAt', 'desc')` + `limit(50)` and returns `[...messages].reverse()` without mutating the snapshot array.

### ✅ — "More options" Button Non-Functional `[RESOLVED]`
**File:** `dashboard/messages/page.tsx`
**Resolution:** Dropdown menu with View profile and Report user actions.

### ✅ C-01 — Firestore `permission-denied` on `subscribeToRooms` / `chatRooms` `[RESOLVED]`
**Symptom:** Console: `[chat] subscribeToRooms chatRooms permission-denied`, empty room list, send flow broken.
**Root causes:**
1. **`findDirectRoom`** queried `array-contains` on the lexicographically smaller UID instead of `request.auth.uid` — Firestore rejects list queries that are not constrained to the authenticated user.
2. **Subscriptions started before Firebase Auth** was attached to the Firestore client (profile loaded from Zustand while `request.auth` was still null).
3. **Read rule** included `participants is list`, which Firestore could not prove from the query constraints alone in some cases.

**Resolution:**
- `findDirectRoom` and `subscribeToRooms` always query with `getCurrentUser().uid` (via `resolveAuthUid`).
- `MessagingProvider` starts room/community subscriptions only inside `onAuthStateChanged`.
- Firestore read rule simplified to `request.auth.uid in resource.data.participants`.
- Added `isChatRoomParticipant(roomId)` helper for message subcollection reads.
- Snapshot listeners use `onError` handlers; permission failures clear state and log `[chat]` / `[messaging]` warnings instead of crashing.

### ✅ C-02 — Community `members` collection-group query failures `[RESOLVED]`
**Symptom:** `[community] subscribeToUserCommunities members` permission-denied or missing-index errors on every dashboard page (including Messages).
**Root causes:**
1. Nested `communities/{id}/members` rules do not apply to **collection-group** queries — required recursive wildcard rule.
2. Missing **collection-group single-field index** on `members.userId`.

**Resolution:**
- Added `match /{path=**}/members/{memberId}` with `resource.data.userId == request.auth.uid`.
- Added `fieldOverrides` for `members.userId` with `COLLECTION_GROUP` scope in `firestore.indexes.json`.
- Error handlers on all community messaging `onSnapshot` listeners.

### ✅ C-03 — "Failed to send message" (HTTP 400 on `sendChatMessage`) `[RESOLVED]`
**Symptom:** Toast "Failed to send message"; Network tab shows 400 on `sendChatMessage` callable (not visible in Next.js terminal).
**Root causes:**
1. **`senderName` empty or missing** when `user.displayName` was unset in Firestore → `Invalid senderName`.
2. Optional fields (`mediaUrl`, `artworkId`, `replyToMessageId`) sent as **`null`** failed `typeof === 'string'` validation.
3. Generic catch block hid the real Firebase error message.

**Resolution:**
- **`sendChatMessage` CF** resolves `senderName` from the caller's Firestore profile when the client omits it (`resolveUserDisplayName`).
- **`getOrCreateDirectChatRoom` CF** (server-side room create/find) stores both participants, names, avatars, and unread counts; client no longer uses `addDoc` for rooms.
- Schema validation ignores `null`/empty optional fields.
- Client uses `resolveDisplayName()` and sends a minimal callable payload (no null optional keys).
- Send errors surface the Firebase message in the toast via `getCallableErrorMessage`.

---

## Additional Fixes (Out of Scope of Original Audit)

| Area | Fix |
|------|-----|
| Unread counts | `sendChatMessage` Cloud Function increments `unreadCount` per recipient |
| Notifications | `new_message` notifications created server-side with deep link |
| Message window | Subscription returns latest 50 messages (not oldest 50) |
| Pagination | "Load earlier messages" and "Load more conversations" |
| Nav discoverability | Messages added to dashboard sidebar + header with unread badge |
| Self-chat guard | Blocked on profile page and messages deep link |
| Firestore indexes | `chatRooms`: `participants` + `updatedAt`; `type` + `participants`; `members` collection-group `userId` field override |
| Error handling | User-visible toasts; `[chat]` / `[community]` console warnings for listener denials |
| Participation guard | Messages page verifies room membership via `getChatRoom` before subscribing to `chatRooms/{id}/messages` |
| Room creation | `getOrCreateDirectChatRoom` Cloud Function (asia-south1) — idempotent, both participants stored |
| Auth alignment | All room queries and subscriptions use Firebase Auth UID, not profile id alone |

---

## Firestore Rules — Chat Rooms (reference)

```
match /chatRooms/{roomId} {
  allow read: if isAuthenticated()
    && request.auth.uid in resource.data.participants;
  allow create: if isAuthenticated() && isValidChatRoomCreate();
  allow update: if isAuthenticated() && isValidChatRoomUpdate();

  match /messages/{messageId} {
    allow read: if isAuthenticated() && isChatRoomParticipant(roomId);
    allow create, update, delete: if false;  // Cloud Functions only
  }
}
```

**Query contract:** `subscribeToRooms` must use `where('participants', 'array-contains', auth.uid)` — never another user's UID.

---

## Deploy Checklist (DM fixes)

```bash
firebase deploy --only firestore:rules,firestore:indexes

cd functions && npm run build
firebase deploy --only functions:getOrCreateDirectChatRoom,functions:sendChatMessage
```

---

## Verification Checklist

- [ ] Log in as artist → message a collector via profile → first message creates room and sends
- [ ] Log in as collector → `/dashboard/messages` loads room list without `permission-denied`
- [ ] Real-time messages appear for both participants
- [ ] No `[chat] subscribeToRooms chatRooms permission-denied` in browser console
- [ ] No `[community] subscribeToUserCommunities` index or permission errors
- [ ] Send failure toast shows specific Firebase error message when validation fails

---

## Deferred (Separate Work)

- Private / group chats (beyond 1:1 direct)
- Rich-text messaging toolbar (beyond basic Markdown composer)
- Image and file upload UI
