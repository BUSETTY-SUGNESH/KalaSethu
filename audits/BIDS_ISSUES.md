# Bids Page — Issue Report

> **Last updated:** 2026-06-28  
> **Status:** All major issues **resolved**  
> **Files:** [`app/(public)/bids/page.tsx`](../app/(public)/bids/page.tsx), [`BidsClient.tsx`](../app/(public)/bids/BidsClient.tsx), [`SellerBidsClient.tsx`](../app/(public)/bids/SellerBidsClient.tsx), [`CreateAuctionModal.tsx`](../app/(public)/bids/CreateAuctionModal.tsx)  
> **Services:** [`auction-service.ts`](../lib/services/auction-service.ts)  
> **Cloud Functions:** [`functions/src/auction.ts`](../functions/src/auction.ts)  
> **Rules:** [`firestore.rules`](../firestore.rules)

---

## Summary

The Bids page switches between buyer view (`BidsClient`) and seller view (`SellerBidsClient`) based on user role. All issues identified in the original audit have been fixed, along with follow-up critical fixes for permissions, analytics, card UI, and seller page polish.

**Buyer side:** Active auctions load via SSR; premium auction cards; My Active Bids tab with real data; bid analytics sidebar; real bidding-power exposure from `getUserBidAnalytics`.

**Seller side:** Functional create/edit/cancel flows via `CreateAuctionModal` and Cloud Functions; real stats from `getAllAuctionsByArtist` + `computeSellerAuctionStats`; seller-only auction list; premium card layout matching the customer experience.

---

## Original Audit Issues

### ✅ M-05 — Create Auction Form is Unbound Stub `[RESOLVED]`
**Was:** Inline form stub with no state or handlers.  
**Fix:** [`CreateAuctionModal.tsx`](../app/(public)/bids/CreateAuctionModal.tsx) — bound form, artwork picker, validation, and create flow wired to backend.

### ✅ M-19 — "Edit Auction" and "Cancel" Buttons Have No Handlers `[RESOLVED]`
**Was:** Buttons rendered with no `onClick` handlers.  
**Fix:** Edit opens `CreateAuctionModal` in edit mode (scheduled + zero bids only). Cancel calls `cancelAuction` Cloud Function with confirmation. Disabled state when not modifiable.

### ✅ M-20 — Seller Auction Stats Are Hardcoded `[RESOLVED]`
**Was:** Static values (Active: 3, Bids: 47, etc.).  
**Fix:** `computeSellerAuctionStats()` over paginated `getAllAuctionsByArtist()` data. Compact stats bar in `SellerBidsClient`.

### ✅ Seller View Loads All Active Auctions, Not Just Seller's `[RESOLVED]`
**Was:** `getActiveAuctions(10)` returned platform-wide auctions.  
**Fix:** `getAllAuctionsByArtist(user.id)`; active list filtered to `live`, `ending_soon`, `scheduled`.

### ✅ Completed Auctions Sidebar is Hardcoded `[RESOLVED]`
**Was:** Static completed-auction metrics.  
**Fix:** Sidebar shows `stats.completedCount`, `stats.avgFinalBid`, `stats.highestSale` from `computeSellerAuctionStats`.

### ✅ `formatDistanceToNow` Missing `addSuffix` `[RESOLVED]`
**Was:** Time strings like "2 hours" without context.  
**Fix:** `addSuffix: true` in `BidsClient`, `SellerBidsClient`, and `AuctionDetailsClient`.

---

## Follow-Up Critical Fixes (Resolved)

### ✅ My Active Bids — `Missing or insufficient permissions` `[RESOLVED]`
**Cause:** Collection-group query on `bids` without collection-group-safe rules; fetch ran before Firebase Auth was ready.  
**Fix:**
- Firestore wildcard rule: `match /{path=**}/bids/{bidId}` (owner-only read); top-level `bids/{bidId}` tightened to owner-only.
- `BidsClient` gates fetch on `firebaseUser` + `!authLoading`.
- `findBidsByUser` extracts `auctionId` from doc path when field is missing on older bids.

### ✅ Hardcoded "Your Bidding Power" `[RESOLVED]`
**Was:** Header showed `₹5,00,000` always.  
**Fix:** `getUserBidAnalytics` returns `activeBidExposure` (sum of user's max bid per active auction). `normalizeBidAnalytics()` provides safe fallbacks when fields are missing.

### ✅ Customer auction cards — basic layout `[RESOLVED]`
**Fix:** Reused `.auction-card`, `.auction-grid`, `.bids-auction-list-card`, `.status-badge`, `.bids-auction-stats` patterns from the design system. Responsive grid (All Auctions) and list (My Active Bids).

### ✅ My Active Bids stale after placing a bid `[RESOLVED]`
**Fix:** `notifyBidChanged()` dispatched after successful `placeBid`; `BidsClient` listens and refetches my bids + analytics. Tab re-fetch on each visit to My Active Bids.

### ✅ Artist Bids page UI below customer polish `[RESOLVED]`
**Fix:** `SellerBidsClient` redesigned to match customer card design, compact analytics bar, secondary sidebar styling. All artist functionality preserved (View Bids, Edit, Cancel, statistics).

### ✅ Backend auction lifecycle (related) `[RESOLVED]`
Deployed fixes in `functions/src/auction.ts`: `placeBid` reserve/uniqueBidders/scheduled→live promotion; `closeEndedAuctions` uses `live`/`ending_soon`; `cancelAuction` / `updateAuction` callables; rate limiting on `placeBid`.

---

## Remaining Minor / Out-of-Scope Items

These are **not** blocking the Bids page for production use but are documented for future work:

| Item | Notes |
|------|-------|
| Bid doc `status` (`outbid`/`won`) | Prior bid documents are not retroactively updated when a new bid wins. |
| My Bids cache | Data refreshes on tab switch and after bid events; not real-time subscription. |
| Close cron latency | `closeEndedAuctions` runs every ~1 minute; brief window after `endsAt`. |
| FCM / email notifications | Notification helpers exist; push/email delivery may still be stubbed. |
| App Check | Off by default unless configured in env. |
| Auction details audit | All items resolved — see [`AUCTION_DETAILS_ISSUES.md`](./AUCTION_DETAILS_ISSUES.md) for deferred/out-of-scope notes. |

---

## Verification Checklist

- [x] `npm run build` passes
- [x] Firestore rules deployed (`/{path=**}/bids/{bidId}` owner read)
- [x] Cloud Functions deployed (`placeBid`, `closeEndedAuctions`, `getUserBidAnalytics`, `cancelAuction`, `updateAuction`)
- [x] Collector: All Auctions grid, My Active Bids tab, bidding power, analytics sidebar
- [x] Artist: Create/edit/cancel auction, real stats, seller-only list, premium cards
- [x] Guest: `/bids/[id]` public bid history still readable

---

## Files Changed (cumulative)

| Area | Key files |
|------|-----------|
| Buyer UI | `BidsClient.tsx`, `globals.css` |
| Seller UI | `SellerBidsClient.tsx`, `CreateAuctionModal.tsx` |
| Services | `auction-service.ts`, `auction.repository.ts` |
| Backend | `functions/src/auction.ts`, `functions/src/notification-helpers.ts` |
| Rules | `firestore.rules` |
| SSR | `app/(public)/bids/[id]/page.tsx`, `auction-admin.service.ts` |
