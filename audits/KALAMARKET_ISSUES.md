# KalaMarket / Marketplace — Issue Report

> **Files:** [`app/(public)/marketplace/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/marketplace/page.tsx), [`MarketplaceClient.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/marketplace/MarketplaceClient.tsx), [`CategoryCollectionCard.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/cards/CategoryCollectionCard.tsx)
> **Services:** [`artwork-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/artwork-service.ts), [`artwork-admin.service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/server/artwork-admin.service.ts), [`artwork.repository.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/artwork.repository.ts)
> **Constants:** [`lib/constants/artwork-categories.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/constants/artwork-categories.ts)
>
> **Last updated:** 2026-06-29 — KalaMarket audit fix pass + dynamic categories from Firestore

---

## Summary

KalaMarket queries Firestore for published artworks with category filtering (by slug), debounced search, sort, and pagination. A fix pass resolved all issues from the original audit plus replaced hardcoded placeholder categories with Firestore-aggregated category summaries.

| Status | Count |
|--------|-------|
| Resolved | 8 |
| Open | 4 |

---

## Resolved Issues

### ✅ H-10 — Missing Composite Firestore Indexes `[RESOLVED]`
**File:** [`firestore.indexes.json`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.indexes.json)
**Was:** `findPublished` combining `status` + `medium` + `orderBy(price|viewCount)` could crash with "requires an index".
**Fix:** Added six composite indexes for `status + medium + price/viewCount` and `status + category + medium + price/viewCount` combinations. Deploy with `firebase deploy --only firestore:indexes`.

### ✅ M-01 — Search Case-Sensitivity Breaks Results `[RESOLVED]`
**File:** [`lib/repositories/firestore/artwork.repository.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/artwork.repository.ts)
**Was:** `searchArtworks` queried only Title Case prefixes; Firestore prefix search is case-sensitive.
**Fix:** `getSearchTermVariants()` runs title/artist prefix queries for original, title-case, and lowercase variants; results merged and deduped by ID. Also documented in [`SERVICES_REPOS_ISSUES.md`](SERVICES_REPOS_ISSUES.md).

### ✅ — No Debouncing on Search Input `[RESOLVED]`
**File:** [`MarketplaceClient.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/marketplace/MarketplaceClient.tsx)
**Was:** Header `setSearchQuery` on every keystroke triggered immediate Firestore searches.
**Fix:** 500ms `setTimeout` debounce in the search `useEffect` before calling `searchArtworks`. Firestore reads occur once per paused typing session, not per character.

### ✅ — Three Parallel Queries Per Search `[RESOLVED]`
**File:** [`lib/repositories/firestore/artwork.repository.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/artwork.repository.ts)
**Was:** Up to 9 reads per search (3 case variants × 3 query types: title, artist, category).
**Fix:** Category exact-match runs once per search using `findMatchingCategorySlugs()` against real artwork slugs. Prefix queries still use all case variants. Typical reads: 5–7 per debounced search (down from 9).

### ✅ — `<img>` Instead of Next.js `<Image>` `[RESOLVED]`
**Files:** [`ArtworkCard.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/cards/ArtworkCard.tsx), [`CategoryCollectionCard.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/cards/CategoryCollectionCard.tsx)
**Was:** Artwork cards used raw `<img>` tags.
**Fix:** Marketplace grid uses `ArtworkCard` with `next/image`. Curated collection tiles use `CategoryCollectionCard` with `next/image`.

### ✅ — `marketplaceCache` Stores `lastDoc: unknown` `[RESOLVED]`
**Files:** [`lib/firebase/firestore.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/firebase/firestore.ts), [`lib/stores/ui-store.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/stores/ui-store.ts), [`MarketplaceClient.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/marketplace/MarketplaceClient.tsx)
**Was:** `lastDoc: unknown` lost type safety for pagination cursors.
**Fix:** Introduced `ArtworkPaginationCursor` (`DocumentSnapshot | string | number | null`) covering SSR primitive cursors and client `DocumentSnapshot` cursors. Removed `lastDoc as any` in `handleLoadMore`.

### ✅ — Hardcoded Placeholder Categories `[RESOLVED]`
**Files:** [`MarketplaceClient.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/marketplace/MarketplaceClient.tsx), [`lib/constants/artwork-categories.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/constants/artwork-categories.ts), [`artwork-admin.service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/server/artwork-admin.service.ts)
**Was:** Filter dropdown and Curated Collections used legacy names (`Chola Bronzes`, `Mithila`, etc.) and static external image URLs that did not match artwork `category` slugs in Firestore (`paintings`, `bronze`, …).
**Fix:**
- Canonical 6-category slug/label list shared with artist upload/edit forms.
- `getMarketplaceCategorySummaries()` / `getMarketplaceCategorySummariesServer()` aggregate published counts and representative cover images per category from Firestore.
- SSR passes `initialCategories`; client refetches on mount for in-session freshness.
- Filter stores slug in `activeCategory`; UI displays label and count.
- Curated Collections rendered dynamically via `CategoryCollectionCard`.
- `?category={slug}` URL param sync via `useSearchParams` (breadcrumb links from artwork detail work).
- Search category matching uses `findMatchingCategorySlugs()` for slug/label partial match.

### ✅ — Category Display Labels `[RESOLVED]`
**Files:** [`artwork/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/artwork/[id]/page.tsx), [`admin/moderation/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/moderation/page.tsx)
**Was:** Breadcrumb and moderation table showed raw slugs (`paintings`, `bronze`).
**Fix:** `getCategoryLabel()` displays human-readable names (`Paintings & Miniatures`, `Sculpture & Bronze`, etc.).

---

## Open Issues

### 🔵 — Header Search Updates Store Per Keystroke `[LOW]`
**File:** [`Header.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/layout/Header.tsx)
**Description:** `setSearchQuery` still fires on every keystroke. Firestore calls are debounced in `MarketplaceClient`, but the filter `useEffect` still re-runs on each character.
**Impact:** Minor unnecessary React work; no excess Firestore reads.

### 🔵 — Search Scalability `[LOW]`
**Description:** Prefix + case-variant queries still cost 5–7 Firestore reads per debounced search.
**Mitigation:** Long-term fix is normalized `searchTokens` field on artwork write (noted in [`SERVICES_REPOS_ISSUES.md`](SERVICES_REPOS_ISSUES.md)).

### 🔵 — SSR vs Client Pagination Cursor Mismatch `[LOW]`
**Description:** Server pagination returns primitive cursors (`createdAt`, `price`, `viewCount`); client `paginatedQuery` returns `DocumentSnapshot`. Both work via `startAfter` but shapes differ.
**Impact:** Type union handles this today; full unification would require aligning `artwork-admin.service.ts` with client pagination.

### 🔵 — Legacy Artwork Category Values `[DATA]`
**Description:** Artworks published before the slug schema may have old category strings (e.g. `Chola Bronzes`, `Mithila`). These will not match new slug-based filters until re-categorized.
**Mitigation:** Optional one-time Firestore migration script mapping legacy values to canonical slugs.

---

## Operational Notes

- Deploy Firestore indexes after pulling: `firebase deploy --only firestore:indexes` (new medium+sort indexes take minutes to build).
- Marketplace page is `force-dynamic` — category counts and cover images refresh on each navigation.
- Category aggregation adds ~12 Firestore reads per marketplace load (6 counts + 6 representative images), parallelized.
- Medium filter is supported in the repository but not exposed in marketplace UI; indexes are forward-looking.
- Upload/edit forms, marketplace filters, and search all use the same canonical slugs from `ARTWORK_CATEGORIES`.

---

## Manual QA Checklist

- [ ] Filter dropdown shows 6 labels with counts; selecting one filters New Arrivals
- [ ] Curated Collections shows 6 dynamic tiles with real thumbnails and artwork counts
- [ ] `/marketplace?category=textiles` pre-selects Textiles & Weaves
- [ ] Search `"bronze"` or `"Sculpture"` returns bronze-category artworks
- [ ] Load More pagination works after initial SSR load
- [ ] Navigate to artwork detail and back — list/scroll cache restores
- [ ] Artwork breadcrumb category link filters marketplace correctly
