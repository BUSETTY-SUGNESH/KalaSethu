# Bids Page — Issue Report

> **Files:** [`app/(public)/bids/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/bids/page.tsx), [`BidsClient.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/bids/BidsClient.tsx), [`SellerBidsClient.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/bids/SellerBidsClient.tsx)
> **Services:** `auction-service.ts`

---

## Summary
The Bids page switches between buyer view (`BidsClient`) and seller view (`SellerBidsClient`) based on user role. The buyer side correctly loads active auctions. The seller side has a **non-functional create auction form** and hardcoded statistics.

---

## Issues

### 🟡 M-05 — Create Auction Form is Unbound Stub `[EXISTING]`
**File:** [`SellerBidsClient.tsx:L64-113`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/bids/SellerBidsClient.tsx#L64-L113)
**Description:** The Create Auction form renders HTML inputs (`<select>`, `<input type="number">`, `<input type="datetime-local">`) but none are bound to React state. The "Launch Auction" button has no `onClick` handler and no form `onSubmit`. The artwork dropdown has hardcoded options.
**Impact:** Artists cannot create new auctions. The entire auction creation flow is a visual stub.

### 🟡 M-19 — "Edit Auction" and "Cancel" Buttons Have No Handlers `[NEW]`
**File:** [`SellerBidsClient.tsx:L192-193`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/bids/SellerBidsClient.tsx#L192-L193)
**Description:** Each auction card in the seller view shows "Edit Auction" and "Cancel" buttons. Neither has an `onClick` handler.
**Impact:** Sellers cannot edit or cancel their live auctions.

### 🟡 M-20 — Seller Auction Stats Are Hardcoded `[NEW]`
**File:** [`SellerBidsClient.tsx:L121-133`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/bids/SellerBidsClient.tsx#L121-L133)
**Description:** Stats cards show static values: "Active Auctions: 3", "Total Bids Received: 47", "Auctions Won by Buyers: 14", "Revenue from Bids: ₹8.2L". These are hardcoded and never reflect actual data.

### 🔵 — Seller View Loads All Active Auctions, Not Just Seller's `[NEW]`
**File:** [`SellerBidsClient.tsx:L19`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/bids/SellerBidsClient.tsx#L19)
**Description:** The seller view calls `getActiveAuctions(10)` which fetches all active auctions platform-wide, not just the seller's own auctions. Should call `getAuctionsByArtist(userId)`.
**Impact:** Sellers see other artists' auctions in "Your Active Auctions" section.

### 🔵 — Completed Auctions Sidebar is Hardcoded `[NEW]`
**File:** [`SellerBidsClient.tsx:L231-246`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/bids/SellerBidsClient.tsx#L231-L246)
**Description:** The "Completed Auctions" sidebar shows static values: "Total Completed: 14", "Avg. Final Bid: ₹58,000", "Highest Sale: ₹4,50,000".

### 🔵 — `formatDistanceToNow` Missing `addSuffix` `[NEW]`
**File:** [`SellerBidsClient.tsx:L187`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/bids/SellerBidsClient.tsx#L187)
**Description:** Time display shows "2 hours" instead of "2 hours left" or "in 2 hours" because `addSuffix: true` is not passed.
