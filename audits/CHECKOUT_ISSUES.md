# Cart & Checkout — Issue Report

> **Files:** [`app/(public)/checkout/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/checkout/page.tsx), [`app/(public)/cart/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/cart/page.tsx)
> **Stores:** [`cart-store.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/stores/cart-store.ts)
> **Services:** [`payment-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/payment-service.ts)
> **Cloud Functions:** `createOrder`, `verifyPayment`, `razorpayWebhook`
>
> **Last updated:** 2026-06-27 — checkout & payment security fix pass

---

## Summary

The checkout flow integrates Razorpay via Firebase Callable Functions in `asia-south1`. A production-safe fix pass addressed all critical security and UX issues from the original audit, plus server-authoritative pricing at order creation, checkout session persistence, webhook fulfillment, and transactional payment idempotency.

| Status | Count |
|--------|-------|
| Resolved | 11 |
| Partially resolved | 1 |
| Remaining / operational | 4 |

**Deploy status (2026-06-27):** Firestore rules, `createOrder`, `verifyPayment`, and `razorpayWebhook` deployed to `kala-sethu`. Webhook URL: `https://asia-south1-kala-sethu.cloudfunctions.net/razorpayWebhook`

---

## Resolved Issues

### ✅ C-01 — Payment Price Manipulation `[RESOLVED]`
**Files:** [`functions/src/payment.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/payment.ts), [`functions/src/utils/checkout-validation.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/utils/checkout-validation.ts)
**Was:** Client `item.price` trusted for order totals.
**Fix:** `validateCheckoutItems()` fetches artworks from Firestore; uses server `price`; verifies Razorpay order amount matches server total (paise). Client prices are no longer sent to `verifyPayment`.

### ✅ C-02 — Direct Order Injection via Client SDK `[RESOLVED]`
**Files:** [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules), [`lib/services/order-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/order-service.ts)
**Was:** Client `order-service.createOrder()` could write to `/orders`; rules allowed buyer creates.
**Fix:** `allow create: if false` on `/orders`. Unused client `createOrder()` removed from `order-service.ts`. Orders created only via `verifyPayment` / webhook `fulfillCheckoutSession`.

### ⚠️ C-05 — Razorpay Script Injected Without SRI `[PARTIALLY RESOLVED]`
**File:** [`app/(public)/checkout/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/checkout/page.tsx)
**Was:** New `<script>` tag on every Pay click; no Subresource Integrity.
**Fix:** Module-level deduplicated loader — reuses `window.Razorpay`, single script element (`razorpay-checkout-js`), cached in-flight promise.
**Remaining:** Razorpay CDN does not publish SRI hashes for `checkout.js`; full integrity pinning is not possible without vendor support.

### ✅ H-07 — Cart Not Scoped to User `[RESOLVED]`
**File:** [`lib/stores/cart-store.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/stores/cart-store.ts), [`app/components/providers/AuthProvider.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/providers/AuthProvider.tsx)
**Was:** Cart persisted to `kalasetu_cart` without user ID.
**Fix:** Per-user key `kalasetu_cart_{userId}`; `setCartUser()` on login/logout; legacy key migrated on hydrate.

### ✅ H-08 — Duplicate Razorpay Script Tags `[RESOLVED]`
**File:** [`app/(public)/checkout/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/checkout/page.tsx)
**Was:** New script appended on every `handlePayment` call.
**Fix:** Same deduplicated loader as C-05 mitigation.

### ✅ M-14 — `createOrder` Returns Comma-Joined IDs `[RESOLVED]`
**Files:** [`functions/src/payment.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/payment.ts), [`app/(public)/checkout/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/checkout/page.tsx)
**Was:** Multi-seller checkout returned comma-joined string.
**Fix:** `verifyPayment` returns `orderIds: string[]`; checkout redirects to order list when multiple sellers.

### ✅ L-21 — No Pincode Validation `[RESOLVED]`
**File:** [`app/(public)/checkout/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/checkout/page.tsx)
**Was:** Pincode accepted any text.
**Fix:** `inputMode="numeric"`, `maxLength={6}`, `pattern="[0-9]{6}"`, digits-only input sanitization, pre-submit `isValidPincode()` check.

### ✅ L-22 — `isProcessing` Resets While Razorpay Modal Open `[RESOLVED]`
**File:** [`app/(public)/checkout/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/checkout/page.tsx)
**Was:** `finally` block re-enabled Pay button while modal was open.
**Fix:** Button stays disabled until `modal.ondismiss`, `payment.failed`, verify handler completes, or setup error.

---

## Additional Fixes (Beyond Original Audit)

### ✅ Server-Authoritative Pricing at Razorpay Order Creation `[RESOLVED]`
**Files:** [`functions/src/payment.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/payment.ts), [`lib/services/payment-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/payment-service.ts)
**Was:** `createOrder` accepted client `amount` only; stale cart prices could cause captured-but-unfulfilled payments.
**Fix:** `createOrder` requires `items[]`, validates server-side, creates Razorpay order at computed total, persists `checkoutSessions/{razorpayOrderId}`, returns `serverTotal`. Client shows toast if cart total differs.

### ✅ Razorpay Webhook for Tab-Close Recovery `[RESOLVED — CODE]`
**File:** [`functions/src/payment.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/payment.ts)
**Was:** Fulfillment 100% client-driven; payment captured with no order if tab closed before `verifyPayment`.
**Fix:** `razorpayWebhook` HTTP handler for `payment.captured`; verifies webhook signature; reuses `fulfillCheckoutSession`.
**Operational:** Register webhook URL in Razorpay dashboard; set `RAZORPAY_WEBHOOK_SECRET` in Functions env.

### ✅ Payment Idempotency & Status Hardening `[RESOLVED]`
**Files:** [`functions/src/payment.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/functions/src/payment.ts), [`firestore.rules`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/firestore.rules)
**Fix:** `paymentLocks/{paymentId}` written inside Firestore transaction; `payments.fetch` requires `status === 'captured'`; signature mismatch logs prefix only (not expected hash); `checkoutSessions` and `paymentLocks` deny all client access.

---

## Remaining Issues

| ID | Issue | Reason |
|----|-------|--------|
| C-05 | Full SRI on Razorpay script | Razorpay does not publish integrity hashes |
| — | Webhook dashboard config | Set `RAZORPAY_WEBHOOK_SECRET`; register URL in Razorpay |
| — | Refund automation | No Razorpay refund Cloud Function (out of scope) |
| — | App Check enforcement | Optional; requires `ENFORCE_APP_CHECK=true` env config |

---

## Verification Checklist

- [x] Functions TypeScript build passes
- [x] Firestore rules compile and deploy
- [x] `createOrder`, `verifyPayment`, `razorpayWebhook` deployed
- [ ] End-to-end purchase in staging/production
- [ ] Price tampering in DevTools → order at Firestore price
- [ ] Firestore console order write → denied
- [ ] User switch on same device → separate carts
- [ ] Double-click Pay → single modal, button disabled
- [ ] Invalid pincode → blocked before Razorpay
- [ ] Tab close after pay → webhook creates order (after Razorpay config)
- [ ] Replay same `payment_id` → idempotent, no duplicate orders

---

## Architecture (Post-Fix)

```
Checkout → createOrder(items, shippingAddress)
         → CF validates artworks, writes checkoutSessions, creates Razorpay order
         → Razorpay modal
         → verifyPayment(sig, shippingAddress) OR razorpayWebhook(payment.captured)
         → fulfillCheckoutSession (transaction: paymentLock + orders + artworks sold)
```
