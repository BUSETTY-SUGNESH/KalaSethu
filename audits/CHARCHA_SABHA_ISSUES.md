# CharchaSabha / Community Page — Issue Report

> **Files:** [`app/(public)/community/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/community/page.tsx)
> **Services:** `community-service.ts`

---

## Summary
The Community page (CharchaSabha) fetches posts from Firestore and renders them correctly. However, all mutation flows (create post, filter tabs, seller tools) are non-functional stubs.

---

## Issues

### 🟡 M-08 — "Post Discussion" Button Has No Submit Handler `[NEW]`
**File:** [`community/page.tsx:L151`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/community/page.tsx#L151)
**Description:** The "Post Discussion" button in the inline form has no `onClick` handler. The form captures `newPostTitle` and `newPostContent` in React state, but never submits them to any service.
**Impact:** Users cannot create new discussions.

### 🟡 M-09 — Filter Tabs Are Non-Functional `[NEW]`
**File:** [`community/page.tsx:L165-173`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/community/page.tsx#L165-L173)
**Description:** The "Latest", "Trending", "Techniques", "Provenance", and "My Posts" filter tabs are `<button>` elements with no `onClick` handlers. The first tab appears selected via static CSS but clicking any tab does nothing. The feed always shows the default query result.
**Impact:** Users cannot filter community content.

### 🟡 M-18 — Seller "Pin a Discussion" and "Announce Event" Have No Handlers `[NEW]`
**File:** [`community/page.tsx:L264-271`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/community/page.tsx#L264-L271)
**Description:** The seller tools sidebar shows "Pin a Discussion" and "Announce Event" buttons, neither of which has an `onClick` handler.
**Impact:** Seller-specific community tools are non-functional.

### 🔵 — Top Contributors Are Hardcoded `[NEW]`
**File:** [`community/page.tsx:L238-255`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/community/page.tsx#L238-L255)
**Description:** The "Top Contributors" sidebar section shows hardcoded users (Prof. K. Iyer, Arun Sharma) with static images.

### 🔵 — `RoleBadge` Component Has Fragile Color Logic `[NEW]`
**File:** [`community/page.tsx:L14-44`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/community/page.tsx#L14-L44)
**Description:** The `RoleBadge` component uses CSS `rgba()` with custom property RGB fallbacks (`var(--color-accent-gold-rgb, 201,160,80)`) which may not be defined in the design tokens, causing incorrect colors.

### 🔵 — `authorVerified` Used for Role Badge but Not Part of Post Type `[NEW]`
**File:** [`community/page.tsx:L199`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/community/page.tsx#L199)
**Description:** The post rendering uses `post.authorVerified` to determine the role badge, but the `Post` type may not include this field, or it may always be `false` for non-verified artists.
