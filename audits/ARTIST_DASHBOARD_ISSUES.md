# Artist Dashboard — Issue Report

> **Files:** [`app/dashboard/artist/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/page.tsx), [`app/dashboard/artist/layout.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/layout.tsx), [`app/dashboard/artist/edit/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/edit/[id]/page.tsx), [`app/dashboard/artist/verify/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/verify/page.tsx), [`app/dashboard/artist/upload/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/upload/page.tsx)
> **Services:** [`lib/services/artwork-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/artwork-service.ts), [`lib/services/admin-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/admin-service.ts)
>
> **Last updated:** 2026-06-30 — verification Firestore write, search/filter, artist role guard

---

## Summary

The Artist Dashboard provides artwork inventory management, upload, editing, and verification application. All documented issues are resolved.

| Status | Count |
|--------|-------|
| Resolved | 5 |
| Open | 0 |

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

### ✅ M-02 — Artist Verification Form is Mock `setTimeout` `[RESOLVED]`
**File:** [`app/dashboard/artist/verify/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/verify/page.tsx)
**Was:** `handleSubmit` used `setTimeout` to simulate submission; nothing was written to `artistVerifications`.
**Fix:** Form calls `submitVerification()` with mapped fields (`artForm`, `experience`, `portfolio`, `statement`). On load, `getVerificationByArtist()` shows pending-review state or allows re-apply after rejection. Submissions appear in admin verification queue.

### ✅ — Artist Dashboard Search and Filters Non-Functional `[RESOLVED]`
**File:** [`app/dashboard/artist/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/page.tsx)
**Was:** Search input and Filter button had no state or handlers.
**Fix:** Client-side search (title, category, medium, tags) and status filter dropdown. Metric cards show total inventory; table renders filtered results with empty-state message.

### ✅ — Upload Page Lacks Role Guard on Direct Navigation `[RESOLVED]`
**File:** [`app/dashboard/artist/layout.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/layout.tsx)
**Was:** Any authenticated user could open `/dashboard/artist/upload` and other artist routes.
**Fix:** Shared artist segment layout wraps all `/dashboard/artist/*` routes with `AuthGuard requiredRole="artist"`, redirecting non-artists to `/dashboard`.

---

## Open Issues

None.
