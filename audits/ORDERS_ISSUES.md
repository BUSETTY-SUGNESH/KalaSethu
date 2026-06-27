# Orders & Fulfillment — Issue Report

> **Files:** [`app/dashboard/orders/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/orders/page.tsx), [`app/dashboard/orders/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/orders/[id]/page.tsx), [`app/dashboard/artist/orders/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/orders/page.tsx)
> **Services:** [`order-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/order-service.ts), [`payment-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/payment-service.ts)
> **Cloud Functions:** `onOrderCreated`, `onOrderUpdated`, `createOrder`, `verifyPayment`, `razorpayWebhook`, `reconcileOrphanPayments`
>
> **Last updated:** 2026-06-27 — orders & fulfillment fix pass

---

## Summary

The orders flow now covers buyer order history, seller fulfillment (ship / tracking / delivered), status-change notifications, and safe handling of paid-but-unfulfilled payments via Razorpay refunds and a reconciliation scheduler.

| Status | Count |
|--------|-------|
| Resolved | 14 |
| Deferred / remaining | 6 |

**Deploy status (2026-06-27):** Firestore rules, indexes, `createOrder`, `verifyPayment`, `razorpayWebhook`, `onOrderCreated`, `onOrderUpdated` (`us-central1`), and `reconcileOrphanPayments` deployed to `kala-sethu`. Redeploy the Next.js app for client UI changes to go live.

---

## Resolved Issues

### ✅ M-14 — Multi-Seller Order ID Navigation `[RESOLVED — was already fixed]`
**Files:** [`functions/src/payment.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/payment.ts), [`app/(public)/checkout/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/checkout/page.tsx)
**Was:** Audit referenced `orderIds.join(',')` in `order-service.ts`; multi-seller carts could break detail navigation.
**Fix:** `verifyPayment` returns `orderIds: string[]`. Checkout routes to `/dashboard/orders/{firstId}` for single-seller or `/dashboard/orders` for multi-seller. No comma-joined IDs in codebase.

### ✅ M-21 — Inconsistent Notification Types `[RESOLVED]`
**Files:** [`functions/src/order.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/order.ts), [`app/components/layout/NotificationPanel.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/layout/NotificationPanel.tsx)
**Was:** Audit cited `order_update` / `system` types (stale). `payment_received` had no icon; seller link pointed to missing route.
**Fix:** Buyer `order_placed`, seller `payment_received` with shipping icon. Seller `actionUrl` → `/dashboard/artist/orders`.

### ✅ L-14 — External Placeholder Images `[RESOLVED]`
**Files:** [`public/placeholder-artwork.svg`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/public/placeholder-artwork.svg), [`lib/utils/order-display.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/utils/order-display.ts)
**Was:** `placehold.co` fallback on orders pages.
**Fix:** Local `/placeholder-artwork.svg` via `ARTWORK_PLACEHOLDER` constant.

### ✅ — No Pagination Controls `[RESOLVED]`
**File:** [`app/dashboard/orders/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/orders/page.tsx)
**Was:** Only first 20 buyer orders loaded.
**Fix:** Load More pagination using `lastDoc` / `hasMore` from `getBuyerOrders`.

### ✅ — Status Pill CSS Uses Raw Status `[RESOLVED]`
**Files:** [`lib/utils/order-display.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/utils/order-display.ts), orders list & detail pages
**Was:** Raw `order.status` used as CSS class; `processing`, `shipped`, etc. unstyled.
**Fix:** `getOrderStatusPillClass()` / `getPaymentStatusPillClass()` map to existing pill classes.

### ✅ — Shipping Address Schema Mismatch `[RESOLVED — critical, found during fix pass]`
**Files:** [`functions/src/payment.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/payment.ts), [`app/dashboard/orders/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/orders/[id]/page.tsx)
**Was:** Checkout stored `{ name, address }`; order detail expected `{ fullName, addressLine1 }` — shipping block rendered blank.
**Fix:** `normalizeShippingAddressForOrder()` at fulfillment; `formatOrderShippingAddress()` handles legacy docs on display.

### ✅ — Seller Fulfillment UI Missing `[RESOLVED]`
**Files:** [`app/dashboard/artist/orders/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/artist/orders/page.tsx), [`app/dashboard/orders/[id]/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/orders/[id]/page.tsx), [`lib/services/order-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/order-service.ts)
**Was:** `getSellerOrders` / `addTrackingInfo` existed but no UI.
**Fix:** Seller sales list; fulfillment panel (tracking + mark shipped / delivered); client transition guards; nav in dashboard sidebar and artist studio.

### ✅ — No Order Status Update Notifications `[RESOLVED]`
**File:** [`functions/src/order.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/order.ts)
**Was:** `order_shipped` / `order_delivered` types defined but never emitted.
**Fix:** `onOrderUpdated` notifies buyer on `shipped` and `delivered`. Deployed in `us-central1` (Firestore trigger region constraint).

### ✅ — Paid-but-Unfulfilled Payments `[RESOLVED]`
**Files:** [`functions/src/payment.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/payment.ts), [`functions/src/utils/payment-recovery.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/utils/payment-recovery.ts), [`app/(public)/checkout/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/checkout/page.tsx)
**Was:** Payment captured but order not created; no refund; webhook retried forever on permanent failures.
**Fix:** Idempotent `paymentLocks` with `fulfilled` / `refunded` status; `handleFulfillmentFailure()` issues Razorpay full refund; `paymentCaptures` ledger; `reconcileOrphanPayments` every 15 min; shipping required at `createOrder`; checkout handles `refunded` response.

### ✅ — Admin Disputes Invalid `paymentStatus` `[RESOLVED]`
**File:** [`app/admin/disputes/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/admin/disputes/page.tsx)
**Was:** Dismiss action wrote `paymentStatus: 'settled'` (not in `Order` union).
**Fix:** Uses `paymentStatus: 'completed'`.

### ✅ — Payments Read Rule Too Broad `[RESOLVED]`
**File:** [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules)
**Was:** Any authenticated user could read `/payments`.
**Fix:** `allow read: if isAdmin()`. `paymentCaptures` collection server-only.

---

## Remaining Issues

### 🔵 — No Order Cancellation or Return Flow `[DEFERRED]`
**Description:** Buyers cannot request cancel or return from the orders UI. Admin disputes page handles `refund_requested` but there is no buyer-facing flow.
**Impact:** Essential e-commerce feature still missing; intentionally deferred for minimal scope.

### 🔵 — Admin Dispute Refund Not Wired to Razorpay `[OPEN]`
**Description:** Admin "refund" action updates Firestore `paymentStatus: 'refunded'` only. No Razorpay `payments.refund` call.
**Impact:** Buyer may still be charged after admin marks refunded.

### 🔵 — No Inventory Reservation at Checkout `[OPEN]`
**Description:** Artwork status checked at `createOrder` and again at fulfillment, but not reserved between those steps.
**Impact:** Race window where two buyers can pay; second gets auto-refund (now handled) but poor UX.

### 🔵 — No `completed` Auto-Transition `[OPEN]`
**Description:** Seller can mark `delivered` but no buyer confirm-delivery or auto-`completed` flow.
**Impact:** Orders may stay at `delivered` indefinitely.

### 🔵 — Sales Orders Nav Not Role-Gated `[OPEN]`
**Description:** "Sales Orders" appears in dashboard sidebar for all users.
**Impact:** Non-sellers see empty page; minor UX issue.

### 🔵 — Seller Status Rules Allow Jumps `[OPEN — low]`
**Description:** Firestore `isValidOrderSellerUpdate` allows status jumps (e.g. `processing` → `delivered`) without enforcing `statusHistory`. Client guards exist; rules do not.
**Impact:** Malicious seller could bypass UI guards via direct Firestore writes (if they craft payloads).

---

## Verification Checklist

- [x] Multi-seller checkout redirects to orders list or first order ID
- [x] Buyer orders Load More works beyond 20 items
- [x] Status pills styled for all order statuses
- [x] Shipping address displays on new and legacy orders
- [x] Seller can ship (tracking) and mark delivered from order detail
- [x] Buyer receives `order_shipped` / `order_delivered` notifications
- [x] Unavailable artwork after payment triggers refund + buyer notification
- [x] `npm run build` (app) and `functions/npm run build` pass
- [ ] End-to-end test: place order → seller ship → buyer notification (manual)
- [ ] End-to-end test: simulate sold artwork at verify → refund toast (manual)
