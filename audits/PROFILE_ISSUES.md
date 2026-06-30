# Profile & Settings — Issue Report

> **Files:** `app/(public)/profile/[id]/page.tsx`, `app/settings/ProfileSettingsForm.tsx`, `app/settings/profile/page.tsx`
> **Services:** `user-service.ts`, `lib/firebase/auth.ts`, `lib/firebase/storage.ts`
> **Last updated:** 2026-06-30 — profile security + settings UX pass

---

## Summary

The Profile page displays user information and the Settings page allows profile editing. All audit issues are resolved. Additional settings UX improvements (unsaved-changes protection, tab state persistence, back navigation) are in place. The Website/Portfolio URL field was removed from Profile Edit Settings.

---

## Security Issues

### ✅ H-02 — User Profile Metrics Are Client-Writable `[RESOLVED]`
**File:** [`firestore.rules`](../firestore.rules) — `protectedStatFields()` (L41-43), owner update guard (L208-211)
**Was:** Owner could update `followerCount`, `salesCount`, `totalRevenue`, and `artworkCount` via client SDK.
**Resolution:** Firestore rules block updates to protected stat fields; create requires all stats `== 0`. Counters updated via Cloud Functions only.

### ✅ Public Profile Exposes Email `[RESOLVED]`
**Was:** `getUserProfile` loaded full `User` (including email) on the public profile page; `showEmail` toggle was saved but not enforced.
**Resolution:** `getPublicUserProfile` / `sanitizePublicProfile` in `user-service.ts` omits email for visitors unless `preferences.privacy.showEmail` is true. Public profile page uses sanitized data and renders email only when present. `showPortfolio` privacy toggle is enforced (portfolio hidden when disabled).
**Remaining limitation:** Direct Firestore SDK reads of `users/{id}` still return email (public read rules). App-layer fix only; no rules/CF migration.

### ✅ No Profile Image Upload Validation `[RESOLVED]`
**Was:** No client or server validation on avatar uploads; SVG could bypass generic `image/*` storage rules.
**Resolution:** Client `validateImageFile` in `ProfileSettingsForm` + defense-in-depth in `uploadAvatar()`. Storage rules `isAllowedAvatarImage()` restricts avatars to JPEG/PNG/WebP/AVIF with 5MB cap.
**Deploy:** `firebase deploy --only storage` if storage rules are not yet live.

### ✅ Profile Settings Not Protected by Re-authentication `[RESOLVED]`
**Was:** `changePassword` called `updatePassword` without re-authentication.
**Resolution:** `reauthenticateWithPassword` runs before `updatePassword` when the account has a password provider. Settings form requires current password. Google-only accounts see an informational note instead of a password form. Email field remains disabled (no email-change flow).

---

## Settings UX Improvements

### ✅ Unsaved Changes Lost on Tab Switch `[RESOLVED]`
**Was:** `useEffect` re-hydrated profile data from `user` whenever `activeTab` changed, wiping in-progress edits and avatar preview.
**Resolution:** Form state hydrates only when `user.id` changes. Tab switches preserve profile fields, security preferences, password inputs, address form drafts, and avatar preview (blob URL). Avatar uploads only on **Save Profile**.

### ✅ No Unsaved-Changes Protection on Navigate Away `[RESOLVED]`
**Was:** Leaving settings silently discarded pending edits.
**Resolution:** Dirty-state detection across profile, security/privacy, and in-progress address forms. `beforeunload` for browser close/refresh. Confirmation modal for Back button and View Profile navigation (Stay / Discard / Leave without saving). Tab switches do not prompt.

### ✅ Missing Back Navigation `[RESOLVED]`
**Was:** No way to return to the previous page from settings.
**Resolution:** Back button at top of `ProfileSettingsForm` uses `router.back()` with fallback to `/profile/{id}` or `/dashboard`.

### ✅ React Border Style Warnings `[RESOLVED]`
**Was:** Mixed `border` shorthand with `borderBottom`/`borderTop` on the same elements (tabs, dividers, profile header).
**Resolution:** Longhand border properties used consistently in `ProfileSettingsForm.tsx` and public profile header.

---

## Feature Removals

### ✅ Website/Portfolio URL Field Removed `[RESOLVED]`
**Was:** Profile Edit Settings included a Website URL field (state, validation, save/load).
**Resolution:** Removed from `ProfileSettingsForm.tsx` (UI, state, dirty check, save payload) and `website` removed from `User` type in `app/types/index.ts`. Legacy `website` values may remain in Firestore but are no longer read or written by the app.

---

## Remaining Limitations

| Item | Notes |
|------|-------|
| Firestore direct-read email | `users/{id}` is publicly readable; SDK queries can still return email |
| No email-change flow | Email field disabled in settings; no `updateEmail` / re-auth for email |
| `showActivity` preference | Saved in settings but not enforced on public profile (no activity section yet) |
| Legacy `website` in Firestore | Orphaned field on existing user docs; harmless, not displayed |

---

## Manual QA Checklist

- [ ] Visit `/profile/{otherUserId}` — email hidden unless `showEmail` enabled
- [ ] Toggle privacy settings — portfolio/email visibility updates on public profile
- [ ] Edit profile → switch tabs → edits and avatar preview persist
- [ ] Edit profile → click Back → unsaved-changes dialog appears
- [ ] Upload valid JPEG avatar on save — succeeds; invalid/SVG rejected
- [ ] Change password with correct/incorrect current password
- [ ] Google-only account — password section shows provider note
- [ ] Profile settings — no Website field present
