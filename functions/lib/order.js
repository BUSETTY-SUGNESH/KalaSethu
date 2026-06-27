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
exports.onOrderUpdated = exports.onOrderCreated = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const config_1 = require("./config");
const notification_repository_1 = require("./repositories/notification.repository");
exports.onOrderCreated = functions.region('asia-south1').firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
    const orderData = snap.data();
    const orderId = context.params.orderId;
    try {
        await notification_repository_1.notificationRepository.createNotification(orderData.buyerId, {
            title: "Order Confirmed",
            message: `Your order #${orderId} has been confirmed.`,
            type: "order_placed",
            isRead: false,
            actionUrl: `/dashboard/orders/${orderId}`
        });
        const sellerIds = new Set(orderData.items.map((item) => item.artistId));
        const batch = config_1.db.batch();
        for (const sellerId of sellerIds) {
            await notification_repository_1.notificationRepository.batchCreateNotification(batch, sellerId, {
                title: "New Sale",
                message: `Congratulations! You have a new sale from order #${orderId}.`,
                type: "payment_received",
                isRead: false,
                actionUrl: `/dashboard/artist/orders`
            });
        }
        await batch.commit();
        console.log(`Successfully processed new order ${orderId}`);
    }
    catch (error) {
        console.error(`Failed to process new order ${orderId}`, error);
    }
});
exports.onOrderUpdated = functions.region('us-central1').firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;
    if (before.status === after.status)
        return;
    try {
        if (after.status === 'shipped') {
            const trackingNote = after.trackingNumber
                ? ` Tracking: ${after.trackingNumber}.`
                : '';
            await notification_repository_1.notificationRepository.createNotification(after.buyerId, {
                title: 'Order Shipped',
                message: `Your order #${orderId} has been shipped.${trackingNote}`,
                type: 'order_shipped',
                isRead: false,
                actionUrl: `/dashboard/orders/${orderId}`,
            });
        }
        else if (after.status === 'delivered') {
            await notification_repository_1.notificationRepository.createNotification(after.buyerId, {
                title: 'Order Delivered',
                message: `Your order #${orderId} has been delivered.`,
                type: 'order_delivered',
                isRead: false,
                actionUrl: `/dashboard/orders/${orderId}`,
            });
        }
    }
    catch (error) {
        console.error(`Failed to process order update ${orderId}`, error);
    }
});
//# sourceMappingURL=order.js.map