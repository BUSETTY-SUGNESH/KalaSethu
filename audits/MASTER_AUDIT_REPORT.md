# KalaSetu — MASTER ENGINEERING AUDIT REPORT

> **Audit Date:** June 2026
> **Auditor Role:** Senior Software Architect · Security Engineer · Performance Engineer · Accessibility Expert · Product Engineer
> **Scope:** Every file, module, page, component, service, API, Cloud Function, Firebase integration, authentication flow, role-based logic, state management, routing, UI, backend, database query, and architectural decision.
> **Companion Reports:** Individual page/module reports are linked from each section below.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Consolidated Issue Registry](#2-consolidated-issue-registry)
3. [Newly Discovered Issues (Not in Previous Audit)](#3-newly-discovered-issues)
4. [Previously Documented Issues (Confirmed)](#4-previously-documented-issues-confirmed)
5. [Cross-Cutting Architectural Issues](#5-cross-cutting-architectural-issues)
6. [Security Vulnerability Matrix](#6-security-vulnerability-matrix)
7. [Cloud Functions Deep Audit](#7-cloud-functions-deep-audit)
8. [State Management & Data Flow Audit](#8-state-management--data-flow-audit)
9. [Performance & Scalability Audit](#9-performance--scalability-audit)
10. [Accessibility & SEO Audit](#10-accessibility--seo-audit)
11. [Page/Module Report Index](#11-pagemodule-report-index)
12. [Priority Classification](#12-priority-classification)

---

## 1. Executive Summary

KalaSetu is a Next.js 16 / React 19 marketplace for Indian heritage art, backed by Firebase (Firestore, Auth, Storage, Cloud Functions v1) with Razorpay payment integration. After an exhaustive review of **every file in the repository**, this audit identifies **68 distinct issues** spanning security, logic, performance, accessibility, architecture, and completeness.

### Critical Findings Summary

| Severity | Count | Previously Known | Newly Discovered |
|:---|:---:|:---:|:---:|
| 🔴 **Critical** | 8 | 5 | 3 |
| 🟠 **High** | 14 | 4 | 10 |
| 🟡 **Medium** | 22 | 5 | 17 |
| 🔵 **Low** | 24 | 2 | 22 |
| **Total** | **68** | **16** | **52** |

### Top 5 Production-Impacting Issues

1. **🔴 CRITICAL — Payment Price Manipulation**: `verifyPayment` Cloud Function trusts client-supplied `item.price` values. A malicious buyer can pay ₹1 for a ₹1,00,000 artwork.
2. **🔴 CRITICAL — Direct Order Injection**: Firestore rules allow any authenticated user to `create` documents in `/orders` with arbitrary `paymentStatus: 'completed'`, bypassing the entire payment pipeline.
3. **🔴 CRITICAL — Auction Cron Dead Query**: `closeEndedAuctions` queries `status == 'active'` but the app only uses `'live'`/`'ending_soon'`/`'scheduled'`. Auctions **never close automatically**.
4. **🔴 CRITICAL — Cross-User Media Deletion**: Any authenticated user can delete any other user's artwork/event images via Storage rules lacking ownership checks.
5. **🟠 HIGH — Role Mismatch on User Creation**: Backend assigns `'collector'` role; frontend `UserRole` type has no `'collector'` variant. This causes broken `hasRole()` checks and potential navigation infinite loops.

---

## 2. Consolidated Issue Registry

Every issue is tagged as:
- `[EXISTING]` — Already documented in `engineering_audit_report.md`
- `[NEW]` — Discovered during this audit for the first time

### 🔴 Critical Issues (8)

| ID | Issue | Tag | Module | File(s) |
|:---|:---|:---:|:---|:---|
| C-01 | Payment price manipulation — `verifyPayment` trusts client `item.price` | `[EXISTING]` | Cloud Functions / Payments | `functions/src/payment.ts:L60-90` |
| C-02 | Direct order injection via client SDK bypassing payment | `[EXISTING]` | Firestore Rules / Orders | `firestore.rules:L163-181`, `order-service.ts:L18` |
| C-03 | Auction closer cron queries non-existent `'active'` status | `[EXISTING]` | Cloud Functions / Auction | `functions/src/auction.ts:L185`, `auction.repository.ts:L32` |
| C-04 | Cross-user artwork/event media deletion | `[EXISTING]` | Storage Rules | `storage.rules:L31-47` |
| C-05 | Razorpay script injected dynamically without integrity check | `[NEW]` | Checkout / Security | `checkout/page.tsx:L99-111` |
| C-06 | Admin panel has no AuthGuard — any user can access `/admin` | `[NEW]` | Admin / Auth | `app/admin/page.tsx`, `app/admin/layout.tsx` |
| C-07 | `admin.ts` uses separate `admin.firestore()` instance, bypassing shared `config.ts` — potential double-init crash | `[NEW]` | Cloud Functions / Config | `functions/src/admin.ts:L4` |
| C-08 | Chat attachment privacy breach — any user reads any chat media | `[EXISTING]` | Storage Rules | `storage.rules:L104-113` |

### 🟠 High Issues (14)

| ID | Issue | Tag | Module | File(s) |
|:---|:---|:---:|:---|:---|
| H-01 | Auth role mismatch: backend `'collector'` vs frontend `UserRole` | `[EXISTING]` | Auth / Roles | `functions/src/auth.ts:L13`, `app/types/index.ts` |
| H-02 | User profile metric manipulation — `followerCount`, `salesCount`, `totalRevenue` writable by owner | `[EXISTING]` | Firestore Rules | `firestore.rules:L60-67` |
| H-03 | Artwork status bypass — artists can self-publish without moderation | `[EXISTING]` | Firestore Rules | `firestore.rules:L100-118` |
| H-04 | `onArtworkWritten` can trigger infinite write loop | `[NEW]` | Cloud Functions / Artwork | `functions/src/artwork.ts:L62-85` |
| H-05 | Batch write limit exceeded — follower notification on publish can exceed 500-op Firestore limit | `[NEW]` | Cloud Functions / Artwork | `functions/src/artwork.ts:L93-110` |
| H-06 | `useEffect` dependency array includes `participantProfiles` object — causes infinite re-render loop in Messages | `[NEW]` | Messages Page | `dashboard/messages/page.tsx:L110` |
| H-07 | Cart persisted in localStorage without user scoping — cart leaks between accounts on shared devices | `[NEW]` | Cart Store | `lib/stores/cart-store.ts:L32` |
| H-08 | `loadRazorpay` appends duplicate script tags on each checkout attempt | `[NEW]` | Checkout | `checkout/page.tsx:L99-111` |
| H-09 | `onArtworkWritten` updates `searchKeywords` causing recursive trigger | `[NEW]` | Cloud Functions / Artwork | `functions/src/artwork.ts:L74-84` |
| H-10 | Missing `firestore.indexes.json` composite indexes — queries crash on multi-field filters | `[EXISTING]` | Firestore / Performance | `artwork.repository.ts:L76-95` |
| H-11 | `community.ts` comment counters have no floor guard — can go negative | `[NEW]` | Cloud Functions / Community | `functions/src/community.ts:L28-29` |
| H-12 | `package.json` name is `"y"` — breaks npm ecosystem conventions | `[NEW]` | Build / Config | `package.json:L2` |
| H-13 | `firebase-admin` in `devDependencies` instead of `functions/package.json` dependencies | `[NEW]` | Build / Config | `package.json:L29` |
| H-14 | `AuthProvider` offline fallback creates user object with `role: 'user'` regardless of actual DB role — stale permissions until reconnect | `[NEW]` | Auth / Resilience | `AuthProvider.tsx:L64-82` |

### 🟡 Medium Issues (22)

| ID | Issue | Tag | Module | File(s) |
|:---|:---|:---:|:---|:---|
| M-01 | Search case-sensitivity — Title Case transformation fails on mixed-case DB entries | `[EXISTING]` | Search / Artwork Repo | `artwork.repository.ts:L138-151` |
| M-02 | Artist verification form is a mock `setTimeout` — no Firestore write | `[EXISTING]` | Artist Verify Page | `dashboard/artist/verify/page.tsx:L23-39` |
| M-03 | Dashboard overview shows hardcoded data for "Aakash" | `[EXISTING]` | Dashboard | `dashboard/page.tsx:L10` |
| M-04 | Collector dashboard shows static artwork cards | `[EXISTING]` | Collector Dashboard | `dashboard/collector/page.tsx:L24-27` |
| M-05 | Create Auction form inputs are unbound — no state, no handler | `[EXISTING]` | Seller Bids | `SellerBidsClient.tsx:L67-111` |
| M-06 | Home page uses entirely hardcoded data for trending artists, auctions, community threads | `[NEW]` | Home Page | `(public)/page.tsx` |
| M-07 | `mobile-nav-toggle` button in Header has no click handler — mobile nav is non-functional | `[NEW]` | Header Component | `Header.tsx:L208-210` |
| M-08 | Community page "Post Discussion" button has no submit handler — posts cannot be created | `[NEW]` | Community Page | `community/page.tsx:L151` |
| M-09 | Community page filter tabs (Latest/Trending/Techniques/Provenance) are non-functional decorations | `[NEW]` | Community Page | `community/page.tsx:L165-173` |
| M-10 | Events page "Publish Event" and "Save as Draft" buttons have no handlers | `[NEW]` | Events Page | `events/page.tsx:L148-149` |
| M-11 | Events page Create Event form inputs are unbound to state | `[NEW]` | Events Page | `events/page.tsx:L85-145` |
| M-12 | Messages page "new_chat" flow logs a warning instead of creating a room | `[NEW]` | Messages Page | `dashboard/messages/page.tsx:L144-153` |
| M-13 | NotificationPanel date parsing wraps in try-catch with empty catch — silently swallows errors | `[NEW]` | Notification Panel | `NotificationPanel.tsx:L146-157` |
| M-14 | `order-service.ts` `createOrder` returns comma-joined IDs — downstream code expects single ID | `[NEW]` | Order Service | `order-service.ts:L83` |
| M-15 | `toastCounter` in `ui-store.ts` uses module-level `let` — breaks SSR/hydration determinism | `[NEW]` | UI Store | `ui-store.ts:L64` |
| M-16 | Footer copyright says "© 2024" — outdated | `[NEW]` | Footer | `Footer.tsx:L16` |
| M-17 | Footer links use `href="#"` for Return Policy, Buyer Protection, Authenticity Guide, etc. — dead links | `[NEW]` | Footer | `Footer.tsx:L31-40` |
| M-18 | Seller "Pin a Discussion" and "Announce Event" buttons in community sidebar have no handlers | `[NEW]` | Community Page | `community/page.tsx:L264-271` |
| M-19 | SellerBidsClient "Edit Auction" and "Cancel" buttons have no handlers | `[NEW]` | Seller Bids | `SellerBidsClient.tsx:L192-193` |
| M-20 | SellerBidsClient stats are hardcoded ("3", "47", "14", "₹8.2L") | `[NEW]` | Seller Bids | `SellerBidsClient.tsx:L121-133` |
| M-21 | `onOrderCreated` notification uses `type: "order_update"` for buyer but `type: "system"` for sellers — inconsistent typing | `[NEW]` | Cloud Functions / Order | `functions/src/order.ts:L18,L29` |
| M-22 | `aggregateAnalytics` only tracks 3 metrics (users, artworks, orders) — missing revenue, active auctions, etc. | `[NEW]` | Cloud Functions / Admin | `functions/src/admin.ts:L76-97` |

### 🔵 Low Issues (24)

| ID | Issue | Tag | Module | File(s) |
|:---|:---|:---:|:---|:---|
| L-01 | Home page hero links to `/artwork/the-silent-ascetic` — a slug-based route that doesn't exist (routes use IDs) | `[NEW]` | Home Page | `page.tsx:L205` |
| L-02 | Home page "Place Bid" buttons are non-functional `<button>` elements | `[NEW]` | Home Page | `page.tsx:L278` |
| L-03 | Trending Artists cards all link to `/explore` instead of individual artist profiles | `[NEW]` | Home Page | `page.tsx:L236` |
| L-04 | Seller home stats are hardcoded ("12", "3", "₹2,40,000", "184") | `[NEW]` | Home Page | `page.tsx:L49-52` |
| L-05 | `suppressHydrationWarning` used on interactive elements (search input, buttons) | `[NEW]` | Header / Home | `Header.tsx:L124`, `page.tsx:L278` |
| L-06 | No `<title>` or `<meta description>` on any page — zero SEO optimization | `[NEW]` | All Pages | All route `page.tsx` files |
| L-07 | `next.config.ts` allows `placehold.co` in image patterns — production should not use placeholder services | `[NEW]` | Config | `next.config.ts:L18-21` |
| L-08 | No error boundaries in any component — unhandled promise rejections crash entire page | `[NEW]` | All Components | Global |
| L-09 | `img` tags used instead of Next.js `<Image>` component — no lazy loading, no optimization | `[NEW]` | All Pages | Multiple files |
| L-10 | `middleware.ts` only sets security headers — no auth route protection at middleware level | `[NEW]` | Middleware | `middleware.ts` |
| L-11 | `AuthGuard` redirects to `/dashboard` for insufficient role — `/dashboard` may itself require auth, creating redirect loop | `[NEW]` | Auth Guard | `AuthGuard.tsx:L56` |
| L-12 | Dashboard layout sidebar links are not role-aware — artists see collector links and vice versa | `[NEW]` | Dashboard Layout | `dashboard/layout.tsx` |
| L-13 | `<img>` alt attributes use artwork titles but no fallback for missing titles | `[NEW]` | Multiple | Artwork cards, home page |
| L-14 | OrdersPage uses fallback `"https://placehold.co/100x100"` for missing artwork images | `[NEW]` | Orders Page | `orders/page.tsx:L87` |
| L-15 | No loading states for AuthProvider bootstrap — user sees flash of unauthenticated content | `[NEW]` | Auth Provider | `AuthProvider.tsx` |
| L-16 | `uuid` package imported but Firestore auto-generates IDs via `addDoc` — redundant dependency | `[NEW]` | Package.json | `package.json:L18` |
| L-17 | `react-hot-toast` in dependencies but app uses custom Zustand toast system — unused dependency | `[NEW]` | Package.json | `package.json:L17` |
| L-18 | No CSRF protection on callable Cloud Functions | `[NEW]` | Cloud Functions | All callable functions |
| L-19 | No rate limiting on bid placement — automated bid sniping possible | `[NEW]` | Auction Service | `functions/src/auction.ts` |
| L-20 | `Notification` type in `types/index.ts` has `createdAt: string` but Cloud Functions write `serverTimestamp()` (Firestore Timestamp) | `[NEW]` | Types | `types/index.ts`, `admin.ts:L65` |
| L-21 | Checkout form doesn't validate pincode format (should be 6 digits for India) | `[NEW]` | Checkout | `checkout/page.tsx:L300-308` |
| L-22 | `isProcessing` flag in checkout is set to `false` in `finally` but Razorpay modal is async — flag resets while payment modal is still open | `[NEW]` | Checkout | `checkout/page.tsx:L217-219` |
| L-23 | `formatDistanceToNow` used without `addSuffix: true` in some places (inconsistent time display) | `[NEW]` | Bids Page | `SellerBidsClient.tsx:L187` |
| L-24 | No keyboard navigation support for the dropdown user menu in Header | `[NEW]` | Header | `Header.tsx:L159-200` |

---

## 3. Newly Discovered Issues

### 🔴 Critical (3 New)

#### C-05: Razorpay Script Injection Without Integrity Check
**File:** [`checkout/page.tsx:L99-111`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/checkout/page.tsx#L99-L111)
**Description:** The Razorpay checkout script is dynamically injected via `document.createElement('script')` without a `integrity` attribute (Subresource Integrity). If Razorpay's CDN is compromised, arbitrary JavaScript would execute in the user's browser within the application's origin, enabling session hijacking, credential theft, or payment redirection.
**Impact:** Supply-chain attack vector for payment data exfiltration.

#### C-06: Admin Panel Completely Unguarded
**File:** [`app/admin/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/page.tsx)
**Description:** The admin panel at `/admin` does not wrap content in `<AuthGuard requiredRole="admin">`. The page component directly calls `getPlatformStats()`, `getPendingVerifications()`, and `getPendingReports()` — these are client-side Firestore queries. While Firestore rules may block data, the admin UI itself is fully rendered and accessible to any visitor including unauthenticated users. This exposes the admin interface structure, data fields, and endpoint patterns.
**Impact:** Information disclosure; potential privilege escalation if rules are misconfigured.

#### C-07: Duplicate Firebase Admin Initialization
**File:** [`functions/src/admin.ts:L4`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/admin.ts#L4)
**Description:** `admin.ts` creates its own `const db = admin.firestore()` at the module level instead of importing from `config.ts`. Since `config.ts` conditionally initializes `admin.initializeApp()`, and `admin.ts` calls `admin.firestore()` independently, this can fail if `admin.ts` is loaded before `config.ts` (no initialization guard).
**Impact:** Cloud Function startup crash, breaking all admin operations.

### 🟠 High (10 New)

Detailed in the Consolidated Issue Registry above. Key highlights:
- **H-04/H-09:** `onArtworkWritten` has TWO separate infinite-loop risks (searchKeyword update triggers itself; artworkCount update triggers again).
- **H-05:** Follower notification batch on artwork publish can exceed Firestore's 500-operation batch limit for popular artists.
- **H-06:** Messages page has an infinite re-render loop due to `participantProfiles` object reference in `useEffect` dependencies.
- **H-07:** Cart in localStorage is not scoped to user ID — different users on the same device share a cart.

---

## 4. Previously Documented Issues (Confirmed)

All 16 issues from `engineering_audit_report.md` have been verified and confirmed as still present:

| Previous Report Section | Issue | Current Status |
|:---|:---|:---|
| §5 — Flow 1 | Create Auction form is unbound stub | ✅ Confirmed (C-05/M-05) |
| §5 — Flow 2 | Auction closer queries `'active'` status | ✅ Confirmed (C-03) |
| §5 — Flow 3 | Artist verification is a `setTimeout` mock | ✅ Confirmed (M-02) |
| §5 — Flow 4 | Direct order creation bypasses payment | ✅ Confirmed (C-02) |
| §6 | Missing composite indexes | ✅ Confirmed (H-10) |
| §6 | Search case-sensitivity | ✅ Confirmed (M-01) |
| §7 — Vuln 1 | Artwork/event image deletion by any user | ✅ Confirmed (C-04) |
| §7 — Vuln 3 | Chat attachment privacy breach | ✅ Confirmed (C-08) |
| §7 — Vuln 4 | Orphaned storage files | ✅ Confirmed (implicit) |
| §8 | `onUserCreated` assigns `'collector'` | ✅ Confirmed (H-01) |
| §8 | `closeEndedAuctions` wrong status | ✅ Confirmed (C-03) |
| §8 | `cleanupOldNotifications` N+1 | ✅ Confirmed (see §7 below) |
| §9 — Row 1 | Direct order creation + state injection | ✅ Confirmed (C-02) |
| §9 — Row 2 | Storage deletion vandalism | ✅ Confirmed (C-04) |
| §9 — Row 4 | User profile metric manipulation | ✅ Confirmed (H-02) |
| §9 — Row 5 | Artwork status bypass | ✅ Confirmed (H-03) |
| §10 | `verifyPayment` trusts client prices | ✅ Confirmed (C-01) |

---

## 5. Cross-Cutting Architectural Issues

### 5.1 Missing Service Layer for Form Submissions
Multiple forms (Create Auction, Create Event, Post Discussion, Artist Verification) render UI but have **no connected handlers**. The Service layer exists for data retrieval but is absent for mutations on these features.

### 5.2 Type Divergence Between Frontend and Backend
- Frontend `UserRole` union: `'guest' | 'user' | 'artist' | 'verified_artist' | 'moderator' | 'admin'`
- Backend `onUserCreated` assigns: `'collector'` (not in frontend union)
- Backend `Auction.status` type: `string` (no enum)
- Frontend `Auction.status` enum: `'scheduled' | 'live' | 'ending_soon' | 'ended' | 'completed' | 'cancelled'`
- Backend queries for: `'active'` (not in frontend enum)

### 5.3 Inconsistent Notification Architecture
- `order.ts` writes to top-level `/users/{id}/notifications` subcollection using `notificationRepository`
- `admin.ts` writes to the same subcollection directly via `admin.firestore().collection(...).add()`
- `artwork.ts` writes to the same subcollection via batch operations
- Three different writing patterns for the same data model.

### 5.4 No Server-Side Rendering Strategy
Despite using Next.js 16, the app is almost entirely client-rendered (`'use client'` on every page). The only SSR component is `marketplace/page.tsx` which passes static props. This negates SEO, initial paint performance, and caching benefits of Next.js.

---

## 6. Security Vulnerability Matrix

| # | Vulnerability | Severity | Vector | Exploitability | Impact |
|:---|:---|:---:|:---|:---|:---|
| 1 | Payment price manipulation | 🔴 Critical | Network/API | Easy | Financial loss |
| 2 | Direct order injection | 🔴 Critical | Client SDK | Easy | Financial loss |
| 3 | Cross-user media deletion | 🔴 Critical | Client SDK | Easy | Data destruction |
| 4 | Chat media privacy leak | 🔴 Critical | Client SDK | Easy | Privacy violation |
| 5 | Razorpay SRI missing | 🔴 Critical | CDN compromise | Medium | Account takeover |
| 6 | Admin panel exposure | 🔴 Critical | Direct URL | Easy | Info disclosure |
| 7 | Profile metric manipulation | 🟠 High | Client SDK | Easy | Platform integrity |
| 8 | Artwork self-publish bypass | 🟠 High | Client SDK | Easy | Content moderation |
| 9 | No CSRF on Cloud Functions | 🔵 Low | Network | Hard | Data manipulation |
| 10 | No rate limiting on bids | 🔵 Low | Automation | Medium | Auction manipulation |

---

## 7. Cloud Functions Deep Audit

| Function | Type | Status | Issues |
|:---|:---|:---|:---|
| `onUserCreated` | Auth trigger | 🔴 Broken | Assigns invalid `'collector'` role |
| `placeBid` | Callable | ✅ Works | Missing rate limiting |
| `createOrder` | Callable | ✅ Works | — |
| `verifyPayment` | Callable | 🔴 Vulnerable | Trusts client-supplied prices |
| `closeEndedAuctions` | Scheduled (1 min) | 🔴 Dead | Queries non-existent `'active'` status |
| `sendEndingSoonNotifications` | Scheduled (5 min) | ⚠️ Fragile | Relies on `closeEndedAuctions` working |
| `cleanupOldNotifications` | Scheduled (24h) | 🟠 Perf | N+1 user-level query loop |
| `onArtworkWritten` | Firestore trigger | 🟠 Risky | Infinite loop via keyword + stat updates |
| `moderateArtwork` | Callable | ✅ Works | — |
| `verifyArtist` | Callable | ✅ Works | — |
| `aggregateAnalytics` | Scheduled (24h) | ⚠️ Limited | Only 3 basic metrics |
| `onOrderCreated` | Firestore trigger | ✅ Works | Inconsistent notification types |
| `onCommentAdded` | Firestore trigger | ⚠️ No floor | Counter can go negative |
| `onCommentRemoved` | Firestore trigger | ⚠️ No floor | Counter can go negative |

---

## 8. State Management & Data Flow Audit

### Zustand Stores

| Store | File | Issues |
|:---|:---|:---|
| `auth-store` | `lib/stores/auth-store.ts` | `hasRole()` fails for `'collector'` role from backend (H-01); `isArtist()` doesn't include `admin`/`moderator` who might also be artists |
| `cart-store` | `lib/stores/cart-store.ts` | Not scoped to user — persists across account switches (H-07); `hydrateFromStorage` silently swallows JSON parse errors |
| `ui-store` | `lib/stores/ui-store.ts` | Module-level `toastCounter` breaks SSR determinism (M-15); `marketplaceCache` stores `lastDoc: unknown` losing Firestore cursor type |

### Data Flow Gaps
- **No optimistic UI updates**: All mutations wait for server round-trip, causing sluggish UX.
- **No stale-while-revalidate**: Marketplace cache is either all-or-nothing; navigating away and back either shows stale data or refetches entirely.
- **No error state management**: Services throw errors but components only `console.error` them — no user-facing error states.

---

## 9. Performance & Scalability Audit

| Issue | Impact | Location |
|:---|:---|:---|
| N+1 notification cleanup | 50,001 reads for 50K users | `notification.ts:L31-40` |
| No pagination on follower notification batch | Exceeds 500-op limit | `artwork.ts:L93-110` |
| Three parallel search queries on every keystroke | 3x Firestore reads per search | `artwork.repository.ts:L173-177` |
| No debouncing on search input | Fires on every character | `Header.tsx:L126` |
| `<img>` instead of `<Image>` | No lazy loading, no WebP | All pages |
| No code splitting on admin panel | Admin code bundled for all users | `app/admin/` |
| Full user collection iterated in notification cleanup | O(n) users regardless of notifications | `notification.ts` |

---

## 10. Accessibility & SEO Audit

### Accessibility (WCAG 2.1)
| Issue | WCAG Criterion | Severity |
|:---|:---|:---|
| No skip navigation link | 2.4.1 | Medium |
| Dropdown menu not keyboard-navigable | 2.1.1 | Medium |
| Color-only status indicators (dots) without text alternatives | 1.4.1 | Medium |
| `button` elements without descriptive text (close buttons use only icons) | 4.1.2 | Low |
| No focus management after modal/panel open | 2.4.3 | Low |
| Notification panel has no ARIA role or `aria-live` region | 4.1.2 | Medium |
| Form inputs lack `aria-describedby` for validation errors | 1.3.1 | Low |

### SEO
| Issue | Impact |
|:---|:---|
| No `<title>` tags on any page | Critical for search indexing |
| No `<meta name="description">` | Critical for SERP snippets |
| No structured data / JSON-LD | Missing rich results |
| No `sitemap.xml` or `robots.txt` | Discovery impaired |
| Multiple `<h1>` tags on some pages | Heading hierarchy violations |
| `<img>` without `width`/`height` — CLS issues | Core Web Vitals penalty |

---

## 11. Page/Module Report Index

Each report provides detailed, line-level issue documentation for every page and module:

| Report File | Page/Module |
|:---|:---|
| [`HOME_ISSUES.md`](HOME_ISSUES.md) | Home Page (Buyer + Seller views) |
| [`KALAMARKET_ISSUES.md`](KALAMARKET_ISSUES.md) | KalaMarket / Marketplace |
| [`ARTWORK_DETAILS_ISSUES.md`](ARTWORK_DETAILS_ISSUES.md) | Artwork Detail Page |
| [`BIDS_ISSUES.md`](BIDS_ISSUES.md) | Bids Page (Buyer + Seller views) |
| [`AUCTION_DETAILS_ISSUES.md`](AUCTION_DETAILS_ISSUES.md) | Auction Detail Page |
| [`KALENT_ISSUES.md`](KALENT_ISSUES.md) | KalEnt / Events Page |
| [`CHARCHA_SABHA_ISSUES.md`](CHARCHA_SABHA_ISSUES.md) | CharchaSabha / Community Page |
| [`ARTIST_DASHBOARD_ISSUES.md`](ARTIST_DASHBOARD_ISSUES.md) | Artist Dashboard |
| [`CUSTOMER_DASHBOARD_ISSUES.md`](CUSTOMER_DASHBOARD_ISSUES.md) | Customer/Collector Dashboard |
| [`PROFILE_ISSUES.md`](PROFILE_ISSUES.md) | Profile & Settings Pages |
| [`AUTH_ISSUES.md`](AUTH_ISSUES.md) | Auth (Login, Signup, Onboarding) |
| [`CHECKOUT_ISSUES.md`](CHECKOUT_ISSUES.md) | Cart & Checkout |
| [`ADMIN_ISSUES.md`](ADMIN_ISSUES.md) | Admin Panel |
| [`MESSAGES_ISSUES.md`](MESSAGES_ISSUES.md) | Messages / Chat |
| [`ORDERS_ISSUES.md`](ORDERS_ISSUES.md) | Orders Page |
| [`CLOUD_FUNCTIONS_ISSUES.md`](CLOUD_FUNCTIONS_ISSUES.md) | All Cloud Functions |
| [`FIREBASE_RULES_ISSUES.md`](FIREBASE_RULES_ISSUES.md) | Firestore & Storage Rules |
| [`SERVICES_REPOS_ISSUES.md`](SERVICES_REPOS_ISSUES.md) | Services, Repositories, Stores |

---

## 12. Priority Classification

### Immediate (Deploy Blockers)
1. Fix `verifyPayment` to fetch real prices from Firestore (C-01)
2. Deny client-side `/orders` creates in `firestore.rules` (C-02)
3. Fix `closeEndedAuctions` query to use `'live'`/`'ending_soon'` (C-03)
4. Add ownership checks to Storage rules (C-04, C-08)
5. Add `AuthGuard` to Admin panel (C-06)
6. Fix `admin.ts` to import shared `db` from `config.ts` (C-07)

### Short-Term (Sprint 1-2)
7. Fix auth role assignment to `'user'` instead of `'collector'` (H-01)
8. Guard `onArtworkWritten` against infinite loops (H-04, H-09)
9. Paginate follower notification batches (H-05)
10. Fix Messages page infinite re-render (H-06)
11. Scope cart to user ID (H-07)
12. Add SRI hash to Razorpay script (C-05)
13. Prevent duplicate Razorpay script injection (H-08)
14. Add Firestore composite indexes (H-10)

### Medium-Term (Sprint 3-4)
15. Implement Create Auction form handler (M-05)
16. Implement Create Event form handler (M-10, M-11)
17. Implement Community post creation (M-08)
18. Connect artist verification to Firestore (M-02)
19. Replace all hardcoded dashboard data (M-03, M-04, M-06, M-20)
20. Implement mobile navigation (M-07)

### Long-Term (Backlog)
21. Migrate to `next/image` for all images (L-09)
22. Add SEO metadata to all pages (L-06)
23. Add error boundaries (L-08)
24. Implement keyboard navigation (L-24)
25. Remove unused dependencies (L-16, L-17)
