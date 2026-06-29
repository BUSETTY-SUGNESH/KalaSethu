# Artist Dashboard — Issue Report

> **Files:** [`app/dashboard/artist/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/page.tsx), [`app/dashboard/artist/edit/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/edit/[id]/page.tsx), [`app/dashboard/artist/verify/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/verify/page.tsx), [`app/dashboard/artist/upload/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/upload/page.tsx)
> **Services:** [`lib/services/artwork-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/artwork-service.ts), `user-service.ts`
>
> **Last updated:** 2026-06-29 — artwork edit route + ownership guards

---

## Summary

The Artist Dashboard provides artwork inventory management and upload functionality. The upload flow is functional. Artwork editing is now available. Remaining issues are verification mock, non-functional search/filter, and upload role guard.

| Status | Count |
|--------|-------|
| Resolved | 2 |
| Open | 4 |

---

## Resolved Issues

### ✅ — No Artwork Edit Route or Handler `[RESOLVED]`
**Files:** [`app/dashboard/artist/edit/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/edit/[id]/page.tsx), [`app/dashboard/artist/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/page.tsx), [`lib/services/artwork-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/artwork-service.ts)
**Was:** No `/dashboard/artist/edit/[id]` route; artists had to delete and re-upload to fix errors.
**Fix:** Edit page mirrors upload form UI. Artists edit title, description, price, category, medium, dimensions, year, tags, and images. `getArtworkForArtistEdit()` and `updateArtistArtwork()` enforce ownership; sold artworks are read-only. Edit button added to the studio inventory table. Firestore rules continue to block client status bypass.

### ✅ — No Confirmation Dialog for Artwork Deletion `[RESOLVED]`
**File:** [`app/dashboard/artist/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/page.tsx)
**Was:** Audit assumed deletion happened without confirmation.
**Fix:** `handleDelete` uses `window.confirm()` before calling `deleteArtwork`.

---

## Open Issues

### 🟡 M-02 — Artist Verification Form is Mock `setTimeout` `[EXISTING]`
**File:** [`dashboard/artist/verify/page.tsx:L23-39`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/verify/page.tsx#L23-L39)
**Description:** The `handleSubmit` function uses `setTimeout(() => { ... }, 1500)` to simulate submission. It shows a success toast and redirects but never writes to the `/artistVerifications` Firestore collection. The verification request is completely lost.
**Impact:** Artists believe their verification is submitted, but nothing reaches the admin panel. This breaks the entire verification workflow.

### 🟡 — Artist Dashboard Search and Filters Non-Functional `[EXISTING]`
**Description:** The artist dashboard page has search and filter inputs that are static — no state binding or query handlers are wired.
**Impact:** Artists with many artworks cannot find or filter their inventory.

### 🔵 — Upload Page Lacks Role Guard on Direct Navigation `[NEW]`
**Description:** While the artist dashboard layout may have a guard, direct navigation to `/dashboard/artist/upload` by a non-artist user could render the upload form. The form would fail at the service layer (missing `artistId`), but it's better practice to guard at the route level.
