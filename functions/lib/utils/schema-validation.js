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
exports.validateBidPayload = validateBidPayload;
exports.validateBidDocument = validateBidDocument;
exports.validateOrderDocument = validateOrderDocument;
exports.validateChatMessagePayload = validateChatMessagePayload;
exports.validateFollowPayload = validateFollowPayload;
exports.validatePaymentAmount = validatePaymentAmount;
const functions = __importStar(require("firebase-functions/v1"));
function assert(condition, message) {
    if (!condition) {
        throw new functions.https.HttpsError('invalid-argument', message);
    }
}
const BID_STATUSES = ['active', 'outbid', 'won', 'cancelled'];
const MESSAGE_TYPES = ['text', 'image', 'artwork', 'system'];
const ORDER_STATUSES = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'completed',
    'cancelled',
    'refund_requested',
    'refunded',
];
function validateBidPayload(data) {
    assert(typeof data.auctionId === 'string' && data.auctionId.length > 0, 'Invalid auctionId');
    assert(typeof data.bidderId === 'string' && data.bidderId.length > 0, 'Invalid bidderId');
    assert(typeof data.amount === 'number' && data.amount > 0, 'Bid amount must be positive');
}
function validateBidDocument(bid) {
    assert(typeof bid.auctionId === 'string', 'Invalid bid auctionId');
    assert(typeof bid.bidderId === 'string', 'Invalid bid bidderId');
    assert(typeof bid.amount === 'number' && bid.amount > 0, 'Invalid bid amount');
    assert(bid.currency === 'INR', 'Invalid bid currency');
    assert(typeof bid.status === 'string' && BID_STATUSES.includes(bid.status), 'Invalid bid status');
}
function validateOrderDocument(order) {
    assert(typeof order.buyerId === 'string', 'Invalid order buyerId');
    assert(typeof order.sellerId === 'string', 'Invalid order sellerId');
    assert(Array.isArray(order.items) && order.items.length > 0, 'Order must have items');
    assert(typeof order.totalAmount === 'number' && order.totalAmount >= 0, 'Invalid totalAmount');
    assert(order.currency === 'INR', 'Invalid order currency');
    assert(order.paymentStatus === 'completed', 'Invalid paymentStatus');
    assert(typeof order.status === 'string' && ORDER_STATUSES.includes(order.status), 'Invalid order status');
}
function validateChatMessagePayload(data) {
    assert(typeof data.chatRoomId === 'string' && data.chatRoomId.length > 0, 'Invalid chatRoomId');
    assert(typeof data.senderId === 'string' && data.senderId.length > 0, 'Invalid senderId');
    assert(typeof data.senderName === 'string' && data.senderName.length > 0, 'Invalid senderName');
    assert(typeof data.type === 'string' && MESSAGE_TYPES.includes(data.type), 'Invalid message type');
    assert(typeof data.content === 'string' && data.content.length >= 1 && data.content.length <= 5000, 'Invalid content length');
    if (data.mediaUrl !== undefined) {
        assert(typeof data.mediaUrl === 'string', 'Invalid mediaUrl');
    }
    if (data.artworkId !== undefined) {
        assert(typeof data.artworkId === 'string', 'Invalid artworkId');
    }
}
function validateFollowPayload(data) {
    assert(typeof data.followingId === 'string' && data.followingId.length > 0, 'Invalid followingId');
    assert(typeof data.followingName === 'string' && data.followingName.length > 0, 'Invalid followingName');
}
function validatePaymentAmount(amount) {
    assert(typeof amount === 'number' && amount > 0, 'Valid amount is required');
}
//# sourceMappingURL=schema-validation.js.map