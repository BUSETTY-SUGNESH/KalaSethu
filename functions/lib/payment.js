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
exports.verifyPayment = exports.createOrder = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto = __importStar(require("crypto"));
const order_repository_1 = require("./repositories/order.repository");
// Phase E: Razorpay Integration
exports.createOrder = functions.https.onCall(async (data, context) => {
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
        const razorpay = new razorpay_1.default({ key_id, key_secret });
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
    }
    catch (error) {
        console.error("Payment creation error", error);
        throw new functions.https.HttpsError('internal', 'Failed to create payment order');
    }
});
exports.verifyPayment = functions.https.onCall(async (data, context) => {
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
            const orderId = await order_repository_1.orderRepository.createOrder({
                buyerId: context.auth.uid,
                ...orderDetails,
                paymentId: razorpay_payment_id,
                paymentOrderId: razorpay_order_id,
                status: "processing", // Initial status
            });
            return { success: true, orderId };
        }
        else {
            console.warn("Invalid payment signature detected", { expectedSignature, received: razorpay_signature });
            return { success: false, error: "Invalid payment signature" };
        }
    }
    catch (error) {
        console.error("Payment verification error", error);
        throw new functions.https.HttpsError('internal', 'Failed to verify payment');
    }
});
//# sourceMappingURL=payment.js.map