# Auth (Login, Signup, Onboarding) — Issue Report

> **Status:** All issues below are **resolved in code** (2026-06-27). See [Remaining Ops Steps](#remaining-ops-steps) for production deployment.
>
> **Files:** `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/(onboarding)/role/page.tsx`
> **Components:** [`AuthProvider.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/providers/AuthProvider.tsx), [`AuthGuard.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/guards/AuthGuard.tsx)
> **Stores:** [`auth-store.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/stores/auth-store.ts)
> **Cloud Functions:** `onUserCreated` in [`auth.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/auth.ts)

---

## Summary

Authentication is functional (email/password, Google sign-in, phone OTP). All audit issues have been fixed:

- Role assignment on user creation aligned with frontend types
- Offline auth fallback uses cached profiles instead of synthetic permissions
- AuthGuard redirect loop risk eliminated
- Initial auth loading flash removed
- Global `isBanned` enforcement and dashboard route protection added

---

## Issues

### ✅ H-01 — Backend Assigns `'collector'` Role Not in Frontend Type `[RESOLVED]`

**File:** [`functions/src/auth.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/auth.ts)

**Original problem:** `onUserCreated` set `role: 'collector'`, which is not in the frontend `UserRole` union. `hasRole('user')` returned `false` for backend-created profiles.

**Resolution:**
- `onUserCreated` now sets `role: "user"` with full `User` defaults (`isBanned`, `isEmailVerified`, counters, etc.)
- `normalizeUser()` in [`user.repository.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/repositories/firestore/user.repository.ts) maps legacy `collector` → `user` on all reads

---

### ✅ H-14 — AuthProvider Offline Fallback Creates False Permissions `[RESOLVED]`

**File:** [`AuthProvider.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/providers/AuthProvider.tsx)

**Original problem:** Offline fallback synthesized a profile with `role: 'user'` and `isBanned: false`, granting false permissions.

**Resolution:**
- [`profile-cache.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/auth/profile-cache.ts) caches last-known profile in `sessionStorage` on successful login
- Offline/unavailable: uses cached profile if available; otherwise `clearAuth()` (no fabricated permissions)
- Cache cleared on logout via `clearAuth()` in [`auth-store.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/stores/auth-store.ts)

---

### ✅ L-11 — AuthGuard Redirect Loop Potential `[RESOLVED]`

**File:** [`AuthGuard.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/guards/AuthGuard.tsx)

**Original problem:** Insufficient-role redirect hardcoded to `/dashboard`, risking infinite loops if dashboard required a higher role.

**Resolution:**
- Added `roleRedirectTo` prop (default `'/'`)
- [`admin/layout.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/layout.tsx) passes `roleRedirectTo="/dashboard"` to preserve existing non-admin behavior

---

### ✅ L-15 — Flash of Unauthenticated Content `[RESOLVED]`

**File:** [`AuthProvider.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/providers/AuthProvider.tsx)

**Original problem:** Children rendered immediately while `isLoading === true`, causing a brief logged-out UI flash.

**Resolution:** `AuthProvider` returns `null` until `isLoading === false`, then renders children.

---

### ✅ L-16 — `hydrateCart` in AuthProvider's useEffect Dependencies `[RESOLVED]`

**File:** [`AuthProvider.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/providers/AuthProvider.tsx)

**Original problem:** `hydrateCart` in the dependency array was unnecessary noise.

**Resolution:** Removed from deps; mount-only call retained with eslint comment.

---

## Follow-Up Backlog (also resolved)

### ✅ Global `isBanned` enforcement

**Files:** [`banned-user.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/auth/banned-user.ts), [`AuthProvider.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/providers/AuthProvider.tsx), [`app/(auth)/banned/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(auth)/banned/page.tsx)

- `rejectIfBanned()` signs out, clears cache, and redirects to `/banned`
- Enforced after both fresh Firestore load and offline cached profile

### ✅ Dashboard route protection

**File:** [`app/dashboard/layout.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/layout.tsx)

- All `/dashboard/*` routes wrapped in `<AuthGuard requiredRole="user" redirectTo="/login">`

### ✅ Legacy role migration script (optional)

**File:** [`scripts/migrate-collector-roles.mjs`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/scripts/migrate-collector-roles.mjs)

```bash
npm run migrate:collector-roles:dry-run
npm run migrate:collector-roles
```

---

## Remaining Ops Steps

These are deployment/maintenance tasks, not code gaps:

| Step | Command / action |
|------|------------------|
| Deploy updated cloud function | `firebase deploy --only functions:onUserCreated` |
| Optional bulk DB migration | `npm run migrate:collector-roles` (after dry-run) |
| Verify new signup role | Create test account → confirm Firestore `users/{uid}.role === "user"` |

---

## Known Edge Cases

| Risk | Notes |
|------|-------|
| Stale offline cache | User banned while offline may retain cached access until Firestore reconnects |
| Client-side auth only | Route protection relies on `AuthProvider` + `AuthGuard`; no server-side session middleware |
| Cloud function deploy | Production new signups use old behavior until `onUserCreated` is redeployed |
