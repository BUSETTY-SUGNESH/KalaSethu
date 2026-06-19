import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import Razorpay from "razorpay";
import * as crypto from "crypto";

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
      
      const userRecord = await admin.auth().getUser(context.auth.uid);
      const buyerName = userRecord.displayName || "Anonymous";
      const buyerEmail = userRecord.email || "";

      const items = orderDetails.items || [];
      
      // Group items by seller (artistId)
      const sellerGroups: { [key: string]: any[] } = {};
      items.forEach((item: any) => {
        const artistId = item.artistId || "unknown_artist";
        if (!sellerGroups[artistId]) {
          sellerGroups[artistId] = [];
        }
        sellerGroups[artistId].push(item);
      });

      const orderIds: string[] = [];
      const batch = admin.firestore().batch();
      const db = admin.firestore();
      
      // We will create one order per seller
      for (const [sellerId, sellerItems] of Object.entries(sellerGroups)) {
        const subtotal = sellerItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        const shippingCost = 0;
        const tax = 0;
        const totalAmount = subtotal + shippingCost + tax;
        
        const newOrderRef = db.collection('orders').doc();
        const orderData = {
          id: newOrderRef.id,
          buyerId: context.auth.uid,
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
          shippingAddress: orderDetails.shippingAddress,
          paymentId: razorpay_payment_id,
          paymentOrderId: razorpay_order_id,
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
        
        batch.set(newOrderRef, orderData);
        orderIds.push(newOrderRef.id);

        // Update the status of each artwork to 'sold'
        for (const item of sellerItems) {
          if (item.artworkId) {
            const artworkRef = db.collection('artworks').doc(item.artworkId);
            batch.update(artworkRef, {
              status: 'sold',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }

      await batch.commit();
      
      return { success: true, orderId: orderIds[0] };
    } else {
      console.warn("Invalid payment signature detected", { expectedSignature, received: razorpay_signature });
      return { success: false, error: "Invalid payment signature" };
    }
  } catch (error) {
    console.error("Payment verification error", error);
    throw new functions.https.HttpsError('internal', 'Failed to verify payment');
  }
});

