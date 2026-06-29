# Messaging Platform — Deployment Checklist

## Prerequisites

- Set `NEXT_PUBLIC_FIREBASE_DATABASE_URL` in `.env.local` for RTDB presence/typing.
- Enable Firebase Realtime Database in the Firebase console (asia-south1 or default region).

## Deploy commands

```bash
# Firestore rules + indexes (includes chatRooms rules + members collection-group field override)
firebase deploy --only firestore:rules,firestore:indexes

# RTDB rules
firebase deploy --only database

# Cloud Functions — DM core (required for messaging)
cd functions && npm run build
firebase deploy --only functions:getOrCreateDirectChatRoom,functions:sendChatMessage,functions:markMessagesRead,functions:editMessage,functions:deleteMessage

# Cloud Functions — communities + advanced messaging
firebase deploy --only functions:sendChannelMessage,functions:toggleReaction,functions:pinMessage,functions:unpinMessage,functions:searchMessages,functions:banMember,functions:updateMemberRole,functions:joinCommunity,functions:leaveCommunity,functions:updateCommunity,functions:createChannel,functions:updateChannel,functions:getCommunityByOwner
```

Or deploy all functions: `firebase deploy --only functions`

## Post-deploy verification

### Direct messages (1:1)

1. Artist messages collector from profile → `getOrCreateDirectChatRoom` creates room with both UIDs in `participants`.
2. `/dashboard/messages` loads without `permission-denied` on `chatRooms` subscription.
3. Send message succeeds (no HTTP 400 on `sendChatMessage`).
4. Recipient sees room in sidebar and receives real-time messages.
5. Unread badge increments; mark-read clears count via `markMessagesRead`.

### Communities

1. Verified artist approval auto-creates community with `#general` and `#announcements`.
2. Following an artist auto-joins their community.
3. Community sidebar loads without `members` collection-group index errors.

### Advanced

1. DM: Markdown send, reply, edit, delete, reactions, read receipts.
2. Community: role-gated announcements channel; members can post in `#general`.
3. Unread badges on sidebar, header, and per-channel indicators.
4. Presence/typing (requires RTDB URL configured).

## Indexes added

- `chatRooms`: `participants` (array-contains) + `updatedAt`
- `chatRooms`: `type` + `participants` (direct room lookup)
- `members` (collection group): `userId` — configured via **`fieldOverrides`** in `firestore.indexes.json` (not a composite index entry)
- `communities`: `ownerId` + `updatedAt`
- `pinnedMessages` (collection group): `channelId` + `pinnedAt`

## Security

- **Chat room reads:** authenticated users may read only rooms where `request.auth.uid in participants`. List queries must use `array-contains` on the caller's own UID.
- **Chat room creates (client):** allowed by rules but **production flow uses `getOrCreateDirectChatRoom` Cloud Function** (Admin SDK) for consistent participant storage.
- **Message writes:** Cloud Functions only (`sendChatMessage`, etc.) with App Check hook + rate limits.
- **Community `members` collection group:** recursive wildcard rule `/{path=**}/members/{memberId}` — read only when `resource.data.userId == request.auth.uid`.
- **Community writes** (join, ban, channels): server-only except read access for authenticated users.
- **RTDB:** users may only write their own presence/typing nodes.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `[chat] subscribeToRooms permission-denied` | Query not using `auth.uid`, or rules not deployed | Deploy rules; ensure `MessagingProvider` uses `onAuthStateChanged` |
| `[community] members` missing index | Collection-group index not built | Deploy `fieldOverrides`; wait for index **Enabled** in Firebase console |
| HTTP 400 on `sendChatMessage` | Empty `senderName`, null optional fields | Deploy latest `sendChatMessage` CF; client uses `resolveDisplayName` |
| HTTP 403 on `sendChatMessage` | Sender not in `room.participants` | Re-create room via `getOrCreateDirectChatRoom`; verify both UIDs in Firestore doc |
| Empty room list but no error | Listener error swallowed | Check browser console for `[chat]` / `[messaging]` warnings |

## Client ↔ server alignment

| Operation | Client | Server |
|-----------|--------|--------|
| List my rooms | `subscribeToRooms(auth.uid)` | Rules: `auth.uid in participants` |
| Find/create direct room | `getOrCreateDirectChatRoom` callable | CF queries with caller UID; stores `[caller, other]` |
| Send message | `sendChatMessage` callable | CF validates payload, writes message + room metadata |
| Subscribe to messages | `chatRooms/{roomId}/messages` | Rules: `isChatRoomParticipant(roomId)` |
| List my communities | `collectionGroup('members').where('userId','==', auth.uid)` | Wildcard members rule + field override index |
