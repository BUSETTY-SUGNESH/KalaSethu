# Profile & Settings — Issue Report

> **Files:** `app/(public)/profile/[id]/page.tsx`, `app/settings/profile/page.tsx`
> **Services:** `user-service.ts`

---

## Summary
The Profile page displays user information and the Settings page allows profile editing. The service layer is well-structured. Issues are primarily around security and data exposure.

---

## Issues

### 🟠 H-02 — User Profile Metrics Are Client-Writable `[EXISTING]`
**File:** [`firestore.rules:L60-67`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules#L60-L67)
**Description:** The Firestore rules allow the document owner to update any field on their profile, including `followerCount`, `salesCount`, `totalRevenue`, and `artworkCount`. A malicious user can use the Firebase Client SDK to set `salesCount: 99999` and `totalRevenue: 10000000` to appear as a top-selling artist.
**Impact:** Platform trust and ranking integrity compromised.

### 🔵 — Public Profile Exposes Email `[NEW]`
**Description:** The user profile data fetched via `getUserProfile` includes the user's email. If the public profile page renders this field, it exposes personal contact information to all visitors.

### 🔵 — No Profile Image Upload Validation `[NEW]`
**Description:** Avatar upload via Storage has no file type or file size validation on the client side. Malicious files (e.g., SVG with embedded scripts) could be uploaded.

### 🔵 — Profile Settings Not Protected by Re-authentication `[NEW]`
**Description:** Sensitive profile changes (email, password) typically require re-authentication in Firebase. The settings page does not implement `reauthenticateWithCredential` before sensitive operations.
