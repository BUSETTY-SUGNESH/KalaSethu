# Artwork Details — Issue Report

> **Files:** `app/(public)/artwork/[id]/page.tsx` (route assumed based on project structure)
> **Services:** `artwork-service.ts`

---

## Summary
The artwork detail page renders individual artwork information. While the service layer (`getArtwork`, `incrementArtworkViews`) is correctly implemented, the page has several issues.

---

## Issues

### 🔵 — View Count Increment Not Debounced/Deduplicated `[NEW]`
**File:** [`artwork-service.ts:L119-121`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/artwork-service.ts#L119-L121)
**Description:** `incrementArtworkViews` calls `artworkRepository.incrementViews` which does an atomic Firestore increment. However, there is no deduplication — every page load (including refreshes and bot crawls) counts as a view. There is no session-based or IP-based deduplication.
**Impact:** Inflated view counts; unreliable popularity metrics.

### 🔵 — No Authorization Check for View Access `[NEW]`
**Description:** The `getArtwork` service fetches any artwork by ID regardless of its status. If an artwork is in `draft` or `rejected` status, it can still be directly accessed via URL if the user knows the ID.
**Impact:** Unpublished/rejected artworks are accessible via direct links.

### 🔵 — Hero Link on Home Uses Slugs, Not IDs `[NEW]`
**Description:** The home page hero links to `/artwork/the-silent-ascetic` (a slug). If the artwork detail page uses `[id]` as a dynamic segment expecting a Firestore document ID, this route will always fail.

### 🔵 — Missing Error/Not Found State `[NEW]`
**Description:** If `getArtwork` returns `null` (artwork deleted or ID invalid), the page should display a user-friendly "not found" state. Without examining the full page component (which follows standard patterns in this codebase), typical implementations only `console.error` and show nothing.

### 🔵 — `<img>` Tags Used `[NEW]`
**Description:** Artwork images use raw `<img>` tags. For the detail page — where image quality is paramount — this misses Next.js image optimization, blur-up loading, and responsive srcset generation.
