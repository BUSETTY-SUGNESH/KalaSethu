# CharchaSabha / Community Page — Issue Report

> **Files:** [`app/(public)/community/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/community/page.tsx)
> **Services:** [`community-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/community-service.ts)
> **Repository:** [`community.repository.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/community.repository.ts)
> **Component:** [`RoleBadge.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/community/RoleBadge.tsx)
> **Indexes:** [`firestore.indexes.json`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.indexes.json)

---

## Summary

The Community page (CharchaSabha) fetches posts from Firestore and renders them correctly. All mutation flows (create post, filter tabs, seller tools), dynamic sidebar data, role-badge semantics, and required Firestore composite indexes are in place. Discord-style artist communities and direct messaging were not modified.

---

## Issues

### ✅ M-08 — "Post Discussion" Button Has No Submit Handler `[RESOLVED]`
**File:** `app/(public)/community/page.tsx`
**Resolution:** `handlePostDiscussion` calls `createPost()` with validation (title ≥6, content ≥20), auth guard, loading state, success/error toasts, and redirect to `/community/[id]`. Button is disabled while submitting or when fields are invalid.

### ✅ M-09 — Filter Tabs Are Non-Functional `[RESOLVED]`
**File:** `app/(public)/community/page.tsx`, `lib/services/community-service.ts`, `lib/repositories/firestore/community.repository.ts`
**Resolution:** `activeFilter` state drives tab clicks with dynamic active styling. Each tab loads distinct data:
- **Latest** → `getFeedPosts(20)` with pinned posts sorted first
- **Trending** → `getTrendingPosts(20)`
- **Techniques** / **Provenance** → `getPostsByCategory()`
- **My Posts** → `getUserPosts(user.id)` with login redirect if unauthenticated

### ✅ M-18 — Seller "Pin a Discussion" and "Announce Event" Have No Handlers `[RESOLVED]`
**File:** `app/(public)/community/page.tsx`, `app/(public)/events/page.tsx`
**Resolution:**
- **Pin a Discussion** opens a modal listing the seller's posts via `getUserPosts()`. Each row has Pin/Unpin toggles calling `pinPost()` / `unpinPost()`. Pinned posts appear at the top of the Latest feed.
- **Announce Event** navigates to `/events?create=1`. Events page reads the `create` search param and auto-opens the seller create form.

Post type extended with `isPinned`, `pinnedAt`, `pinnedBy` fields.

### ✅ — Top Contributors Are Hardcoded `[RESOLVED]`
**File:** `app/(public)/community/page.tsx`, `lib/services/community-service.ts`
**Resolution:** `getTopContributors(5)` aggregates engagement from the 100 most recent posts (score = posts×2 + comments + likes), enriches with user profiles for specialty/avatar, and renders a dynamic sidebar with profile links, avatar fallbacks, verified icons, and empty/loading states. No hardcoded external image URLs.

### ✅ — `RoleBadge` Component Has Fragile Color Logic `[RESOLVED]`
**File:** `app/components/community/RoleBadge.tsx`, `app/globals.css`
**Resolution:** Extracted `RoleBadge` to a shared component using design-system CSS classes (`.role-badge--seller`, `.role-badge--buyer`) with `color-mix()` on existing hex tokens. Removed fragile `rgba(var(--color-*-rgb, …))` inline styles.

### ✅ — `authorVerified` Used for Role Badge but Not Part of Post Type `[RESOLVED]`
**File:** `app/types/index.ts`, `lib/services/community-service.ts`, `app/(public)/community/page.tsx`
**Resolution:** `authorVerified` was already on `Post`; the bug was using it as a seller/buyer proxy. Added `authorRole?: UserRole` to `Post`, set in `createPost()` from the caller's role. Feed badges use `resolvePostRole(post)` with fallback chain: `authorRole` → `verified_artist` if `authorVerified` → `user`. Dashboard create flow also passes `authorRole`.

### ✅ — Firestore Composite Indexes for CharchaSabha Queries `[VERIFIED]`
**Files:** `firestore.indexes.json`, `lib/repositories/firestore/community.repository.ts`, `docs/database/firestore-schema.md`
**Verification:** All CharchaSabha post queries map to deployed indexes on project `kala-sethu` (confirmed via `firebase firestore:indexes` and `firebase deploy --only firestore:indexes`).

| Repository method | Firestore query | Index |
|---|---|---|
| `getFeed`, `getRecentPosts` | `orderBy('createdAt', 'desc')` | Single-field (automatic) |
| `getTrending` | `where('isTrending','==',true).orderBy('likeCount','desc')` | `isTrending` ASC + `likeCount` DESC |
| `getByAuthor` | `where('authorId','==',uid).orderBy('createdAt','desc')` | `authorId` ASC + `createdAt` DESC |
| `getByCategory` | `where('category','==',cat).orderBy('createdAt','desc')` | `category` ASC + `createdAt` DESC |

No duplicate `posts` indexes in `firestore.indexes.json`. Pinned-post sorting is client-side on the Latest feed (no extra index required).

**Note:** Techniques/Provenance tabs may appear empty for legacy posts that lack a `category` field. New discussions created via `/dashboard/community/new` or the inline form set `category` correctly.

---

## Verification Checklist

- [x] Inline "Post Discussion" creates a discussion and navigates to detail page
- [x] Latest, Trending, Techniques, Provenance, and My Posts tabs load distinct feeds
- [x] Active filter tab styling updates on click
- [x] Seller can pin/unpin own discussions via modal; pinned posts appear first on Latest
- [x] "Announce Event" opens events create form via `/events?create=1`
- [x] Top Contributors sidebar shows real users from post activity (or empty state)
- [x] Seller/Buyer badges use `authorRole`, not verification status alone
- [x] Post detail likes/comments unchanged; messaging/communities architecture untouched
- [x] Firestore composite indexes for all CharchaSabha post queries deployed (`category` + `createdAt` included)

---

## Remaining / Out of Scope

No open issues remain in this audit. Event creation form on `/events` is a separate Kalent Hub scope (stub submit handler not part of CharchaSabha audit).
