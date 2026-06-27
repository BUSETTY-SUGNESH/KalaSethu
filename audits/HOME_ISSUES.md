# Home Page — Issue Report

> **Files:** [`app/(public)/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/page.tsx)
> **Components:** `SellerHomePage`, `BuyerHomePage`, `HomePage` (root switcher)

---

## Summary
The Home page is a role-switching component that renders `SellerHomePage` for artists and `BuyerHomePage` for buyers/collectors. **Both views are entirely static** — no data is fetched from Firestore. Every statistic, artwork card, artist profile, auction listing, community thread, and event entry is hardcoded.

---

## Issues

### 🟡 M-06 — Entire Page is Hardcoded Static Content `[NEW]`
**Lines:** L1-342
**Description:** Neither `SellerHomePage` nor `BuyerHomePage` calls any service or repository. All data (trending artists, live auctions, community threads, events, seller stats) is embedded as JSX literals with Google-hosted placeholder images.
**Impact:** The landing page provides zero real-time value to users. It is a visual mockup, not a functional page.

### 🔵 L-01 — Hero "View Masterpiece" Links to Slug-Based Route `[NEW]`
**Lines:** L205
**Description:** The hero CTA links to `/artwork/the-silent-ascetic`. The app's artwork routing uses Firestore document IDs (e.g., `/artwork/abc123`), not slugs. This route will always 404 or render a "not found" state.
**Impact:** Primary CTA on the landing page is broken.

### 🔵 L-02 — "Place Bid" Buttons Are Non-Functional `[NEW]`
**Lines:** L278
**Description:** The "Place Bid" buttons in the Live Auctions section are plain `<button>` elements with no `onClick` handler or link navigation. They render but do nothing when clicked.
**Impact:** Users cannot interact with the primary conversion action on the home page.

### 🔵 L-03 — Trending Artists All Link to `/explore` `[NEW]`
**Lines:** L236
**Description:** Every artist card in the "Trending Artists" horizontal scroll links to `/explore` instead of individual artist profile pages (e.g., `/profile/{artistId}`).
**Impact:** Users cannot navigate to specific artist profiles from the home page.

### 🔵 L-04 — Seller Dashboard Stats Are Hardcoded `[NEW]`
**Lines:** L49-52
**Description:** The seller view displays static values: "Listed Artworks: 12", "Active Auctions: 3", "Total Sales: ₹2,40,000", "Followers: 184". These never change regardless of the actual artist's data.
**Impact:** Artists see false information about their account performance.

### 🔵 L-05 — `suppressHydrationWarning` on Interactive Elements `[NEW]`
**Lines:** L278
**Description:** `suppressHydrationWarning` is applied to the "Place Bid" button, masking potential SSR/CSR mismatches rather than fixing them.
**Impact:** Potential hydration bugs are hidden, making debugging difficult.

### 🔵 — No Page-Level SEO Metadata `[NEW]`
**Description:** The home page has no `<title>`, `<meta name="description">`, or structured data (JSON-LD). For the primary landing page, this is particularly impactful for search engine discoverability.

### 🔵 — External Image URLs Hardcoded
**Description:** All images use Google's `lh3.googleusercontent.com/aida-public/` URLs which are AI-generated placeholder images. These are not real artwork or artist images and will break if Google changes their CDN policies.

---

## Accessibility Issues
- No heading hierarchy validation (seller view has `<h1>` + multiple `<h2>` but buyer view also has `<h1>`)
- Ticker content has no `aria-live` attribute for screen readers
- Artist cards lack descriptive `aria-label` attributes
- Color-only status dots (pulse/active) lack text alternatives
