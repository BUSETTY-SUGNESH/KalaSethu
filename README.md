# KalaSetu

A comprehensive global digital ecosystem for Indian art, built to connect collectors with verified artisans. 

## Overview
KalaSetu combines a Marketplace, Live Auction System, Artist Verification, Community Forums (CharchaSabha), and Learning Masterclasses into a single unified platform. 

It is built with **Next.js**, **Zustand**, and **Firebase** (Firestore, Auth, Storage, Cloud Functions).

## Features
* **Auth**: Firebase Authentication with protected routes and server-side middleware.
* **Marketplace**: Browse authenticated art, filter by category/medium, add to cart.
* **Live Auctions**: Real-time bidding engine with anti-sniping, pubsub closure, and a full auction notification system via Firebase Cloud Functions.
* **Auction Notifications**: Server-side notifications for outbid, auction won, auction lost, artist closure, and ending-soon reminders (24h / 1h / 15m) — dispatched atomically with Firestore WriteBatch.
* **CharchaSabha**: Community discussion forums with threads, replies, and like-aggregation.
* **Dashboards**: Dedicated dashboards for Collectors, Artists, and Admins.
* **Verification System**: Rigorous application flow for artisans to get verified.
* **Cloud Functions**: Robust backend for order processing, notifications, moderation, and aggregation.

## Recent Optimizations

* **Premium UX & Navigation**: Introduced a smooth sliding active indicator to the main navigation for a premium feel. Dark-themed, dropdown-based filtering and sorting controls provide a seamless user experience.
* **Marketplace Enhancements**: Refactored KalaMarket for fully responsive mobile/tablet layouts, implemented Zustand-backed state persistence to retain browse history across page navigations, and added an integrated "Artist Hub" contextual panel for sellers.
* **Accessibility & Standardization**: Standardized global spacing and layout utilities (removing hardcoded inline styles) and brought the Marketplace into full a11y compliance (semantic category grid, `aria-live` loading states, and `aria-haspopup` dropdowns).
* **Image Optimization**: Automated conversion to next-gen formats (WebP/AVIF), lazy loading, and intelligent responsive sizing via `next/image` on all auction pages, ensuring optimal Core Web Vitals and zero layout shifts.

### KalaMarket Auction Improvements (Latest)

* **Auction Notification System (Issue 2.3)**: Implemented a complete server-side notification pipeline in Cloud Functions. Events covered: outbid (post-transaction, non-blocking), auction won/lost/closed-artist (batched at closure), and ending-soon reminders at 24h / 1h / 15m windows with `notifiedIntervals` deduplication. FCM and email stubs are wired and feature-flagged for future activation.
* **Bid Input Protection (Issue 3.1)**: Real-time auction updates no longer overwrite a user's active bid input. A `useRef` focus flag gates the subscription's `setBidAmount` call. When the field is focused, a non-intrusive inline banner ("The bid has increased — Update Bid / ✕") is shown instead. On blur, the value auto-corrects only if below the new minimum. Submit-time validation always re-checks against live auction state.
* **Auction Image Optimization (Issue 3.2)**: Replaced all `<img>` tags in `BidsClient.tsx` and `AuctionDetailsClient.tsx` with Next.js `<Image>` using `fill` mode, appropriate `sizes` descriptors, and `priority` on the LCP hero image. No layout or visual changes.
* **Highest Bidder Status Indicator (Issue 3.3)**: Added a real-time bidder-status pill directly beneath the Current Bid amount. Displays "You are the highest bidder" (emerald), "You have been outbid" (amber), or "You won this auction" (emerald) — derived entirely from existing page state with zero extra queries. Role-gated to customers only. Accessible via `aria-live="polite"`.

### Bids Module Improvements (Latest Session)

* **Server-Side Rendering for Bids (Issue 1.2)**: Refactored `app/(public)/bids/page.tsx` and `app/(public)/bids/[id]/page.tsx` from Client Components using `useEffect` to a hybrid Server + Client architecture. Active auctions and auction details are now server-rendered on the initial request, eliminating loading states, improving LCP, and enabling proper SEO indexing of auction content. Real-time listeners are preserved in dedicated `BidsClient` / `AuctionDetailsClient` components.

* **Real User Bid Analytics (Issue 2.1)**: Replaced the hardcoded Bid Analytics sidebar metrics (Win Rate, Active Bids, Won Items) with real data sourced from a new `getUserBidAnalytics` Firebase Cloud Function. The function securely computes per-user participation, win counts, and win rate server-side. The sidebar is now role-gated (hidden for artists), gracefully empty when no auction activity exists, and shows a skeleton loading state while fetching.

* **My Active Bids Experience (Issue 2.2)**: Introduced a tab-based navigation on the Bids page for authenticated customers: **All Auctions** (global list) and **My Active Bids** (personal tracking). The "My Active Bids" tab fetches the user's bid history, cross-references with full auction documents via an optimized batched `findAuctionsByIds` Firestore query (chunked to stay within the 30-item `in` query limit), and displays a real-time status badge per auction:
  - 🟢 **Leading** — user holds the highest bid on a live auction.
  - 🔴 **Outbid** — user has been surpassed on a live auction.
  - 🟢 **Won** — auction ended and user is the winner.
  - ⚪ **Ended** — auction ended and user did not win.
  The tab UI is hidden for artists. An empty state encourages participation when no bids exist.

* **Premium Sliding Tab Indicator**: Replaced the instant-switching border-bottom hack on the Bids page tabs with the same sliding indicator used in the main navbar. Uses `offsetLeft`/`offsetWidth` measurements with `position: absolute` and `transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1)` to smoothly animate the active tab indicator horizontally without any vertical layout shift.


## Setup Instructions

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm i -g firebase-tools`)

### Environment Variables
1. Copy `.env.example` to `.env.local`
2. Fill in your Firebase Project credentials.

### Installation
```bash
# Install root dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### Running Locally
Run the Next.js development server:
```bash
npm run dev
```

Run the Firebase Emulators (for backend):
```bash
firebase emulators:start
```

## Architecture
- `app/`: Next.js App Router containing pages, layouts, and admin views.
- `lib/services/`: Service abstraction layer communicating with Firestore and Cloud Functions.
- `lib/repositories/`: Repository pattern implementations for data operations.
- `lib/stores/`: Zustand global state management.
- `lib/firebase/`: Firebase initialization and configurations.
- `functions/`: Cloud Functions (TypeScript) handling triggers, notifications, and verification.

## Database & Security Architecture
* **User Notifications**: Stored in a nested subcollection (`/users/{userId}/notifications/{notificationId}`) for high performance, strict owner-only read security, and isolation.
* **Auction Bids**: Stored under `/auctions/{auctionId}/bids/{bidId}` to enable structured querying, auction-isolated bid histories, and real-time subscription streams.
* **Security Rules**: Strictly configured Firestore rules enforcing:
  - Read/Write checks for specific user roles (`artist`, `verified_artist`, `moderator`, `admin`).
  - Owner-only notification retrieval.
  - Public read-only auction bids but validated bid creation rules.
* **Cloud Functions**:
  - `onUserCreated`: Initialises collector profile and sends a welcome notification.
  - `onArtworkWritten`: Manages artist-specific `artworkCount` dynamically, generates search keywords, and notifies followers.
  - `onOrderCreated`: Processes buyer notifications and alerts sellers of new purchases.
  - `verifyArtist`: Secure admin-only HTTPS callable function to process and status-update artisan applications.
  - `moderateArtwork`: Secure admin-only HTTPS callable function for artwork reporting and removals.
  - `placeBid`: Transactional bid placement with anti-snipe extension, minimum-increment enforcement, and post-transaction outbid notifications.
  - `closeEndedAuctions`: Scheduled (every 1 min) — marks ended auctions and batch-dispatches win / loss / artist-closure notifications atomically.
  - `auctionEndingSoon`: Scheduled (every 5 min) — dispatches ending-soon reminders at 24h, 1h, and 15m thresholds with `notifiedIntervals` deduplication.
  - `getUserBidAnalytics`: Secure callable returning a collector's participation, active bids, win count, and win rate.
