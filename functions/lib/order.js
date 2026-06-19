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
exports.onOrderCreated = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const config_1 = require("./config");
const notification_repository_1 = require("./repositories/notification.repository");
exports.onOrderCreated = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
    const orderData = snap.data();
    const orderId = context.params.orderId;
    try {
        // Create notification for the buyer
        await notification_repository_1.notificationRepository.createNotification(orderData.buyerId, {
            title: "Order Confirmed",
            message: `Your order #${orderId} has been confirmed.`,
            type: "order_update",
            isRead: false,
            actionUrl: `/dashboard/orders/${orderId}`
        });
        // Notify sellers (extract artistIds from items)
        const sellerIds = new Set(orderData.items.map((item) => item.artistId));
        const batch = config_1.db.batch();
        for (const sellerId of sellerIds) {
            await notification_repository_1.notificationRepository.batchCreateNotification(batch, sellerId, {
                title: "New Sale",
                message: `Congratulations! You have a new sale from order #${orderId}.`,
                type: "system",
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
//# sourceMappingURL=order.js.map