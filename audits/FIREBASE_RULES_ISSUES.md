# Firestore & Storage Rules — Issue Report

> **Files:** [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules), [`storage.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/storage.rules), [`lib/firebase/app-check.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/firebase/app-check.ts)
>
> **Last updated:** 2026-06-27 — security rules fix pass + production hardening (App Check, rate limits, schema validation)

---

## Summary

The security rules are the most critical defense layer in a Firebase application. A production-safe fix pass resolved all critical and high-severity authorization gaps identified in this audit. Rate limiting and schema validation were added via rules helpers plus Cloud Functions enforcement.

| Status | Count |
|--------|-------|
| Resolved | 7 |
| Deferred (enforce phase) | 1 |

---

## Resolved Issues

### ✅ C-02 — `/orders` Collection Allows Client-Side Creation `[RESOLVED]`
**File:** [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules) — `/orders/{orderId}`
**Was:** Any authenticated user could `create` orders with arbitrary `paymentStatus` and `totalAmount`.
**Fix:** `allow create: if false`. Orders are created only by the `verifyPayment` Cloud Function.

### ✅ C-04 — Storage Artwork/Event Deletion Open to All Users `[RESOLVED]`
**File:** [`storage.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/storage.rules)
**Was:** `/artworks/{artworkId}/…` and `/events/{eventId}/…` allowed delete for any authenticated user.
**Fix:** Artwork uploads use path `artworks/{userId}/{artworkId}/{fileName}` with `request.auth.uid == userId` for write/delete. Legacy artwork path falls back to Firestore cross-ref. Events require `request.auth.uid == eventOrganizerId(eventId)`.

### ✅ C-08 — Chat Media Readable by Any Authenticated User `[RESOLVED]`
**File:** [`storage.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/storage.rules) — `/chats/{roomId}/{fileName}`
**Was:** Any authenticated user could read chat attachments.
**Fix:** `isChatParticipant(roomId)` checks `chatRooms/{roomId}.participants` via Firestore cross-ref before read/create.

### ✅ H-02 — User Profile Stats Writable by Owner `[RESOLVED]`
**File:** [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules), [`functions/src/community.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/community.ts)
**Was:** Owners could write `followerCount`, `followingCount`, `salesCount`, `totalRevenue`, `artworkCount`.
**Fix:** `protectedStatFields()` blocks client updates to stat fields. Follow/unfollow moved to `followUser` / `unfollowUser` callables with transactional counter updates. Followers/following subcollections are CF-only (`allow write: if false`).

### ✅ H-03 — Artwork Status Bypass via Client Update `[RESOLVED]`
**File:** [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules), [`functions/src/artwork.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/artwork.ts)
**Was:** Artists could set `status: 'published'` directly from the client.
**Fix:** `isValidClientStatusChange()` restricts owner status changes to `draft`, `pending`, `archived`. Publishing goes through `submitArtworkForReview` / `moderateArtwork` Cloud Functions.

### ✅ — No Rate Limiting in Rules `[RESOLVED — CF layer]`
**Files:** [`functions/src/utils/rate-limit.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/utils/rate-limit.ts), [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules)
**Was:** No write-frequency limits on sensitive actions.
**Fix:** Sliding-window rate limits on callables (e.g. `placeBid` 20/min, `verifyPayment` 5/min, `sendChatMessage` 60/min). `_rateLimits/{limitId}` collection denied to clients (`allow read, write: if false`).

### ✅ — No Schema Validation on Document Fields `[RESOLVED]`
**File:** [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules)
**Was:** Rules checked authorization only, not data shape.
**Fix:** Validation helpers on create/update for users, artworks, auctions, orders (seller updates), notifications, and chat rooms. Cloud Functions use [`functions/src/utils/schema-validation.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/utils/schema-validation.ts) for callable payloads.

---

## Production Hardening — App Check

### ✅ Local dev App Check 403 errors `[RESOLVED]`
**File:** [`lib/firebase/app-check.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/firebase/app-check.ts)
**Was:** `@firebase/auth: AppCheck: Fetch server returned HTTP 403` on every page load in local dev. Caused by reCAPTCHA v3 App Check on `localhost` (unsupported without a registered debug token). A bad env value `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=true` made it worse.
**Fix:** App Check is **skipped on localhost in development** unless `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` is set to a registered UUID debug token. Safe while App Check is in monitor phase (`ENFORCE_APP_CHECK=false`).

**Local dev behavior (current):**
- Use `http://localhost:3000` — App Check skipped, no 403 errors
- Network URL (e.g. `http://172.x.x.x:3000`) may still initialize App Check and show 403 — prefer localhost
- Optional: register a debug token in Firebase Console → App Check → Debug tokens, add to `.env.local`, restart dev

### ⏳ App Check enforce phase `[DEFERRED — ops]`
**Files:** [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules), [`storage.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/storage.rules), [`functions/src/utils/app-check.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/utils/app-check.ts)
**Status:** Client init + CF hooks deployed. Monitor phase active. Not yet enforced in rules or callables.

**When ready for production enforce:**
1. Firebase Console → App Check → register web app with `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
2. Add production domains to reCAPTCHA allowed domains (not localhost)
3. Set Firestore, Storage, Cloud Functions to **Enforce** in Console after metrics look healthy
4. Set `ENFORCE_APP_CHECK=true` in Cloud Functions env
5. Append `&& hasAppCheck()` to sensitive rules in `firestore.rules` and `storage.rules`

---

## Deployment Checklist

```bash
# Rules dry-run + deploy
firebase deploy --only firestore:rules,storage

# Functions (rate limits, App Check hooks, social/chat callables)
cd functions && npm run build
firebase deploy --only functions
```

---

## Verification Checklist

- [x] Client cannot create `/orders` documents
- [x] Artwork storage delete restricted to path owner (`userId` in path)
- [x] Chat media read restricted to room participants
- [x] Profile stat fields not writable by client
- [x] Artwork `published` status only via Cloud Functions
- [x] Rate limits on sensitive callables; `_rateLimits` denied
- [x] Schema validation on key collections
- [x] Local dev on localhost — no App Check 403 errors
- [ ] App Check enforced in production (ops step — see above)
