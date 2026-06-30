# Home Page — Issue Report

> **Last updated:** 2026-06-30  
> **Status:** All issues **resolved**  
> **Files:** [`app/(public)/page.tsx`](../app/(public)/page.tsx), [`HomeClient.tsx`](../app/(public)/HomeClient.tsx)  
> **Services:** [`home-admin.service.ts`](../lib/services/server/home-admin.service.ts), [`artwork-service.ts`](../lib/services/artwork-service.ts), [`user-service.ts`](../lib/services/user-service.ts), [`auction-service.ts`](../lib/services/auction-service.ts), [`community-service.ts`](../lib/services/community-service.ts), [`event-service.ts`](../lib/services/event-service.ts)

---

## Summary

The Home page is a role-switching component that renders `SellerHomePage` for artists and `BuyerHomePage` for buyers/collectors. The page is split into a **server shell** (SEO metadata, JSON-LD, SSR buyer data) and a **client component** (role switch, seller auth data).

**Buyer side:** Hero, trending artists, live auctions, CharchaSabha threads, and Kalent events load from Firestore via `getHomeBuyerDataServer()`. Ticker copy is composed dynamically from live auction and event data with editorial fallback.

**Seller side:** Stats, listed artworks, active bid alerts, and organizer events load client-side from `useAuthStore` user data plus `getArtworksByArtist`, `getAllAuctionsByArtist`, `computeSellerAuctionStats`, and `getEventsByOrganizer`.

---

## Original Audit Issues

### ✅ M-06 — Entire Page is Hardcoded Static Content `[RESOLVED]`
**Was:** All data embedded as JSX literals with Google-hosted placeholder images.  
**Fix:** Server-fetched buyer data via `getHomeBuyerDataServer()`; seller sections fetch real artworks, auctions, events, and user stats client-side. Images use Firestore URLs with `next/image` and `placehold.co` fallbacks.

### ✅ L-01 — Hero "View Masterpiece" Links to Slug-Based Route `[VERIFIED]`
**Was:** CTA linked to `/artwork/the-silent-ascetic` (slug, not Firestore ID).  
**Status:** Already fixed prior to this pass — CTA uses `/artwork/${featuredArtwork.id}`. Hero title, description, provenance, and image now also render from the featured artwork record.

### ✅ L-02 — "Place Bid" Buttons Are Non-Functional `[RESOLVED]`
**Was:** Plain `<button>` elements with no handler or navigation.  
**Fix:** Replaced with `<Link href={`/bids/${auction.id}`}>` matching the Bids page pattern.

### ✅ L-03 — Trending Artists All Link to `/explore` `[RESOLVED]`
**Was:** Every artist card linked to `/explore`.  
**Fix:** `getFeaturedArtistsServer(4)` wired; each card links to `/profile/${artist.id}` with descriptive `aria-label`.

### ✅ L-04 — Seller Dashboard Stats Are Hardcoded `[RESOLVED]`
**Was:** Static values ("Listed Artworks: 12", etc.).  
**Fix:** Stats from `user.artworkCount`, `user.followerCount`, `user.totalRevenue`, and `computeSellerAuctionStats()` active auction count.

### ✅ L-05 — `suppressHydrationWarning` on Interactive Elements `[RESOLVED]`
**Was:** Applied to dead Place Bid `<button>`, masking SSR/CSR mismatches.  
**Fix:** Removed along with the button; Place Bid is now a `<Link>` with no hydration workaround needed.

### ✅ No Page-Level SEO Metadata `[RESOLVED]`
**Was:** No `<title>`, meta description, or structured data on the landing page.  
**Fix:** Server `page.tsx` exports `metadata` (title, description, OpenGraph) and injects JSON-LD `WebSite` schema.

### ✅ External Image URLs Hardcoded `[RESOLVED]`
**Was:** All images used Google's `lh3.googleusercontent.com/aida-public/` placeholder URLs.  
**Fix:** Images sourced from Firestore fields (`thumbnailUrl`, `artworkImageUrl`, `avatarUrl`) via `next/image`; `placehold.co` used only as fallback when no URL exists.

---

## Accessibility Issues

### ✅ Ticker `aria-live` `[RESOLVED]`
**Was:** Ticker content had no `aria-live` for screen readers.  
**Fix:** `aria-live="polite"` added to `.ticker-scroll-area` on both buyer and seller tickers.

### ✅ Artist card `aria-label` `[RESOLVED]`
**Was:** Artist cards lacked descriptive labels.  
**Fix:** Each artist link has `aria-label={`View ${name}'s profile — ${specialty}`}`.

### ✅ Color-only status dots `[RESOLVED]`
**Was:** Pulse/active dots conveyed status by color alone.  
**Fix:** `StatusBadge` component pairs each dot with visible label text and `aria-label={`Status: ${label}`}` on the dot element.

### ✅ Heading hierarchy `[VERIFIED]`
**Was:** Concern about multiple `<h1>` elements across views.  
**Status:** Only one role view mounts at a time; each view has a single `<h1>` with proper `<h2>`–`<h4>` nesting below.

---

## Architecture Notes

| Section | Buyer data source | Seller data source |
|---------|-------------------|-------------------|
| Hero / Featured | `getFeaturedArtworksServer(1)` | — |
| Trending Artists | `getFeaturedArtistsServer(4)` | — |
| Live Auctions | `getEndingSoonAuctionsServer(2)` | Active auctions from `getAllAuctionsByArtist` |
| CharchaSabha | `getTrendingPostsServer(2)` | — |
| Kalent Events | `getUpcomingEventsServer(2)` | `getEventsByOrganizer(user.id)` |
| Stats | — | `user` profile + `computeSellerAuctionStats` |
| Listed Artworks | — | `getArtworksByArtist(user.id, 2)` |
| Ticker | Derived from auctions + events | Derived from seller auctions + events |

**Ticker fallback:** No announcements API exists; when Firestore returns no auction/event data, editorial fallback copy is shown.
