# Admin Panel — Issue Report

> **Status:** All documented audit issues are **resolved in code** (2026-06-30). See [Remaining Ops Steps](#remaining-ops-steps) for production deployment.
>
> **Files:** [`app/admin/`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/), [`proxy.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/proxy.ts)
> **Services:** [`admin-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/admin-service.ts), [`feature-flags.service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/server/feature-flags.service.ts)
> **Cloud Functions:** `verifyArtist`, `moderateArtwork`, `aggregateAnalytics` in [`functions/src/admin.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/admin.ts)

---

## Summary

The Admin panel provides platform overview, pending verifications, flagged content management, user management, transactions, disputes, and system settings. All issues from the original audit have been fixed:

- **Client + server route protection** for `/admin/*` (AuthGuard + signed session cookie in `proxy.ts`)
- **Enriched analytics** (`aggregateAnalytics` + overview dashboard metrics)
- **Verification deep-links** to `/admin/verification/{id}`
- **Admin audit logging** on all mutation pages
- **Dynamic admin identity** in header (no hardcoded "Super Admin")
- **User Management** linked in sidebar nav
- **Feature flags enforced** at proxy, Firestore rules, and Cloud Functions layers

| Status | Count |
|--------|-------|
| Resolved | 10 |
| Deferred (non-critical) | 4 |

---

## Resolved Issues

### ✅ C-06 — Admin Panel Has No AuthGuard `[RESOLVED]`

**File:** [`app/admin/layout.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/layout.tsx)

**Original problem:** Admin routes had no role guard; UI was exposed to unauthenticated visitors.

**Resolution:**
- All `/admin/*` routes wrapped in `<AuthGuard requiredRole="admin" roleRedirectTo="/dashboard">`
- **Server-side enforcement added:** [`proxy.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/proxy.ts) validates signed `ks_auth` httpOnly cookie before any admin page is served; unauthenticated → `/login?redirect=...`; non-admin → `/dashboard`
- Session cookies created via [`app/api/auth/session/route.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/api/auth/session/route.ts); synced on login/logout in [`AuthProvider.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/providers/AuthProvider.tsx)

---

### ✅ C-07 — `admin.ts` Cloud Function Uses Separate DB Instance `[RESOLVED]`

**File:** [`functions/src/admin.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/admin.ts)

**Original problem:** `admin.firestore()` called at module level before guarded initialization.

**Resolution:** Imports `{ db }` from [`functions/src/config.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/config.ts) (same fix as CLOUD_FUNCTIONS_ISSUES C-07).

---

### ✅ M-22 — `aggregateAnalytics` Only Tracks 3 Basic Metrics `[RESOLVED]`

**Files:** [`functions/src/admin.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/admin.ts), [`app/admin/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/page.tsx), [`app/types/index.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/types/index.ts) (`PlatformStats`)

**Original problem:** Scheduled aggregation only wrote `totalUsers`, `totalArtworks`, `totalOrders`.

**Resolution:** `aggregateAnalytics` now computes and merges into `analytics/platform_stats`:
- `totalArtists`, `verifiedArtists`, `pendingVerifications`
- `activeAuctions`, `activeEvents`, `openDisputes`, `dailyActiveUsers`
- `totalRevenue`, `monthlyGMV`, `conversionRate`
- `userGrowth`, `revenueGrowth` (vs. prior snapshot)

Admin overview displays two rows of metric cards (9 total). Composite index added: `orders` — `paymentStatus` + `createdAt`.

---

### ✅ — Admin Panel Layout May Not Render Sidebar `[RESOLVED]`

**File:** [`app/admin/layout.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/layout.tsx)

**Resolution:** Layout renders `<Sidebar items={adminNav} />` inside `dashboard-layout`, including **User Management** → `/admin/users`.

---

### ✅ — Verification Review Links All Point to List `[RESOLVED]`

**Files:** [`app/admin/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/page.tsx), [`app/admin/verification/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/verification/[id]/page.tsx), [`app/admin/verification/VerificationApplicationCard.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/verification/VerificationApplicationCard.tsx)

**Resolution:** Overview review icons link to `/admin/verification/{id}`. Shared card component used on list and detail pages; approve/reject redirects to list on success.

---

### ✅ — Admin Audit Logging Never Called `[RESOLVED]`

**Files:** [`lib/utils/admin-audit.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/utils/admin-audit.ts), admin mutation pages (`verification`, `moderation`, `disputes`, `users`, `settings`)

**Resolution:** `safeLogAdminAction()` writes to `adminLogs` after successful mutations (`verify_artist`, `moderate_artwork`, `resolve_report`, `resolve_dispute`, `ban_user`/`unban_user`, `toggle_feature_flag`). Failures are non-blocking.

---

### ✅ — Hardcoded "Super Admin" Header Label `[RESOLVED]`

**File:** [`app/admin/AdminHeaderUser.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/AdminHeaderUser.tsx)

**Resolution:** Header displays authenticated admin `displayName` from `useAuthStore` (fallback: `"Admin"`).

---

### ✅ — Feature Flags Not Enforced at Runtime `[RESOLVED]`

**Files:** [`lib/feature-flags/constants.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/feature-flags/constants.ts), [`proxy.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/proxy.ts), [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules), [`functions/src/utils/feature-flags.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/utils/feature-flags.ts), [`app/maintenance/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/maintenance/page.tsx)

**Original problem:** Feature toggles in admin settings were stored but not enforced outside the UI.

**Resolution — three layers:**

| Flag | Proxy (route block) | Firestore rules | Cloud Functions |
|------|---------------------|-----------------|-----------------|
| `maintenance_mode` | Redirect to `/maintenance` (admins bypass) | `allowClientWrite()` blocks non-admin writes | `assertNotInMaintenance()` on checkout |
| `enable_auctions` | `/bids/*` | Auction create | `placeBid`, `updateAuction`, `cancelAuction` |
| `enable_social_feed` | `/community/*`, `/dashboard/community/*` | Posts, comments, likes create | `followUser` |
| `enable_artwork_uploads` | Upload/edit artist routes | Artwork create/update | `submitArtworkForReview` |

Flags loaded server-side via [`app/api/internal/feature-flags/route.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/api/internal/feature-flags/route.ts) (30s cache).

---

## Remaining Issues (Deferred)

### 🔵 — Moderator Role Access to Admin UI `[DEFERRED]`

Cloud Functions allow `moderator` on some actions, but the admin console requires `role === 'admin'`. Intentional unless a dedicated moderator console is product-required.

### 🔵 — E2E Test TC005 Blocked on Credentials `[DEFERRED]`

`testsprite_tests/TC005_Show_the_admin_area_only_for_authorized_access.py` cannot run without valid admin test credentials.

### 🔵 — Transactions Revenue Is Client-Estimated `[DEFERRED]`

[`app/admin/transactions/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/transactions/page.tsx) computes 5%/95% platform fee split client-side; not tied to real payment settlement data.

### 🔵 — Role Cookie Staleness After Promotion `[DEFERRED]`

`ks_auth` cookie role is set at login. Promoting a user to admin requires re-login (or session refresh) before server middleware allows `/admin` access.

---

## Regression Risks

| Risk | Mitigation |
|------|------------|
| Missing `AUTH_SESSION_SECRET` | Admin routes fail closed (redirect to login) |
| Missing `MIDDLEWARE_SECRET` | Feature flags default to enabled (non-breaking) |
| `aggregateAnalytics` cost increase | Uses `count()` where possible; batched revenue sums (500/batch) |
| Flag cache lag (~30s) | Acceptable for admin toggles; Firestore rules are immediate |

---

## Remaining Ops Steps

### Environment variables (required for server-side admin protection)

Add to `.env.local` / production:

```bash
AUTH_SESSION_SECRET=<random-32+-char-string>
MIDDLEWARE_SECRET=<random-string>
```

Generate with: `openssl rand -base64 32`

### Deployment checklist

```bash
# 1. Firestore rules (feature flag enforcement)
firebase deploy --only firestore:rules

# 2. Firestore indexes (analytics revenue query)
firebase deploy --only firestore:indexes

# 3. Cloud Functions (aggregateAnalytics + feature-flag guards)
firebase deploy --only functions

# 4. Next.js app (proxy.ts, API routes, admin UI) — deploy with env vars set
```

### Smoke tests

1. Log in as admin → `/admin` loads; header shows your display name
2. Incognito `/admin` → redirects to `/login` (no admin HTML served)
3. Non-admin `/admin` → redirects to `/dashboard`
4. Overview shows enriched metric cards after `aggregateAnalytics` runs
5. Click verification review icon → `/admin/verification/{id}`
6. Perform admin action → `adminLogs` entry created
7. Enable `maintenance_mode` → non-admin sees `/maintenance`; admin console still accessible
8. Disable `enable_auctions` → `/bids` blocked; `placeBid` callable returns error
