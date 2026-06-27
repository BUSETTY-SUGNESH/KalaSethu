# Auction Details — Issue Report

> **Files:** `app/(public)/bids/[id]/page.tsx` (dynamic route)
> **Services:** `auction-service.ts` (subscribe, placeBid, validateBid)
> **Cloud Functions:** `placeBid`, `closeEndedAuctions`, `sendEndingSoonNotifications`

---

## Summary
The auction detail page provides real-time auction tracking via Firestore subscriptions. The bid placement flow goes through a Cloud Function (`placeBid`), which is architecturally correct. However, the backend automation for auction lifecycle is fundamentally broken.

---

## Issues

### 🔴 C-03 — Auction Closer Cron Is Dead `[EXISTING]`
**File:** [`functions/src/auction.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/auction.ts), [`auction.repository.ts:L30-36`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/repositories/auction.repository.ts#L30-L36)
**Description:** `closeEndedAuctions` (runs every 1 minute) queries for auctions with `status == 'active'`. The frontend creates auctions with status `'live'` or `'scheduled'`. The status `'active'` is **never written anywhere in the codebase**. Result: zero auctions are ever closed by the cron job.
**Impact:** Auctions remain in `'live'` status indefinitely after their `endsAt` time passes. Winners are never determined. Artists cannot reclaim their artwork.

### 🔵 L-19 — No Rate Limiting on Bid Placement `[NEW]`
**File:** [`functions/src/auction.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/auction.ts) (placeBid function)
**Description:** The `placeBid` Cloud Function has no rate limiting. An automated script could place hundreds of bids per minute to manipulate auctions or DOS the system.
**Impact:** Auction manipulation; increased Firestore costs.

### 🔵 — Bid Validation Only Client-Side for Status Check `[NEW]`
**File:** [`auction-service.ts:L121-139`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/auction-service.ts#L121-L139)
**Description:** `validateBid` checks if `auction.status !== 'live' && auction.status !== 'ending_soon'` but this is client-side only. A malicious user can bypass this by calling the Cloud Function directly with any auction ID. The Cloud Function should independently verify auction status.

### 🔵 — `sendEndingSoonNotifications` Depends on Auction Closer
**Description:** The "ending soon" notification system works correctly, but since the auction closer is broken (C-03), auctions that should have ended will continue triggering "ending soon" notifications indefinitely.
