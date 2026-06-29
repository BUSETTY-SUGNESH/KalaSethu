# Artwork Details — Issue Report

> **Files:** [`app/(public)/artwork/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/artwork/[id]/page.tsx), [`app/(public)/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/page.tsx), [`app/(public)/profile/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/profile/[id]/page.tsx)
> **Services:** [`lib/services/artwork-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/artwork-service.ts)
>
> **Last updated:** 2026-06-29 — artwork detail fix pass + public profile portfolio filter

---

## Summary

The artwork detail page renders individual artwork information. A fix pass resolved all issues identified in this audit: view deduplication, access control, hero link, not-found UX, image optimization, navigation state, and public profile portfolio exposure.

| Status | Count |
|--------|-------|
| Resolved | 7 |
| Open | 0 |

---

## Resolved Issues

### ✅ — View Count Increment Not Debounced/Deduplicated `[RESOLVED]`
**Files:** [`lib/services/artwork-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/artwork-service.ts), [`app/(public)/artwork/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/artwork/[id]/page.tsx)
**Was:** Every page load called `incrementArtworkViews` with no deduplication.
**Fix:** `shouldCountArtworkView()` uses `sessionStorage` with a 24-hour TTL per artwork ID. Detail page only increments for `status === 'published'` (aligned with Firestore `isPublishedViewCountUpdate()`).

### ✅ — No Authorization Check for View Access `[RESOLVED]`
**Files:** [`app/(public)/artwork/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/artwork/[id]/page.tsx), [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules)
**Was:** Unpublished artworks could be viewed via direct URL.
**Fix:** Page-level `isPubliclyVisible()` / `canViewArtwork()` mirrors `isPublicArtworkRead()` in Firestore rules. Non-public artworks are shown only to the owning artist or admin/moderator; others see the not-found state. Firestore rules enforce reads at the database layer.

### ✅ — Hero Link on Home Uses Slugs, Not IDs `[RESOLVED]`
**File:** [`app/(public)/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/page.tsx)
**Was:** Hero CTA linked to `/artwork/the-silent-ascetic` (slug), which 404'd against Firestore document IDs.
**Fix:** `BuyerHomePage` fetches `getFeaturedArtworks(1)` and links to `/artwork/{id}` when a featured artwork exists; falls back to `/marketplace` otherwise.

### ✅ — Missing Error/Not Found State `[RESOLVED]`
**File:** [`app/(public)/artwork/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/artwork/[id]/page.tsx)
**Was:** No user-friendly state when artwork is missing or inaccessible.
**Fix:** "Artwork Not Found" empty state with link back to KalaMarket. Permission errors and invalid IDs land here as well.

### ✅ — `<img>` Tags Used `[RESOLVED]`
**File:** [`app/(public)/artwork/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/artwork/[id]/page.tsx)
**Was:** Detail gallery used raw `<img>` tags.
**Fix:** Main image and thumbnails use `next/image` with `fill`, `sizes`, and `priority` on the primary image. Remote domains configured in `next.config.ts`.

### ✅ — Stale Artwork Flash on Navigation `[RESOLVED]`
**File:** [`app/(public)/artwork/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/artwork/[id]/page.tsx)
**Was:** Navigating between `/artwork/{id}` URLs kept the previous artwork visible while loading.
**Fix:** `useEffect` resets `isLoading`, `artwork`, and `activeImageIndex` when `artworkId` changes.

### ✅ — Public Profile Portfolio Exposed Unpublished Artworks `[RESOLVED]`
**Files:** [`app/(public)/profile/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/profile/[id]/page.tsx), [`lib/repositories/firestore/artwork.repository.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/artwork.repository.ts), [`lib/services/artwork-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/artwork-service.ts), [`firestore.indexes.json`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.indexes.json)
**Was:** Public artist profiles loaded all artworks via `getArtworksByArtist`, exposing draft/pending/rejected items in the portfolio grid.
**Fix:** Public visitors use `getPublishedArtworksByArtist()` (`findPublishedByArtist` query). Profile owner and admin/moderator still see all artworks via `getArtworksByArtist()`.

---

## Related Fixes (Other Audits)

- **Artist artwork editing** — resolved in [`ARTIST_DASHBOARD_ISSUES.md`](ARTIST_DASHBOARD_ISSUES.md) via `/dashboard/artist/edit/[id]`.

---

## Operational Notes

- Deploy the `artistId` + `status` + `createdAt` composite index from `firestore.indexes.json` before relying on `findPublishedByArtist` in production.
- View dedup is per browser session (not cross-device); acceptable for popularity metrics.
- Visibility guard on the detail page must stay aligned with `isPublicArtworkRead()` if Firestore rules change.
