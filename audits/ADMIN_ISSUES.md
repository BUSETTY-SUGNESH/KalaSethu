# Admin Panel — Issue Report

> **Files:** [`app/admin/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/page.tsx), `app/admin/layout.tsx`, `app/admin/verification/page.tsx`, `app/admin/moderation/page.tsx`
> **Services:** `admin-service.ts`
> **Cloud Functions:** `verifyArtist`, `moderateArtwork`, `aggregateAnalytics`

---

## Summary
The Admin panel provides platform overview, pending verifications, and flagged content management. While Cloud Functions for admin actions are properly role-gated, the **frontend admin panel has no authentication guard**.

---

## Issues

### 🔴 C-06 — Admin Panel Has No AuthGuard `[NEW]`
**File:** [`app/admin/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/page.tsx)
**Description:** The admin page at `/admin` is a `'use client'` component that directly calls admin services without any `<AuthGuard requiredRole="admin">` wrapper. Any user (or even unauthenticated visitors) can navigate to `/admin` and see the rendered admin interface. While Firestore rules may block data queries, the admin UI skeleton, component structure, and API endpoint patterns are fully exposed.
**Impact:** Information disclosure; attack surface mapping; potential data exposure if Firestore rules have gaps.

### 🔴 C-07 — `admin.ts` Cloud Function Uses Separate DB Instance `[NEW]`
**File:** [`functions/src/admin.ts:L4`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/admin.ts#L4)
**Description:** `admin.ts` declares `const db = admin.firestore()` at the module level instead of importing from `config.ts`. The `config.ts` module has `if (!admin.apps.length) admin.initializeApp()`. If `admin.ts` is loaded by the Node.js runtime before `config.ts`, the `admin.firestore()` call happens before initialization, causing a crash.
**Impact:** All admin Cloud Functions (`verifyArtist`, `aggregateAnalytics`) may fail on cold starts.

### 🟡 M-22 — `aggregateAnalytics` Only Tracks 3 Basic Metrics `[NEW]`
**File:** [`functions/src/admin.ts:L76-97`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/admin.ts#L76-L97)
**Description:** The 24-hour analytics aggregation only tracks `totalUsers`, `totalArtworks`, and `totalOrders`. Missing metrics: total revenue, active auctions, active events, pending verifications, daily active users, conversion rates.
**Impact:** Admin dashboard provides minimal business intelligence.

### 🔵 — Admin Panel Layout May Not Render Sidebar `[NEW]`
**Description:** If the admin layout doesn't include the dashboard sidebar, admins navigating to `/admin` see a different layout than `/dashboard`. This creates a disjointed navigation experience.

### 🔵 — Verification Review Links All Point to `/admin/verification` `[NEW]`
**File:** [`admin/page.tsx:L122-124`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/page.tsx#L122-L124)
**Description:** The review action for each pending verification links to `/admin/verification` (the list page) rather than a specific verification detail page like `/admin/verification/{id}`. Admins must manually find the application in the list.
