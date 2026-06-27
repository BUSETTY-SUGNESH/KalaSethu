"use strict";
// ============================================================
// KalaSetu — Auction Notification Helpers (Cloud Functions)
// ============================================================
// Provides factory functions for every auction notification
// event. All Firestore writes go through WriteBatch for
// efficiency. FCM and email are no-op stubs ready to be wired
// when those services are configured.
// ============================================================
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
exports.batchNotification = batchNotification;
exports.notifyOutbid = notifyOutbid;
exports.batchNotifyAuctionWon = batchNotifyAuctionWon;
exports.batchNotifyAuctionLost = batchNotifyAuctionLost;
exports.batchNotifyArtistAuctionClosed = batchNotifyArtistAuctionClosed;
exports.batchNotifyAuctionEndingSoon = batchNotifyAuctionEndingSoon;
exports.sendFcmNotification = sendFcmNotification;
exports.sendEmailNotification = sendEmailNotification;
exports.getUniqueBidderIds = getUniqueBidderIds;
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
// ── Feature flags ────────────────────────────────────────────
// Flip these to true once FCM token storage / email provider
// are wired up.
const FCM_ENABLED = false;
const EMAIL_ENABLED = false;
// ── Core batch helper ────────────────────────────────────────
/**
 * Adds a single notification document to an existing batch.
 * Uses serverTimestamp so ordering is consistent with all
 * other notifications in the system.
 */
function batchNotification(batch, payload) {
    const ref = config_1.db
        .collection('users')
        .doc(payload.userId)
        .collection('notifications')
        .doc(); // auto-id
    batch.set(ref, {
        ...payload,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
// ── Currency formatter (matches client-side format) ──────────
function formatINR(amount) {
    return `₹${amount.toLocaleString('en-IN')}`;
}
// ── Outbid ───────────────────────────────────────────────────
/**
 * Notify the previous highest bidder that they have been
 * outbid. Called from placeBid after the transaction commits.
 * Single document write — no batch needed.
 */
async function notifyOutbid(previousBidderId, auction, newAmount) {
    try {
        const title = auction.artworkTitle
            ? `You've been outbid on "${auction.artworkTitle}"`
            : 'You have been outbid';
        const message = `A higher bid of ${formatINR(newAmount)} has been placed. Bid now to stay in the lead.`;
        const payload = {
            userId: previousBidderId,
            type: 'bid_outbid',
            title,
            message,
            imageUrl: auction.artworkImageUrl,
            actionUrl: `/bids/${auction.id}`,
            relatedId: auction.id,
            relatedType: 'auction',
            isRead: false,
        };
        const ref = config_1.db
            .collection('users')
            .doc(previousBidderId)
            .collection('notifications')
            .doc();
        await ref.set({
            ...payload,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // FCM stub — dispatches push when enabled
        await sendFcmNotification(previousBidderId, title, message, {
            auctionId: auction.id,
            type: 'bid_outbid',
        });
    }
    catch (error) {
        // Notification failures must never break bid placement
        console.error(`[notifyOutbid] Failed for user ${previousBidderId}:`, error);
    }
}
// ── Auction Won ───────────────────────────────────────────────
/**
 * Batch-write a win notification for the auction winner.
 */
function batchNotifyAuctionWon(batch, winnerId, auction, winningAmount) {
    const artworkName = auction.artworkTitle ?? 'the artwork';
    batchNotification(batch, {
        userId: winnerId,
        type: 'auction_won',
        title: `Congratulations! You won "${artworkName}"`,
        message: `Your winning bid of ${formatINR(winningAmount)} was the highest. Check your dashboard to complete the purchase.`,
        imageUrl: auction.artworkImageUrl,
        actionUrl: `/bids/${auction.id}`,
        relatedId: auction.id,
        relatedType: 'auction',
        isRead: false,
    });
}
// ── Auction Lost ──────────────────────────────────────────────
/**
 * Batch-write a loss notification for a bidder who did not win.
 */
function batchNotifyAuctionLost(batch, loserId, auction) {
    const artworkName = auction.artworkTitle ?? 'the artwork';
    batchNotification(batch, {
        userId: loserId,
        type: 'auction_lost',
        title: `Auction ended: "${artworkName}"`,
        message: `Another bidder won this auction. Browse other available artworks on KalaMarket.`,
        imageUrl: auction.artworkImageUrl,
        actionUrl: `/marketplace`,
        relatedId: auction.id,
        relatedType: 'auction',
        isRead: false,
    });
}
// ── Artist Auction Closed ─────────────────────────────────────
/**
 * Batch-write a closure notification for the artist who listed
 * the auction.
 */
function batchNotifyArtistAuctionClosed(batch, artistId, auction, winnerId, winnerName, winningAmount) {
    const artworkName = auction.artworkTitle ?? 'your artwork';
    const hasBids = !!winnerId;
    const title = hasBids
        ? `Your auction for "${artworkName}" has closed successfully`
        : `Your auction for "${artworkName}" ended with no bids`;
    const message = hasBids
        ? `Winning bid: ${formatINR(winningAmount)} by ${winnerName ?? 'a buyer'}. Visit your dashboard for next steps.`
        : `No bids were placed. You may relist the artwork at any time from your dashboard.`;
    batchNotification(batch, {
        userId: artistId,
        type: 'auction_closed_artist',
        title,
        message,
        imageUrl: auction.artworkImageUrl,
        actionUrl: `/dashboard`,
        relatedId: auction.id,
        relatedType: 'auction',
        isRead: false,
    });
}
// ── Ending Soon ───────────────────────────────────────────────
/**
 * Batch-write ending-soon reminders for a set of bidder IDs.
 * interval is a human-readable label like '15 minutes',
 * '1 hour', or '24 hours'.
 */
function batchNotifyAuctionEndingSoon(batch, bidderIds, auction, intervalLabel) {
    const artworkName = auction.artworkTitle ?? 'an artwork';
    const title = `Auction ending in ${intervalLabel}: "${artworkName}"`;
    const message = `Current bid: ${formatINR(auction.currentBid)}. Place your bid now before the auction closes.`;
    for (const bidderId of bidderIds) {
        batchNotification(batch, {
            userId: bidderId,
            type: 'auction_ending',
            title,
            message,
            imageUrl: auction.artworkImageUrl,
            actionUrl: `/bids/${auction.id}`,
            relatedId: auction.id,
            relatedType: 'auction',
            isRead: false,
        });
    }
}
// ── FCM Stub ─────────────────────────────────────────────────
/**
 * Sends a push notification via Firebase Cloud Messaging.
 * Currently a no-op. To enable:
 * 1. Store FCM tokens on user documents as users.{uid}.fcmTokens[]
 * 2. Set FCM_ENABLED = true above
 * 3. Uncomment the messaging().send() call below
 */
async function sendFcmNotification(userId, title, body, data) {
    if (!FCM_ENABLED)
        return;
    try {
        const userDoc = await config_1.db.collection('users').doc(userId).get();
        const fcmTokens = userDoc.data()?.fcmTokens ?? [];
        if (fcmTokens.length === 0)
            return;
        const sendPromises = fcmTokens.map((token) => admin.messaging().send({
            token,
            notification: { title, body },
            data: data ?? {},
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } },
        }));
        await Promise.allSettled(sendPromises);
    }
    catch (error) {
        console.error(`[sendFcmNotification] Failed for user ${userId}:`, error);
    }
}
// ── Email Stub ───────────────────────────────────────────────
/**
 * Sends a transactional email notification.
 * Currently a no-op. To enable:
 * 1. Add RESEND_API_KEY (or equivalent) to functions/.env
 * 2. Set EMAIL_ENABLED = true above
 * 3. Implement the provider call below
 */
async function sendEmailNotification(_to, _templateId, _data) {
    if (!EMAIL_ENABLED)
        return;
    try {
        // Example Resend integration (uncomment when configured):
        // const resend = new Resend(process.env.RESEND_API_KEY);
        // await resend.emails.send({ from: 'KalaSetu <noreply@kalasetu.in>', to: _to, ... });
        console.log(`[sendEmailNotification] Would send "${_templateId}" to ${_to}`);
    }
    catch (error) {
        console.error(`[sendEmailNotification] Failed for ${_to}:`, error);
    }
}
// ── Unique bidder lookup ──────────────────────────────────────
/**
 * Returns all unique bidder IDs for a given auction by reading
 * its bids subcollection. Used by closeEndedAuctions and
 * auctionEndingSoon to find participants.
 */
async function getUniqueBidderIds(auctionId) {
    const snap = await config_1.db
        .collection('auctions')
        .doc(auctionId)
        .collection('bids')
        .select('bidderId') // Only fetch the bidderId field — minimise payload
        .get();
    const seen = new Set();
    snap.docs.forEach((d) => {
        const bidderId = d.data().bidderId;
        if (bidderId)
            seen.add(bidderId);
    });
    return Array.from(seen);
}
//# sourceMappingURL=notification-helpers.js.map