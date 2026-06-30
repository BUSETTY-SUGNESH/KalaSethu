"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileOrphanPayments = exports.razorpayWebhook = exports.verifyPayment = exports.createOrder = void 0;
const ff = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto = __importStar(require("crypto"));
const config_1 = require("./config");
const app_check_1 = require("./utils/app-check");
const rate_limit_1 = require("./utils/rate-limit");
const schema_validation_1 = require("./utils/schema-validation");
const checkout_validation_1 = require("./utils/checkout-validation");
const payment_recovery_1 = require("./utils/payment-recovery");
const feature_flags_1 = require("./utils/feature-flags");
const CHECKOUT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const RECONCILE_BATCH_SIZE = 20;
const RECONCILE_MIN_AGE_MS = 5 * 60 * 1000;
function getRazorpayKeys() {
    return {
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    };
}
function getWebhookSecret() {
    return process.env.RAZORPAY_WEBHOOK_SECRET;
}
function normalizeShippingAddressForOrder(addr, buyerPhone) {
    const legacy = addr;
    return {
        fullName: legacy.fullName || legacy.name || '',
        addressLine1: legacy.addressLine1 || legacy.address || '',
        city: addr.city || '',
        state: addr.state || '',
        pincode: addr.pincode || '',
        country: addr.country || 'India',
        phone: legacy.phone || buyerPhone || '',
    };
}
function verifyPaymentSignature(orderId, paymentId, signature, keySecret) {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');
    return expectedSignature === signature;
}
async function fulfillCheckoutSession(params) {
    const { buyerId, buyerName, buyerEmail, buyerPhone, validatedItems, shippingAddress, razorpayOrderId, razorpayPaymentId, } = params;
    const orderShippingAddress = normalizeShippingAddressForOrder(shippingAddress, buyerPhone);
    const artworkIds = validatedItems.map((item) => item.artworkId);
    const sellerGroups = {};
    for (const item of validatedItems) {
        if (!sellerGroups[item.artistId]) {
            sellerGroups[item.artistId] = [];
        }
        sellerGroups[item.artistId].push(item);
    }
    const orderIds = await config_1.db.runTransaction(async (transaction) => {
        const lockRef = config_1.db.collection('paymentLocks').doc(razorpayPaymentId);
        const lockSnap = await transaction.get(lockRef);
        if (lockSnap.exists) {
            const existing = lockSnap.data()?.orderIds;
            if (existing && existing.length > 0) {
                return existing;
            }
        }
        const txArtworkSnaps = await Promise.all(artworkIds.map((id) => transaction.get(config_1.db.collection('artworks').doc(id))));
        for (let i = 0; i < txArtworkSnaps.length; i++) {
            const snap = txArtworkSnaps[i];
            if (!snap.exists || snap.data()?.status !== 'published') {
                throw new ff.https.HttpsError('failed-precondition', `Artwork ${artworkIds[i]} is no longer available`);
            }
        }
        const createdOrderIds = [];
        for (const [sellerId, sellerItems] of Object.entries(sellerGroups)) {
            const subtotal = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const shippingCost = 0;
            const tax = 0;
            const totalAmount = subtotal + shippingCost + tax;
            const newOrderRef = config_1.db.collection('orders').doc();
            const orderData = {
                id: newOrderRef.id,
                buyerId,
                buyerName,
                buyerEmail,
                sellerId,
                sellerName: sellerItems[0]?.artistName || "Unknown Artist",
                items: sellerItems,
                subtotal,
                shippingCost,
                tax,
                totalAmount,
                currency: 'INR',
                shippingAddress: orderShippingAddress,
                paymentId: razorpayPaymentId,
                paymentOrderId: razorpayOrderId,
                paymentStatus: 'completed',
                status: 'processing',
                statusHistory: [
                    {
                        status: 'processing',
                        timestamp: new Date().toISOString(),
                        note: 'Payment verified and order created',
                        updatedBy: 'system'
                    }
                ],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            (0, schema_validation_1.validateOrderDocument)(orderData);
            transaction.set(newOrderRef, orderData);
            createdOrderIds.push(newOrderRef.id);
            for (const item of sellerItems) {
                const artworkRef = config_1.db.collection('artworks').doc(item.artworkId);
                transaction.update(artworkRef, {
                    status: 'sold',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        transaction.set(lockRef, {
            status: 'fulfilled',
            orderIds: createdOrderIds,
            razorpayOrderId,
            buyerId,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const sessionRef = config_1.db.collection('checkoutSessions').doc(razorpayOrderId);
        transaction.update(sessionRef, {
            status: 'fulfilled',
            fulfilledAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return createdOrderIds;
    });
    return orderIds;
}
async function runFulfillmentAfterCapture(params) {
    await (0, payment_recovery_1.recordPaymentCapture)(params.razorpayPaymentId, {
        razorpayOrderId: params.razorpayOrderId,
        buyerId: params.buyerId,
        amountPaise: params.amountPaise,
    });
    try {
        const orderIds = await fulfillCheckoutSession({
            buyerId: params.buyerId,
            buyerName: params.buyerName,
            buyerEmail: params.buyerEmail,
            buyerPhone: params.buyerPhone,
            validatedItems: params.validatedItems,
            shippingAddress: params.shippingAddress,
            razorpayOrderId: params.razorpayOrderId,
            razorpayPaymentId: params.razorpayPaymentId,
        });
        await (0, payment_recovery_1.updatePaymentCaptureStatus)(params.razorpayPaymentId, 'fulfilled');
        return { orderIds };
    }
    catch (error) {
        if ((0, payment_recovery_1.isNonRetryableFulfillmentError)(error)) {
            const reason = error instanceof ff.https.HttpsError
                ? error.message
                : 'Order could not be fulfilled';
            await (0, payment_recovery_1.handleFulfillmentFailure)({
                razorpay: params.razorpay,
                razorpayPaymentId: params.razorpayPaymentId,
                razorpayOrderId: params.razorpayOrderId,
                buyerId: params.buyerId,
                amountPaise: params.amountPaise,
                reason,
            });
            return { refunded: true, error: reason };
        }
        throw error;
    }
}
function getLockOutcome(lockData) {
    if (!lockData)
        return null;
    if (lockData.status === 'refunded')
        return 'refunded';
    const orderIds = lockData.orderIds || [];
    if (lockData.status === 'fulfilled' || orderIds.length > 0)
        return 'fulfilled';
    return null;
}
async function loadCheckoutSessionForReconcile(razorpayOrderId) {
    const sessionSnap = await config_1.db.collection('checkoutSessions').doc(razorpayOrderId).get();
    if (!sessionSnap.exists)
        return null;
    const session = sessionSnap.data();
    if (session.status === 'fulfilled' || session.status === 'failed')
        return null;
    return {
        items: session.items,
        serverTotalPaise: session.serverTotalPaise,
        shippingAddress: session.shippingAddress,
        buyerId: session.buyerId,
    };
}
async function loadCheckoutSession(razorpayOrderId, buyerId) {
    const sessionSnap = await config_1.db.collection('checkoutSessions').doc(razorpayOrderId).get();
    if (!sessionSnap.exists) {
        throw new ff.https.HttpsError('not-found', 'Checkout session not found');
    }
    const session = sessionSnap.data();
    if (session.buyerId !== buyerId) {
        throw new ff.https.HttpsError('permission-denied', 'Checkout session does not belong to this user');
    }
    if (session.status === 'fulfilled') {
        throw new ff.https.HttpsError('already-exists', 'Checkout session already fulfilled');
    }
    const expiresAt = session.expiresAt?.toDate?.();
    if (expiresAt && expiresAt.getTime() < Date.now()) {
        throw new ff.https.HttpsError('failed-precondition', 'Checkout session has expired');
    }
    return {
        items: session.items,
        serverTotalPaise: session.serverTotalPaise,
        shippingAddress: session.shippingAddress,
    };
}
exports.createOrder = ff.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new ff.https.HttpsError('unauthenticated', 'Must be logged in to create an order');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'paymentCreateOrder');
    await (0, feature_flags_1.assertNotInMaintenance)(context.auth.uid);
    const { items, amount, currency = "INR", shippingAddress } = data;
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ff.https.HttpsError('invalid-argument', 'Order items are required');
    }
    const validatedItems = await (0, checkout_validation_1.validateCheckoutItems)(items);
    const serverTotalPaise = (0, checkout_validation_1.computeServerTotalPaise)(validatedItems);
    const serverTotal = serverTotalPaise / 100;
    if (typeof amount === 'number' && Math.round(amount * 100) !== serverTotalPaise) {
        throw new ff.https.HttpsError('failed-precondition', 'Cart total does not match current artwork prices');
    }
    if (!shippingAddress?.name || !shippingAddress?.address || !shippingAddress?.pincode) {
        throw new ff.https.HttpsError('invalid-argument', 'Shipping address is required before checkout');
    }
    const { key_id, key_secret } = getRazorpayKeys();
    if (!key_id || !key_secret) {
        console.error("Razorpay keys are not configured");
        throw new ff.https.HttpsError('internal', 'Payment gateway configuration error');
    }
    try {
        const razorpay = new razorpay_1.default({ key_id, key_secret });
        const options = {
            amount: serverTotalPaise,
            currency,
            receipt: `rcpt_${context.auth.uid.substring(0, 5)}_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);
        const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_TTL_MS);
        await config_1.db.collection('checkoutSessions').doc(order.id).set({
            buyerId: context.auth.uid,
            items: validatedItems,
            serverTotalPaise,
            shippingAddress: shippingAddress || null,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        });
        return {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            serverTotal,
        };
    }
    catch (error) {
        if (error instanceof ff.https.HttpsError) {
            throw error;
        }
        console.error("Payment creation error", error);
        throw new ff.https.HttpsError('internal', 'Failed to create payment order');
    }
});
exports.verifyPayment = ff.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new ff.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    (0, app_check_1.assertAppCheck)(context);
    await (0, rate_limit_1.assertRateLimit)(context.auth.uid, 'verifyPayment');
    await (0, feature_flags_1.assertNotInMaintenance)(context.auth.uid);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = data;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ff.https.HttpsError('invalid-argument', 'Missing payment verification fields');
    }
    const { key_id, key_secret } = getRazorpayKeys();
    if (!key_id || !key_secret) {
        console.error("Razorpay keys are not configured");
        throw new ff.https.HttpsError('internal', 'Payment gateway configuration error');
    }
    try {
        if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, key_secret)) {
            console.warn("Invalid payment signature detected", {
                receivedPrefix: String(razorpay_signature).slice(0, 8),
            });
            return { success: false, error: "Invalid payment signature" };
        }
        const lockSnap = await config_1.db.collection('paymentLocks').doc(razorpay_payment_id).get();
        if (lockSnap.exists) {
            const lock = lockSnap.data();
            const outcome = getLockOutcome(lock);
            if (outcome === 'refunded') {
                return {
                    success: false,
                    refunded: true,
                    error: lock.reason || 'Payment was refunded because the order could not be fulfilled',
                };
            }
            const orderIds = lock.orderIds || [];
            if (orderIds.length > 0) {
                return { success: true, orderIds, orderId: orderIds[0] };
            }
        }
        const session = await loadCheckoutSession(razorpay_order_id, context.auth.uid);
        const validatedItems = session.items;
        const serverTotalPaise = session.serverTotalPaise;
        const razorpay = new razorpay_1.default({ key_id, key_secret });
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (payment.status !== 'captured') {
            throw new ff.https.HttpsError('failed-precondition', 'Payment has not been captured');
        }
        const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
        const razorpayAmount = typeof razorpayOrder.amount === 'number'
            ? razorpayOrder.amount
            : Number(razorpayOrder.amount);
        if (razorpayAmount !== serverTotalPaise) {
            throw new ff.https.HttpsError('failed-precondition', 'Payment amount does not match order total');
        }
        const shippingAddress = orderDetails?.shippingAddress || session.shippingAddress;
        if (!shippingAddress?.name || !shippingAddress?.address || !shippingAddress?.pincode) {
            throw new ff.https.HttpsError('invalid-argument', 'Shipping address is required');
        }
        const userRecord = await admin.auth().getUser(context.auth.uid);
        const buyerName = userRecord.displayName || "Anonymous";
        const buyerEmail = userRecord.email || "";
        const result = await runFulfillmentAfterCapture({
            razorpay,
            buyerId: context.auth.uid,
            buyerName,
            buyerEmail,
            buyerPhone: userRecord.phoneNumber || '',
            validatedItems,
            shippingAddress,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            amountPaise: serverTotalPaise,
        });
        if (result.refunded) {
            return { success: false, refunded: true, error: result.error };
        }
        const orderIds = result.orderIds;
        return { success: true, orderIds, orderId: orderIds[0] };
    }
    catch (error) {
        if (error instanceof ff.https.HttpsError) {
            if (error.code === 'already-exists') {
                const lockSnap = await config_1.db.collection('paymentLocks').doc(razorpay_payment_id).get();
                if (lockSnap.exists) {
                    const lock = lockSnap.data();
                    const outcome = getLockOutcome(lock);
                    if (outcome === 'refunded') {
                        return { success: false, refunded: true, error: lock.reason || 'Payment was refunded' };
                    }
                    const orderIds = lock.orderIds || [];
                    if (orderIds.length > 0) {
                        return { success: true, orderIds, orderId: orderIds[0] };
                    }
                }
            }
            throw error;
        }
        console.error("Payment verification error", error);
        throw new ff.https.HttpsError('internal', 'Failed to verify payment');
    }
});
exports.razorpayWebhook = ff.region('asia-south1').https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
        console.error('RAZORPAY_WEBHOOK_SECRET is not configured');
        res.status(500).send('Webhook not configured');
        return;
    }
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
        res.status(400).send('Missing signature');
        return;
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
        res.status(400).send('Missing raw body');
        return;
    }
    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
    if (expectedSignature !== signature) {
        console.warn('Invalid webhook signature');
        res.status(400).send('Invalid signature');
        return;
    }
    try {
        const event = req.body;
        if (event.event !== 'payment.captured') {
            res.status(200).send('OK');
            return;
        }
        const paymentEntity = event.payload?.payment?.entity;
        if (!paymentEntity) {
            res.status(400).send('Invalid payload');
            return;
        }
        const razorpayPaymentId = paymentEntity.id;
        const razorpayOrderId = paymentEntity.order_id;
        const paymentStatus = paymentEntity.status;
        const amountPaise = typeof paymentEntity.amount === 'number'
            ? paymentEntity.amount
            : Number(paymentEntity.amount);
        if (paymentStatus !== 'captured') {
            res.status(200).send('OK');
            return;
        }
        const { key_id, key_secret } = getRazorpayKeys();
        if (!key_id || !key_secret) {
            console.error('Razorpay keys are not configured for webhook');
            res.status(500).send('Payment gateway configuration error');
            return;
        }
        const razorpay = new razorpay_1.default({ key_id, key_secret });
        const existingLock = await config_1.db.collection('paymentLocks').doc(razorpayPaymentId).get();
        if (existingLock.exists) {
            res.status(200).send('OK');
            return;
        }
        const sessionSnap = await config_1.db.collection('checkoutSessions').doc(razorpayOrderId).get();
        if (!sessionSnap.exists) {
            console.error('Webhook: checkout session not found', { razorpayOrderId });
            res.status(200).send('OK');
            return;
        }
        const session = sessionSnap.data();
        const buyerId = session.buyerId;
        await (0, payment_recovery_1.recordPaymentCapture)(razorpayPaymentId, {
            razorpayOrderId,
            buyerId,
            amountPaise,
        });
        if (session.status === 'fulfilled') {
            res.status(200).send('OK');
            return;
        }
        const expiresAt = session.expiresAt?.toDate?.();
        if (expiresAt && expiresAt.getTime() < Date.now()) {
            console.error('Webhook: checkout session expired', { razorpayOrderId });
            await (0, payment_recovery_1.handleFulfillmentFailure)({
                razorpay,
                razorpayPaymentId,
                razorpayOrderId,
                buyerId,
                amountPaise,
                reason: 'Checkout session expired before fulfillment',
            });
            res.status(200).send('OK');
            return;
        }
        const validatedItems = session.items;
        const shippingAddress = session.shippingAddress;
        if (!shippingAddress?.name || !shippingAddress?.address || !shippingAddress?.pincode) {
            console.error('Webhook: missing shipping address in session', { razorpayOrderId });
            await (0, payment_recovery_1.handleFulfillmentFailure)({
                razorpay,
                razorpayPaymentId,
                razorpayOrderId,
                buyerId,
                amountPaise,
                reason: 'Shipping address was missing from checkout session',
            });
            res.status(200).send('OK');
            return;
        }
        const userRecord = await admin.auth().getUser(buyerId);
        const buyerName = userRecord.displayName || "Anonymous";
        const buyerEmail = userRecord.email || "";
        const result = await runFulfillmentAfterCapture({
            razorpay,
            buyerId,
            buyerName,
            buyerEmail,
            buyerPhone: userRecord.phoneNumber || '',
            validatedItems,
            shippingAddress,
            razorpayOrderId,
            razorpayPaymentId,
            amountPaise,
        });
        if (result.refunded) {
            console.warn('Webhook: fulfillment failed, payment refunded', {
                razorpayOrderId,
                reason: result.error,
            });
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Webhook processing error', error);
        res.status(500).send('Internal error');
    }
});
exports.reconcileOrphanPayments = ff.region('asia-south1').pubsub
    .schedule('every 15 minutes')
    .onRun(async () => {
    const { key_id, key_secret } = getRazorpayKeys();
    if (!key_id || !key_secret) {
        console.error('Razorpay keys are not configured for reconciliation');
        return null;
    }
    const razorpay = new razorpay_1.default({ key_id, key_secret });
    const cutoff = admin.firestore.Timestamp.fromDate(new Date(Date.now() - RECONCILE_MIN_AGE_MS));
    const pendingCaptures = await config_1.db.collection('paymentCaptures')
        .where('status', '==', 'pending')
        .where('capturedAt', '<', cutoff)
        .limit(RECONCILE_BATCH_SIZE)
        .get();
    for (const captureDoc of pendingCaptures.docs) {
        const capture = captureDoc.data();
        const razorpayPaymentId = captureDoc.id;
        const razorpayOrderId = capture.razorpayOrderId;
        const buyerId = capture.buyerId;
        const amountPaise = capture.amountPaise;
        const lockSnap = await config_1.db.collection('paymentLocks').doc(razorpayPaymentId).get();
        const outcome = getLockOutcome(lockSnap.data());
        if (outcome === 'fulfilled') {
            await (0, payment_recovery_1.updatePaymentCaptureStatus)(razorpayPaymentId, 'fulfilled');
            continue;
        }
        if (outcome === 'refunded') {
            await (0, payment_recovery_1.updatePaymentCaptureStatus)(razorpayPaymentId, 'refunded');
            continue;
        }
        const session = await loadCheckoutSessionForReconcile(razorpayOrderId);
        if (!session) {
            await (0, payment_recovery_1.handleFulfillmentFailure)({
                razorpay,
                razorpayPaymentId,
                razorpayOrderId,
                buyerId,
                amountPaise,
                reason: 'Checkout session unavailable during reconciliation',
            });
            continue;
        }
        const shippingAddress = session.shippingAddress;
        if (!shippingAddress?.name || !shippingAddress?.address || !shippingAddress?.pincode) {
            await (0, payment_recovery_1.handleFulfillmentFailure)({
                razorpay,
                razorpayPaymentId,
                razorpayOrderId,
                buyerId: session.buyerId,
                amountPaise: session.serverTotalPaise,
                reason: 'Shipping address missing during reconciliation',
            });
            continue;
        }
        let userRecord;
        try {
            userRecord = await admin.auth().getUser(session.buyerId);
        }
        catch {
            await (0, payment_recovery_1.handleFulfillmentFailure)({
                razorpay,
                razorpayPaymentId,
                razorpayOrderId,
                buyerId: session.buyerId,
                amountPaise: session.serverTotalPaise,
                reason: 'Buyer account unavailable during reconciliation',
            });
            continue;
        }
        await runFulfillmentAfterCapture({
            razorpay,
            buyerId: session.buyerId,
            buyerName: userRecord.displayName || 'Anonymous',
            buyerEmail: userRecord.email || '',
            buyerPhone: userRecord.phoneNumber || '',
            validatedItems: session.items,
            shippingAddress,
            razorpayOrderId,
            razorpayPaymentId,
            amountPaise: session.serverTotalPaise,
        });
    }
    return null;
});
//# sourceMappingURL=payment.js.map