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
exports.RATE_LIMITS = void 0;
exports.assertRateLimit = assertRateLimit;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("../config");
exports.RATE_LIMITS = {
    placeBid: { max: 20, windowMs: 60_000 },
    paymentCreateOrder: { max: 10, windowMs: 60_000 },
    verifyPayment: { max: 5, windowMs: 60_000 },
    submitArtworkForReview: { max: 5, windowMs: 3_600_000 },
    moderateArtwork: { max: 30, windowMs: 60_000 },
    verifyArtist: { max: 20, windowMs: 60_000 },
    followUser: { max: 30, windowMs: 60_000 },
    unfollowUser: { max: 30, windowMs: 60_000 },
    sendChatMessage: { max: 60, windowMs: 60_000 },
    sendChannelMessage: { max: 60, windowMs: 60_000 },
    editMessage: { max: 30, windowMs: 60_000 },
    deleteMessage: { max: 30, windowMs: 60_000 },
    toggleReaction: { max: 120, windowMs: 60_000 },
    searchMessages: { max: 30, windowMs: 60_000 },
    createChannel: { max: 10, windowMs: 60_000 },
};
async function assertRateLimit(uid, action) {
    const { max, windowMs } = exports.RATE_LIMITS[action];
    const ref = config_1.db.collection('_rateLimits').doc(`${uid}_${action}`);
    const now = Date.now();
    await config_1.db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists) {
            transaction.set(ref, { count: 1, windowStart: now });
            return;
        }
        const data = snap.data();
        if (now - data.windowStart > windowMs) {
            transaction.set(ref, { count: 1, windowStart: now });
            return;
        }
        if (data.count >= max) {
            throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded. Please try again later.');
        }
        transaction.update(ref, {
            count: admin.firestore.FieldValue.increment(1),
        });
    });
}
//# sourceMappingURL=rate-limit.js.map