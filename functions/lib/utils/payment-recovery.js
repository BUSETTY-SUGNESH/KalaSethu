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
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPaymentCapture = recordPaymentCapture;
exports.updatePaymentCaptureStatus = updatePaymentCaptureStatus;
exports.issueFullRefund = issueFullRefund;
exports.handleFulfillmentFailure = handleFulfillmentFailure;
exports.isNonRetryableFulfillmentError = isNonRetryableFulfillmentError;
const admin = __importStar(require("firebase-admin"));
const config_1 = require("../config");
const notification_repository_1 = require("../repositories/notification.repository");
async function recordPaymentCapture(razorpayPaymentId, data) {
    await config_1.db.collection('paymentCaptures').doc(razorpayPaymentId).set({
        razorpayOrderId: data.razorpayOrderId,
        buyerId: data.buyerId,
        amountPaise: data.amountPaise,
        status: 'pending',
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function updatePaymentCaptureStatus(razorpayPaymentId, status) {
    await config_1.db.collection('paymentCaptures').doc(razorpayPaymentId).set({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}
async function issueFullRefund(razorpay, paymentId, amountPaise) {
    const refund = await razorpay.payments.refund(paymentId, { amount: amountPaise });
    return refund.id;
}
async function handleFulfillmentFailure(params) {
    const lockRef = config_1.db.collection('paymentLocks').doc(params.razorpayPaymentId);
    const existing = await lockRef.get();
    if (existing.exists) {
        const data = existing.data();
        if (data.status === 'refunded') {
            return { refunded: true, refundId: data.refundId, alreadyHandled: true };
        }
        const orderIds = data.orderIds || [];
        if (data.status === 'fulfilled' || orderIds.length > 0) {
            return { refunded: false, alreadyHandled: true };
        }
    }
    let refundId;
    try {
        refundId = await issueFullRefund(params.razorpay, params.razorpayPaymentId, params.amountPaise);
    }
    catch (error) {
        console.error('Razorpay refund failed', {
            paymentId: params.razorpayPaymentId,
            error,
        });
        throw error;
    }
    await config_1.db.runTransaction(async (transaction) => {
        const snap = await transaction.get(lockRef);
        if (snap.exists) {
            const data = snap.data();
            if (data.status === 'refunded')
                return;
            const orderIds = data.orderIds || [];
            if (data.status === 'fulfilled' || orderIds.length > 0)
                return;
        }
        transaction.set(lockRef, {
            status: 'refunded',
            orderIds: [],
            refundId,
            reason: params.reason,
            razorpayOrderId: params.razorpayOrderId,
            buyerId: params.buyerId,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const sessionRef = config_1.db.collection('checkoutSessions').doc(params.razorpayOrderId);
        transaction.set(sessionRef, {
            status: 'failed',
            failureReason: params.reason,
            refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    await updatePaymentCaptureStatus(params.razorpayPaymentId, 'refunded');
    if (params.buyerId) {
        try {
            await notification_repository_1.notificationRepository.createNotification(params.buyerId, {
                title: 'Payment Refunded',
                message: `Your payment could not be completed and has been refunded. ${params.reason}`,
                type: 'system',
                isRead: false,
                actionUrl: '/dashboard/orders',
            });
        }
        catch (notifyError) {
            console.error('Failed to notify buyer of refund', notifyError);
        }
    }
    return { refunded: true, refundId };
}
function isNonRetryableFulfillmentError(error) {
    if (error && typeof error === 'object' && 'code' in error) {
        const code = error.code;
        return ['failed-precondition', 'invalid-argument', 'not-found', 'permission-denied'].includes(code);
    }
    return false;
}
//# sourceMappingURL=payment-recovery.js.map