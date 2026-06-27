# Services, Repositories & Stores — Issue Report

> **Files:** All files in [`lib/services/`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services), [`lib/repositories/`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories), [`lib/stores/`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/stores)
>
> **Last updated:** 2026-06-27 — services/repos/store fix pass

---

## Summary

The application follows a clean Repository → Service → Store → Component architecture. The layering is well-designed. A production-safe fix pass resolved all data integrity, performance, and state management issues identified in this audit.

| Status | Count |
|--------|-------|
| Resolved | 11 |
| Remaining | 0 |

**Deploy status:** `verifyPayment` multi-seller `orderIds` response is built in `functions/lib/` locally. Deploy with `firebase deploy --only functions:verifyPayment` before production use.

---

## Resolved Issues

### ✅ M-01 — Search Case-Sensitivity `[RESOLVED]`
**File:** [`lib/repositories/firestore/artwork.repository.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/artwork.repository.ts)
**Was:** `searchArtworks` queried only Title Case prefixes; Firestore prefix search is case-sensitive.
**Fix:** `getSearchTermVariants()` runs title/artist/category queries for original, title-case, and lowercase variants; results merged and deduped by ID.

### ✅ M-14 — `createOrder` Comma-Joined IDs `[RESOLVED]`
**File:** [`lib/services/order-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/order-service.ts)
**Was:** `createOrder` returned `orderIds.join(',')` — fragile string for multi-seller orders.
**Fix:** Return type changed to `Promise<string[]>`. Note: checkout uses `payment-service` Cloud Functions, not this client helper.

### ✅ M-15 — `toastCounter` Module-Level Variable `[RESOLVED]`
**File:** [`lib/stores/ui-store.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/stores/ui-store.ts)
**Was:** Module-scoped `toastCounter` could diverge across SSR/client instances.
**Fix:** Removed counter; `addToast` uses `crypto.randomUUID()` with timestamp/random fallback.

### ✅ H-07 — Cart Store Not Scoped to User `[RESOLVED]`
**Files:** [`lib/stores/cart-store.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/stores/cart-store.ts), [`app/components/providers/AuthProvider.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/providers/AuthProvider.tsx)
**Was:** Cart persisted to static `kalasetu_cart` key — leaked between accounts on shared devices.
**Fix:** Per-user key `kalasetu_cart_{userId}`; `setCartUser()` on login/logout; legacy key migrated on hydrate.

### ✅ `deleteArtwork` Doesn't Clean Up Storage `[RESOLVED]`
**File:** [`lib/services/artwork-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/artwork-service.ts)
**Was:** Firestore document deleted but Storage images left orphaned.
**Fix:** Before Firestore delete, removes image `storagePath` entries and `artworks/{artistId}/{artworkId}` directory; storage errors swallowed so delete still proceeds.

### ✅ `sendMessage` Wasted Room Read `[RESOLVED]`
**File:** [`lib/services/chat-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/chat-service.ts)
**Was:** Extra `findRoom` read before calling `sendMessage`.
**Fix:** Removed pre-check; `sendChatMessage` Cloud Function validates room existence and participant membership.

### ✅ `payment-service.ts` Uses `any` for `orderDetails` `[RESOLVED]`
**File:** [`lib/services/payment-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/payment-service.ts)
**Was:** `verifyPayment(..., orderDetails: any)` had no type safety.
**Fix:** Added `VerifyPaymentOrderDetails` and `VerifyPaymentShippingAddress` interfaces matching checkout payload shape.

### ✅ `createUserProfile` Role / Profile Creation Race `[RESOLVED]`
**Files:** [`lib/services/user-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/user-service.ts), [`lib/repositories/firestore/user.repository.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/user.repository.ts)
**Was:** Client `setDoc` could clobber server `onUserCreated` profile depending on sign-in timing. Audit also cited `collector` vs `user` role mismatch (backend now uses `user`).
**Fix:** `userRepository.create` uses `setDoc(..., { merge: true })`; client default role remains `'user'`, aligned with `functions/src/auth.ts`.

### ✅ `auction-service.ts` Unused Import `[RESOLVED]`
**File:** [`lib/services/auction-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/auction-service.ts)
**Was:** `subcollections` and `addDoc` imported but unused.
**Fix:** Removed unused imports.

### ✅ Auth Store `hasRole` Returns False for `collector` `[RESOLVED]`
**File:** [`lib/stores/auth-store.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/stores/auth-store.ts)
**Was:** Legacy `collector` role not in `roleHierarchy`; `hasRole('user')` failed for those users.
**Fix:** `hasRole` normalizes `collector` → `user` before hierarchy check (mirrors `user.repository` `normalizeUser`).

### ✅ Multi-Seller `verifyPayment` Returns Only First Order ID `[RESOLVED]`
**Files:** [`functions/src/payment.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/payment.ts), [`lib/services/payment-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/payment-service.ts), [`app/(public)/checkout/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/checkout/page.tsx)
**Was:** `verifyPayment` returned `{ orderId: orderIds[0] }` only — multi-seller buyers lost visibility into other orders.
**Fix:** Returns `{ orderIds, orderId: orderIds[0] }`; checkout redirects to order detail for single seller, order list for multiple. `onOrderCreated` still fires per order for notifications.

---

## Remaining Issues

None from this audit.

---

## Optional Follow-Ups (not blocking)

- **Deploy** `verifyPayment` Cloud Function to production.
- **Manual QA:** marketplace search (mixed case), per-user cart, checkout (single + multi-seller), orders list, notifications, artist delete.
- **Type alignment:** checkout shipping form uses `VerifyPaymentShippingAddress`; `ShippingAddress` in `app/types` has a different shape — works today, could be unified later.
- **Search performance:** case-variant queries increase Firestore reads per search; consider lowercase search fields on write if volume grows.
- **Pre-login cart:** items added before auth are not persisted until `setCartUser` runs after login.
