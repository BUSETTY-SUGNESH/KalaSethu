import * as ff from "firebase-functions/v1";
import * as admin from "firebase-admin";
import Razorpay from "razorpay";
import * as crypto from "crypto";
import { db } from './config';
import { assertAppCheck } from './utils/app-check';
import { assertRateLimit } from './utils/rate-limit';
import { validateOrderDocument } from './utils/schema-validation';
import {
  validateCheckoutItems,
  computeServerTotalPaise,
  type ClientOrderItem,
  type ValidatedOrderItem,
  type ShippingAddress,
} from './utils/checkout-validation';
import {
  recordPaymentCapture,
  updatePaymentCaptureStatus,
  handleFulfillmentFailure,
  isNonRetryableFulfillmentError,
} from './utils/payment-recovery';

const CHECKOUT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const RECONCILE_BATCH_SIZE = 20;
const RECONCILE_MIN_AGE_MS = 5 * 60 * 1000;

function getRazorpayKeys(): { key_id?: string; key_secret?: string } {
  const legacyConfig = typeof (ff as { config?: () => { razorpay?: { key_id?: string; key_secret?: string } } }).config === 'function'
    ? (ff as { config: () => { razorpay?: { key_id?: string; key_secret?: string } } }).config()
    : {};
  return {
    key_id: process.env.RAZORPAY_KEY_ID || legacyConfig.razorpay?.key_id,
    key_secret: process.env.RAZORPAY_KEY_SECRET || legacyConfig.razorpay?.key_secret,
  };
}

function getWebhookSecret(): string | undefined {
  const legacyConfig = typeof (ff as { config?: () => { razorpay?: { webhook_secret?: string } } }).config === 'function'
    ? (ff as { config: () => { razorpay?: { webhook_secret?: string } } }).config()
    : {};
  return process.env.RAZORPAY_WEBHOOK_SECRET || legacyConfig.razorpay?.webhook_secret;
}

interface OrderShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

function normalizeShippingAddressForOrder(
  addr: ShippingAddress,
  buyerPhone?: string
): OrderShippingAddress {
  const legacy = addr as ShippingAddress & {
    fullName?: string;
    addressLine1?: string;
    phone?: string;
  };
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

function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

interface FulfillParams {
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  validatedItems: ValidatedOrderItem[];
  shippingAddress: ShippingAddress;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}

async function fulfillCheckoutSession(params: FulfillParams): Promise<string[]> {
  const {
    buyerId,
    buyerName,
    buyerEmail,
    buyerPhone,
    validatedItems,
    shippingAddress,
    razorpayOrderId,
    razorpayPaymentId,
  } = params;

  const orderShippingAddress = normalizeShippingAddressForOrder(shippingAddress, buyerPhone);

  const artworkIds = validatedItems.map((item) => item.artworkId);

  const sellerGroups: Record<string, ValidatedOrderItem[]> = {};
  for (const item of validatedItems) {
    if (!sellerGroups[item.artistId]) {
      sellerGroups[item.artistId] = [];
    }
    sellerGroups[item.artistId].push(item);
  }

  const orderIds = await db.runTransaction(async (transaction) => {
    const lockRef = db.collection('paymentLocks').doc(razorpayPaymentId);
    const lockSnap = await transaction.get(lockRef);

    if (lockSnap.exists) {
      const existing = lockSnap.data()?.orderIds as string[] | undefined;
      if (existing && existing.length > 0) {
        return existing;
      }
    }

    const txArtworkSnaps = await Promise.all(
      artworkIds.map((id) => transaction.get(db.collection('artworks').doc(id)))
    );

    for (let i = 0; i < txArtworkSnaps.length; i++) {
      const snap = txArtworkSnaps[i];
      if (!snap.exists || snap.data()?.status !== 'published') {
        throw new ff.https.HttpsError(
          'failed-precondition',
          `Artwork ${artworkIds[i]} is no longer available`
        );
      }
    }

    const createdOrderIds: string[] = [];

    for (const [sellerId, sellerItems] of Object.entries(sellerGroups)) {
      const subtotal = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shippingCost = 0;
      const tax = 0;
      const totalAmount = subtotal + shippingCost + tax;

      const newOrderRef = db.collection('orders').doc();
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

      validateOrderDocument(orderData as Record<string, unknown>);
      transaction.set(newOrderRef, orderData);
      createdOrderIds.push(newOrderRef.id);

      for (const item of sellerItems) {
        const artworkRef = db.collection('artworks').doc(item.artworkId);
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

    const sessionRef = db.collection('checkoutSessions').doc(razorpayOrderId);
    transaction.update(sessionRef, {
      status: 'fulfilled',
      fulfilledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return createdOrderIds;
  });

  return orderIds;
}

interface RunFulfillmentParams {
  razorpay: Razorpay;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  validatedItems: ValidatedOrderItem[];
  shippingAddress: ShippingAddress;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
}

async function runFulfillmentAfterCapture(
  params: RunFulfillmentParams
): Promise<{ orderIds?: string[]; refunded?: boolean; error?: string }> {
  await recordPaymentCapture(params.razorpayPaymentId, {
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
    await updatePaymentCaptureStatus(params.razorpayPaymentId, 'fulfilled');
    return { orderIds };
  } catch (error) {
    if (isNonRetryableFulfillmentError(error)) {
      const reason = error instanceof ff.https.HttpsError
        ? error.message
        : 'Order could not be fulfilled';
      await handleFulfillmentFailure({
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

function getLockOutcome(lockData: Record<string, unknown> | undefined): 'fulfilled' | 'refunded' | null {
  if (!lockData) return null;
  if (lockData.status === 'refunded') return 'refunded';
  const orderIds = (lockData.orderIds as string[] | undefined) || [];
  if (lockData.status === 'fulfilled' || orderIds.length > 0) return 'fulfilled';
  return null;
}

async function loadCheckoutSessionForReconcile(
  razorpayOrderId: string
): Promise<{ items: ValidatedOrderItem[]; serverTotalPaise: number; shippingAddress?: ShippingAddress; buyerId: string } | null> {
  const sessionSnap = await db.collection('checkoutSessions').doc(razorpayOrderId).get();
  if (!sessionSnap.exists) return null;
  const session = sessionSnap.data()!;
  if (session.status === 'fulfilled' || session.status === 'failed') return null;
  return {
    items: session.items as ValidatedOrderItem[],
    serverTotalPaise: session.serverTotalPaise as number,
    shippingAddress: session.shippingAddress as ShippingAddress | undefined,
    buyerId: session.buyerId as string,
  };
}

async function loadCheckoutSession(
  razorpayOrderId: string,
  buyerId: string
): Promise<{ items: ValidatedOrderItem[]; serverTotalPaise: number; shippingAddress?: ShippingAddress }> {
  const sessionSnap = await db.collection('checkoutSessions').doc(razorpayOrderId).get();

  if (!sessionSnap.exists) {
    throw new ff.https.HttpsError('not-found', 'Checkout session not found');
  }

  const session = sessionSnap.data()!;
  if (session.buyerId !== buyerId) {
    throw new ff.https.HttpsError('permission-denied', 'Checkout session does not belong to this user');
  }
  if (session.status === 'fulfilled') {
    throw new ff.https.HttpsError('already-exists', 'Checkout session already fulfilled');
  }

  const expiresAt = session.expiresAt?.toDate?.() as Date | undefined;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new ff.https.HttpsError('failed-precondition', 'Checkout session has expired');
  }

  return {
    items: session.items as ValidatedOrderItem[],
    serverTotalPaise: session.serverTotalPaise as number,
    shippingAddress: session.shippingAddress as ShippingAddress | undefined,
  };
}

export const createOrder = ff.region('asia-south1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new ff.https.HttpsError('unauthenticated', 'Must be logged in to create an order');
  }

  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'paymentCreateOrder');

  const { items, amount, currency = "INR", shippingAddress } = data as {
    items?: ClientOrderItem[];
    amount?: number;
    currency?: string;
    shippingAddress?: ShippingAddress;
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ff.https.HttpsError('invalid-argument', 'Order items are required');
  }

  const validatedItems = await validateCheckoutItems(items);
  const serverTotalPaise = computeServerTotalPaise(validatedItems);
  const serverTotal = serverTotalPaise / 100;

  if (typeof amount === 'number' && Math.round(amount * 100) !== serverTotalPaise) {
    throw new ff.https.HttpsError(
      'failed-precondition',
      'Cart total does not match current artwork prices'
    );
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
    const razorpay = new Razorpay({ key_id, key_secret });

    const options = {
      amount: serverTotalPaise,
      currency,
      receipt: `rcpt_${context.auth.uid.substring(0, 5)}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_TTL_MS);
    await db.collection('checkoutSessions').doc(order.id).set({
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
  } catch (error) {
    if (error instanceof ff.https.HttpsError) {
      throw error;
    }
    console.error("Payment creation error", error);
    throw new ff.https.HttpsError('internal', 'Failed to create payment order');
  }
});

export const verifyPayment = ff.region('asia-south1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new ff.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'verifyPayment');

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

    const lockSnap = await db.collection('paymentLocks').doc(razorpay_payment_id).get();
    if (lockSnap.exists) {
      const lock = lockSnap.data()!;
      const outcome = getLockOutcome(lock);
      if (outcome === 'refunded') {
        return {
          success: false,
          refunded: true,
          error: (lock.reason as string) || 'Payment was refunded because the order could not be fulfilled',
        };
      }
      const orderIds = (lock.orderIds as string[]) || [];
      if (orderIds.length > 0) {
        return { success: true, orderIds, orderId: orderIds[0] };
      }
    }

    const session = await loadCheckoutSession(razorpay_order_id, context.auth.uid);
    const validatedItems = session.items;
    const serverTotalPaise = session.serverTotalPaise;

    const razorpay = new Razorpay({ key_id, key_secret });

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.status !== 'captured') {
      throw new ff.https.HttpsError('failed-precondition', 'Payment has not been captured');
    }

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
    const razorpayAmount = typeof razorpayOrder.amount === 'number'
      ? razorpayOrder.amount
      : Number(razorpayOrder.amount);

    if (razorpayAmount !== serverTotalPaise) {
      throw new ff.https.HttpsError(
        'failed-precondition',
        'Payment amount does not match order total'
      );
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

    const orderIds = result.orderIds!;
    return { success: true, orderIds, orderId: orderIds[0] };
  } catch (error) {
    if (error instanceof ff.https.HttpsError) {
      if (error.code === 'already-exists') {
        const lockSnap = await db.collection('paymentLocks').doc(razorpay_payment_id).get();
        if (lockSnap.exists) {
          const lock = lockSnap.data()!;
          const outcome = getLockOutcome(lock);
          if (outcome === 'refunded') {
            return { success: false, refunded: true, error: (lock.reason as string) || 'Payment was refunded' };
          }
          const orderIds = (lock.orderIds as string[]) || [];
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

export const razorpayWebhook = ff.region('asia-south1').https.onRequest(async (req, res) => {
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

  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  if (!signature) {
    res.status(400).send('Missing signature');
    return;
  }

  const rawBody = (req as { rawBody?: Buffer }).rawBody;
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

    const razorpayPaymentId = paymentEntity.id as string;
    const razorpayOrderId = paymentEntity.order_id as string;
    const paymentStatus = paymentEntity.status as string;
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
    const razorpay = new Razorpay({ key_id, key_secret });

    const existingLock = await db.collection('paymentLocks').doc(razorpayPaymentId).get();
    if (existingLock.exists) {
      res.status(200).send('OK');
      return;
    }

    const sessionSnap = await db.collection('checkoutSessions').doc(razorpayOrderId).get();
    if (!sessionSnap.exists) {
      console.error('Webhook: checkout session not found', { razorpayOrderId });
      res.status(200).send('OK');
      return;
    }

    const session = sessionSnap.data()!;
    const buyerId = session.buyerId as string;

    await recordPaymentCapture(razorpayPaymentId, {
      razorpayOrderId,
      buyerId,
      amountPaise,
    });

    if (session.status === 'fulfilled') {
      res.status(200).send('OK');
      return;
    }

    const expiresAt = session.expiresAt?.toDate?.() as Date | undefined;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      console.error('Webhook: checkout session expired', { razorpayOrderId });
      await handleFulfillmentFailure({
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

    const validatedItems = session.items as ValidatedOrderItem[];
    const shippingAddress = session.shippingAddress as ShippingAddress | undefined;
    if (!shippingAddress?.name || !shippingAddress?.address || !shippingAddress?.pincode) {
      console.error('Webhook: missing shipping address in session', { razorpayOrderId });
      await handleFulfillmentFailure({
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
  } catch (error) {
    console.error('Webhook processing error', error);
    res.status(500).send('Internal error');
  }
});

export const reconcileOrphanPayments = ff.region('asia-south1').pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    const { key_id, key_secret } = getRazorpayKeys();
    if (!key_id || !key_secret) {
      console.error('Razorpay keys are not configured for reconciliation');
      return null;
    }

    const razorpay = new Razorpay({ key_id, key_secret });
    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - RECONCILE_MIN_AGE_MS)
    );

    const pendingCaptures = await db.collection('paymentCaptures')
      .where('status', '==', 'pending')
      .where('capturedAt', '<', cutoff)
      .limit(RECONCILE_BATCH_SIZE)
      .get();

    for (const captureDoc of pendingCaptures.docs) {
      const capture = captureDoc.data();
      const razorpayPaymentId = captureDoc.id;
      const razorpayOrderId = capture.razorpayOrderId as string;
      const buyerId = capture.buyerId as string;
      const amountPaise = capture.amountPaise as number;

      const lockSnap = await db.collection('paymentLocks').doc(razorpayPaymentId).get();
      const outcome = getLockOutcome(lockSnap.data());
      if (outcome === 'fulfilled') {
        await updatePaymentCaptureStatus(razorpayPaymentId, 'fulfilled');
        continue;
      }
      if (outcome === 'refunded') {
        await updatePaymentCaptureStatus(razorpayPaymentId, 'refunded');
        continue;
      }

      const session = await loadCheckoutSessionForReconcile(razorpayOrderId);
      if (!session) {
        await handleFulfillmentFailure({
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
        await handleFulfillmentFailure({
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
      } catch {
        await handleFulfillmentFailure({
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
