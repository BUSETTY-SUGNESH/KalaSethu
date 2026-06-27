# Artist Dashboard — Issue Report

> **Files:** `app/dashboard/artist/page.tsx`, [`app/dashboard/artist/verify/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/verify/page.tsx), `app/dashboard/artist/upload/page.tsx`
> **Services:** `artwork-service.ts`, `user-service.ts`

---

## Summary
The Artist Dashboard provides artwork inventory management and upload functionality. The upload flow is functional. However, the verification page is a mock, search/filter is non-functional, and there is no artwork edit capability.

---

## Issues

### 🟡 M-02 — Artist Verification Form is Mock `setTimeout` `[EXISTING]`
**File:** [`dashboard/artist/verify/page.tsx:L23-39`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/verify/page.tsx#L23-L39)
**Description:** The `handleSubmit` function uses `setTimeout(() => { ... }, 1500)` to simulate submission. It shows a success toast and redirects but never writes to the `/artistVerifications` Firestore collection. The verification request is completely lost.
**Impact:** Artists believe their verification is submitted, but nothing reaches the admin panel. This breaks the entire verification workflow.

### 🟡 — Artist Dashboard Search and Filters Non-Functional `[EXISTING]`
**Description:** The artist dashboard page has search and filter inputs that are static — no state binding or query handlers are wired.
**Impact:** Artists with many artworks cannot find or filter their inventory.

### 🟡 — No Artwork Edit Route or Handler `[EXISTING]`
**Description:** There is no `/dashboard/artist/edit/[id]` route. The artist dashboard provides no way to edit existing artwork details after creation. The only available actions are status changes (publish/archive) and deletion.
**Impact:** Artists must delete and re-upload artworks to correct errors.

### 🔵 — Upload Page Lacks Role Guard on Direct Navigation `[NEW]`
**Description:** While the artist dashboard layout may have a guard, direct navigation to `/dashboard/artist/upload` by a non-artist user could render the upload form. The form would fail at the service layer (missing `artistId`), but it's better practice to guard at the route level.

### 🔵 — No Confirmation Dialog for Artwork Deletion `[NEW]`
**Description:** Artwork deletion likely happens via a single click without a confirmation modal, risking accidental permanent deletion.
