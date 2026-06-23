// ============================================================
// KalaSetu — Auction Notification Helpers (Cloud Functions)
// ============================================================
// Provides factory functions for every auction notification
// event. All Firestore writes go through WriteBatch for
// efficiency. FCM and email are no-op stubs ready to be wired
// when those services are configured.
// ============================================================

import * as admin from 'firebase-admin';
import { db } from './config';
import type { Auction } from './types';

// ── Feature flags ────────────────────────────────────────────
// Flip these to true once FCM token storage / email provider
// are wired up.
const FCM_ENABLED = false;
const EMAIL_ENABLED = false;

// ── Notification types (mirrors app/types/index.ts) ─────────
type AuctionNotifType =
  | 'bid_outbid'
  | 'auction_won'
  | 'auction_lost'
  | 'auction_ending'
  | 'auction_closed_artist';

// ── Internal shape written to Firestore ─────────────────────
interface NotificationPayload {
  userId: string;
  type: AuctionNotifType;
  title: string;
  message: string;
  imageUrl?: string;
  actionUrl: string;
  relatedId: string;       // auctionId
  relatedType: 'auction';
  isRead: false;
}

// ── Core batch helper ────────────────────────────────────────
/**
 * Adds a single notification document to an existing batch.
 * Uses serverTimestamp so ordering is consistent with all
 * other notifications in the system.
 */
export function batchNotification(
  batch: admin.firestore.WriteBatch,
  payload: NotificationPayload
): void {
  const ref = db
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
function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ── Outbid ───────────────────────────────────────────────────
/**
 * Notify the previous highest bidder that they have been
 * outbid. Called from placeBid after the transaction commits.
 * Single document write — no batch needed.
 */
export async function notifyOutbid(
  previousBidderId: string,
  auction: Auction,
  newAmount: number
): Promise<void> {
  try {
    const title = auction.artworkTitle
      ? `You've been outbid on "${auction.artworkTitle}"`
      : 'You have been outbid';

    const message = `A higher bid of ${formatINR(newAmount)} has been placed. Bid now to stay in the lead.`;

    const payload: NotificationPayload = {
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

    const ref = db
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
  } catch (error) {
    // Notification failures must never break bid placement
    console.error(`[notifyOutbid] Failed for user ${previousBidderId}:`, error);
  }
}

// ── Auction Won ───────────────────────────────────────────────
/**
 * Batch-write a win notification for the auction winner.
 */
export function batchNotifyAuctionWon(
  batch: admin.firestore.WriteBatch,
  winnerId: string,
  auction: Auction,
  winningAmount: number
): void {
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
export function batchNotifyAuctionLost(
  batch: admin.firestore.WriteBatch,
  loserId: string,
  auction: Auction
): void {
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
export function batchNotifyArtistAuctionClosed(
  batch: admin.firestore.WriteBatch,
  artistId: string,
  auction: Auction,
  winnerId: string | null,
  winnerName: string | null,
  winningAmount: number
): void {
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
export function batchNotifyAuctionEndingSoon(
  batch: admin.firestore.WriteBatch,
  bidderIds: string[],
  auction: Auction,
  intervalLabel: string
): void {
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
export async function sendFcmNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (!FCM_ENABLED) return;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const fcmTokens: string[] = userDoc.data()?.fcmTokens ?? [];

    if (fcmTokens.length === 0) return;

    const sendPromises = fcmTokens.map((token) =>
      admin.messaging().send({
        token,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      })
    );

    await Promise.allSettled(sendPromises);
  } catch (error) {
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
export async function sendEmailNotification(
  _to: string,
  _templateId: string,
  _data?: Record<string, unknown>
): Promise<void> {
  if (!EMAIL_ENABLED) return;

  try {
    // Example Resend integration (uncomment when configured):
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ from: 'KalaSetu <noreply@kalasetu.in>', to: _to, ... });
    console.log(`[sendEmailNotification] Would send "${_templateId}" to ${_to}`);
  } catch (error) {
    console.error(`[sendEmailNotification] Failed for ${_to}:`, error);
  }
}

// ── Unique bidder lookup ──────────────────────────────────────
/**
 * Returns all unique bidder IDs for a given auction by reading
 * its bids subcollection. Used by closeEndedAuctions and
 * auctionEndingSoon to find participants.
 */
export async function getUniqueBidderIds(auctionId: string): Promise<string[]> {
  const snap = await db
    .collection('auctions')
    .doc(auctionId)
    .collection('bids')
    .select('bidderId') // Only fetch the bidderId field — minimise payload
    .get();

  const seen = new Set<string>();
  snap.docs.forEach((d) => {
    const bidderId = d.data().bidderId as string | undefined;
    if (bidderId) seen.add(bidderId);
  });

  return Array.from(seen);
}
