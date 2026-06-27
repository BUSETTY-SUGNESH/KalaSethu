# KalaMarket / Marketplace — Issue Report

> **Files:** [`app/(public)/marketplace/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/marketplace/page.tsx), `MarketplaceClient.tsx`
> **Services:** `artwork-service.ts`, `artwork.repository.ts`

---

## Summary
The Marketplace is the most functional page in the application. It correctly queries Firestore for published artworks, implements category filtering, search, sort, and pagination. However, several underlying data layer issues exist.

---

## Issues

### 🟠 H-10 — Missing Composite Firestore Indexes `[EXISTING]`
**Description:** `findPublished` in `artwork.repository.ts` builds dynamic queries combining `status` + `category` + `medium` + sort field. When filtering by `medium` and sorting by `price` or `viewCount`, Firestore will throw a "requires an index" error because no composite index is defined for these combinations.
**Impact:** Users filtering by medium and sorting by price/popularity will see crashes.

### 🟡 M-01 — Search Case-Sensitivity Breaks Results `[EXISTING]`
**File:** [`artwork.repository.ts:L138-151`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/artwork.repository.ts#L138-L151)
**Description:** The `searchArtworks` method converts search terms to Title Case before querying. Firestore string queries are case-sensitive. If artwork titles are stored as lowercase or mixed case, the Title Case query will miss them entirely.

### 🔵 — No Debouncing on Search Input `[NEW]`
**Description:** The search input in the header fires `setSearchQuery` on every keystroke, and the marketplace page reacts to query changes by executing Firestore queries. With a 20-character search term, this triggers 20 separate Firestore read operations.
**Impact:** Excessive Firestore reads and costs; poor perceived performance.

### 🔵 — Three Parallel Queries Per Search `[NEW]`
**File:** [`artwork.repository.ts:L173-177`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/artwork.repository.ts#L173-L177)
**Description:** Every search executes three parallel queries (title prefix, artist name prefix, category exact match). Combined with no debouncing, a single search term generates dozens of Firestore reads.

### 🔵 — `<img>` Instead of Next.js `<Image>` `[NEW]`
**Description:** Artwork cards use raw `<img>` tags. This misses Next.js automatic image optimization (WebP conversion, lazy loading, responsive sizing, blur placeholders).

### 🔵 — `marketplaceCache` Stores `lastDoc: unknown` `[NEW]`
**File:** [`ui-store.ts:L55`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/stores/ui-store.ts#L55)
**Description:** The marketplace cache in the UI store types `lastDoc` as `unknown`, losing the Firestore `DocumentSnapshot` type. This can cause type errors if the cached cursor is reused across sessions or after serialization.
