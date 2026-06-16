import * as functions from "firebase-functions/v1";
import Razorpay from "razorpay";
import * as crypto from "crypto";

import { orderRepository } from './repositories/order.repository';

// Phase E: Razorpay Integration
export const createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to create an order');
  }

  const { amount, currency = "INR" } = data;
  
  if (!amount || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid amount is required');
  }

  const key_id = process.env.RAZORPAY_KEY_ID || functions.config().razorpay?.key_id;
  const key_secret = process.env.RAZORPAY_KEY_SECRET || functions.config().razorpay?.key_secret;

  if (!key_id || !key_secret) {
    console.error("Razorpay keys are not configured");
    throw new functions.https.HttpsError('internal', 'Payment gateway configuration error');
  }

  try {
    const razorpay = new Razorpay({ key_id, key_secret });
    
    // Amount must be in paise (e.g. ₹500 = 50000 paise)
    const options = {
      amount: amount * 100, 
      currency,
      receipt: `rcpt_${context.auth.uid.substring(0, 5)}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency
    };
  } catch (error) {
    console.error("Payment creation error", error);
    throw new functions.https.HttpsError('internal', 'Failed to create payment order');
  }
});

export const verifyPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = data;

  const key_secret = process.env.RAZORPAY_KEY_SECRET || functions.config().razorpay?.key_secret;

  if (!key_secret) {
    console.error("Razorpay keys are not configured");
    throw new functions.https.HttpsError('internal', 'Payment gateway configuration error');
  }

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Payment is verified successfully
      // Save the order to Firestore
      
      const orderId = await orderRepository.createOrder({
        buyerId: context.auth.uid,
        ...orderDetails,
        paymentId: razorpay_payment_id,
        paymentOrderId: razorpay_order_id,
        status: "processing", // Initial status
      });
      
      return { success: true, orderId };
    } else {
      console.warn("Invalid payment signature detected", { expectedSignature, received: razorpay_signature });
      return { success: false, error: "Invalid payment signature" };
    }
  } catch (error) {
    console.error("Payment verification error", error);
    throw new functions.https.HttpsError('internal', 'Failed to verify payment');
  }
});
