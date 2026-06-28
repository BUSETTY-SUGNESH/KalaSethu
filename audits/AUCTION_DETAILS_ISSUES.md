# Auction Details — Issue Report

> **Files:** `app/(public)/bids/[id]/page.tsx`, `AuctionDetailsClient.tsx`
> **Services:** `auction-service.ts`, `auction-admin.service.ts`, `auction.repository.ts`
> **Cloud Functions:** `placeBid`, `closeEndedAuctions`, `startScheduledAuctions`, `auctionEndingSoon`
>
> **Last updated:** 2026-06-28 — verification + fix pass

---

## Summary

The auction detail page uses SSR + Firestore realtime subscriptions. Bidding goes through the `placeBid` callable. Auction lifecycle crons (`startScheduledAuctions`, `closeEndedAuctions`) and ending-soon notifications are operational in `asia-south1`.

| Status | Count |
|--------|-------|
| Resolved | 8 |
| Deferred | 6 |

---

## Resolved Issues

### ✅ C-03 — Auction Closer Cron Is Dead `[RESOLVED]`
**Files:** [`functions/src/auction.ts`](functions/src/auction.ts), [`functions/src/repositories/auction.repository.ts`](functions/src/repositories/auction.repository.ts)
**Was:** `closeEndedAuctions` queried `status == 'active'`.
**Fix:** `getActiveEndedAuctions` uses `status in ['live','ending_soon']` + `endsAt <= now`. Deployed to `asia-south1`.

### ✅ L-19 — No Rate Limiting on Bid Placement `[RESOLVED]`
**File:** [`functions/src/auction.ts`](functions/src/auction.ts)
**Fix:** `assertRateLimit(uid, 'placeBid')` — 20 bids / 60s. Deployed.

### ✅ Bid Validation Only Client-Side `[RESOLVED]`
**Files:** [`functions/src/auction.ts`](functions/src/auction.ts), [`lib/services/auction-service.ts`](lib/services/auction-service.ts)
**Fix:** `placeBid` transaction validates status, timing, self-bid, and min increment server-side. Client `validateBid` is UX-only.

### ✅ Ending-Soon Cascade `[RESOLVED]`
**Was:** Broken closer caused stale `live`/`ending_soon` auctions.
**Fix:** C-03 fix + `auctionEndingSoon` skips overdue auctions (`timeRemainingMs <= 0`). Export name is `auctionEndingSoon` (not `sendEndingSoonNotifications`).

### ✅ Bid History Shrinks After Hydration `[RESOLVED]`
**Files:** [`lib/constants/auction.ts`](lib/constants/auction.ts), [`lib/repositories/firestore/auction.repository.ts`](lib/repositories/firestore/auction.repository.ts), [`lib/services/server/auction-admin.service.ts`](lib/services/server/auction-admin.service.ts)
**Fix:** Shared `AUCTION_BID_HISTORY_LIMIT = 50` for SSR (`getAuctionBidsServer`) and realtime (`subscribeToBids`).

### ✅ Unreliable Bidder Status Pill `[RESOLVED]`
**File:** [`app/(public)/bids/[id]/AuctionDetailsClient.tsx`](app/(public)/bids/[id]/AuctionDetailsClient.tsx)
**Fix:** `lastBidderId` + `userHasBid` (not only `bids[0]`).

### ✅ Winner UI Gap During Closure Lag `[RESOLVED]`
**File:** [`app/(public)/bids/[id]/AuctionDetailsClient.tsx`](app/(public)/bids/[id]/AuctionDetailsClient.tsx)
**Fix:** "Finalizing results…" + provisional winner when reserve met, before cron sets `winnerId`.

### ✅ Generic placeBid Error Message `[RESOLVED]`
**File:** [`lib/services/auction-service.ts`](lib/services/auction-service.ts)
**Fix:** Surfaces server `message` on `success: false`.

---

## Deferred / Remaining

| Item | Severity | Notes |
|------|----------|-------|
| Bid doc `status` never updated | Medium | Analytics only |
| FCM / email stubbed | Medium | In-app notifications work |
| App Check off by default | Low–Med | Auth still required on `placeBid` |
| Missing auction → HTTP 200 | Low | Invalid ID → 404 |
| ~1 min closure lag | Low | Mitigated by finalizing UI |
| 50+ bids truncate history | Low | Pagination follow-up |
| Client UI deploy | Ops | Redeploy Next.js app for UI fixes in production |

---

## Verification Checklist

- [x] `closeEndedAuctions` / `startScheduledAuctions` deployed (`asia-south1`)
- [x] `placeBid` rate limit + server validation deployed
- [x] `firebase deploy --only functions` completes successfully
- [x] `onArtworkWritten`, `onCommentAdded` Firestore triggers in `asia-south1`
- [x] `npm run build` / `tsc --noEmit` pass
- [ ] Redeploy Next.js hosting for client UI changes (if not local-only)
