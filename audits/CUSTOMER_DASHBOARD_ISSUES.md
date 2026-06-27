# Customer/Collector Dashboard — Issue Report

> **Files:** [`app/dashboard/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/page.tsx), [`app/dashboard/collector/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/collector/page.tsx)

---

## Summary
The Customer Dashboard consists of an overview page and a collector gallery page. **Both are entirely static** with hardcoded data — no Firestore queries, no real user data.

---

## Issues

### 🟡 M-03 — Dashboard Overview Shows Hardcoded Data for "Aakash" `[EXISTING]`
**File:** [`dashboard/page.tsx:L10`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/page.tsx#L10)
**Description:** The heading reads "Welcome, Aakash" regardless of the logged-in user. The stats (Total Collection: 12, Active Bids: 3, Est. Value: ₹8.5L) are hardcoded. Recent activity and "Updates from Artists" sections show static content.
**Impact:** No user sees their actual dashboard data. The page is entirely decorative.

### 🟡 M-04 — Collector Dashboard Shows Static Artwork Cards `[EXISTING]`
**File:** [`dashboard/collector/page.tsx:L24-27`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/collector/page.tsx#L24-L27)
**Description:** The collector gallery shows three hardcoded artwork entries (Terracotta Vessel, Madhubani Krishna, Stone Nandi) with Google placeholder images. No Firestore query is executed to fetch the user's actual purchased artworks.
**Impact:** Collectors see fake collection data instead of their actual purchases.

### 🔵 — Dashboard Overview is a Server Component Without Data Fetching `[NEW]`
**File:** [`dashboard/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/page.tsx)
**Description:** This page is a Server Component (no `'use client'` directive). Yet it renders static JSX without any `async` data fetching. It should either be a Client Component that fetches user-specific data, or use SSR with Firebase Admin SDK.

### 🔵 — Collector Search Input is Unbound `[NEW]`
**File:** [`dashboard/collector/page.tsx:L18`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/collector/page.tsx#L18)
**Description:** The "Search collection..." input has no `value`, `onChange`, or any state binding.

### 🔵 — Dashboard Overview Button Uses `href` Prop on `Button` Component `[NEW]`
**File:** [`dashboard/page.tsx:L15`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/page.tsx#L15)
**Description:** `<Button variant="primary" icon="explore" href="/explore">` passes an `href` prop. If the Button component doesn't handle `href` (rendering as an `<a>` tag), this will render a non-navigable button.
