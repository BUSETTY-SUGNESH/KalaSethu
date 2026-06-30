# Customer/Collector Dashboard — Issue Report

> **Files:** [`app/dashboard/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/page.tsx), [`app/dashboard/collector/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/collector/page.tsx), [`lib/services/collector-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/collector-service.ts)

---

## Summary

The Customer Dashboard consists of an overview page and a collector gallery page. **All audit issues below are resolved.** Both pages are client components that fetch user-specific data from Firestore via existing services (`order-service`, `auction-service`, `community-service`) and a shared [`collector-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/collector-service.ts) layer.

**Collection data source:** Delivered/completed marketplace order items plus auction wins (`winnerId === user.id`), deduplicated by `artworkId`. The Firestore `collections` collection remains unused (no repository); purchases are derived from orders and bids as intended.

---

## Issues

### ✅ M-03 — Dashboard Overview Shows Hardcoded Data for "Aakash" `[RESOLVED]`
**File:** [`dashboard/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/page.tsx)
**Was:** The heading read "Welcome, Aakash" regardless of the logged-in user. Stats, recent activity, and "Updates from Artists" were static.
**Fix:** Converted to `'use client'`. Loads `getCollectorDashboardData(user.id)` on mount. Welcome uses `user.displayName`; metrics come from real collection items and `getUserBidAnalytics`; activity merges recent bids and orders; artist updates filter feed posts by followed artists. Skeleton loading and empty states added.
**Files changed:** `app/dashboard/page.tsx`, `lib/services/collector-service.ts`

### ✅ M-04 — Collector Dashboard Shows Static Artwork Cards `[RESOLVED]`
**File:** [`dashboard/collector/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/collector/page.tsx)
**Was:** Three hardcoded artwork entries with Google placeholder images; no Firestore queries.
**Fix:** Fetches `getCollectorItems(user.id)` — delivered/completed order items and auction wins — and renders via `ArtworkCard`. Empty state links to marketplace; skeleton loading on fetch.
**Files changed:** `app/dashboard/collector/page.tsx`, `lib/services/collector-service.ts`

### ✅ Dashboard Overview is a Server Component Without Data Fetching `[RESOLVED]`
**File:** [`dashboard/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/page.tsx)
**Was:** Server Component with no `async` data fetching.
**Fix:** Client component with `useEffect` + `useAuthStore`, following the same pattern as `orders/page.tsx` and `saved/page.tsx`.
**Files changed:** `app/dashboard/page.tsx`

### ✅ Collector Search Input is Unbound `[RESOLVED]`
**File:** [`dashboard/collector/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/collector/page.tsx)
**Was:** Search input had no `value`, `onChange`, or state binding.
**Fix:** `searchQuery` state + `useMemo` filter by title/artist; "Clear Search" empty state when no matches.
**Files changed:** `app/dashboard/collector/page.tsx`

### ✅ Dashboard Overview Button Uses `href` Prop on `Button` Component `[RESOLVED — PRE-EXISTING]`
**File:** [`app/components/ui/Button.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/ui/Button.tsx)
**Was:** Concern that `href` on `Button` might not render a navigable link.
**Fix:** Already handled — `Button` renders `<Link href={href}>` when `href` is passed (lines 63–68). No change required; overview CTA `href="/explore"` works correctly.

---

## Verification

| Check | Status |
|-------|--------|
| Welcome name reflects logged-in user | ✅ |
| Metrics from real orders/bids | ✅ |
| Collector gallery from real purchases/wins | ✅ |
| Both pages are client components with data fetching | ✅ |
| Search filters collection client-side | ✅ |
| "Discover New Art" navigates to `/explore` | ✅ |
| TypeScript (`npx tsc --noEmit`) | ✅ |

**Manual smoke test recommended:** Log in with accounts that have completed orders, active bids, followed artists, and an empty collection to confirm empty states.

---

## Remaining Issues

None from this audit.

---

## Regression Risks

| Risk | Mitigation |
|------|------------|
| Extra Firestore reads on dashboard load | Page sizes capped (orders/bids 50, feed 20); parallel fetches |
| `getUserBidAnalytics` Cloud Function failure | Falls back to `EMPTY_BID_ANALYTICS` |
| Partial fetch failure | Errors logged; page renders with defaults/empty states |
| Auction wins only among bid-on auctions | Expected domain behavior |

**Deployment:** No infra changes expected. Re-test if Firestore index errors appear at runtime.
