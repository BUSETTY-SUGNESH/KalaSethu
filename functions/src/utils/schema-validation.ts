import * as functions from 'firebase-functions/v1';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new functions.https.HttpsError('invalid-argument', message);
  }
}

const BID_STATUSES = ['active', 'outbid', 'won', 'cancelled'] as const;
const MESSAGE_TYPES = ['text', 'image', 'artwork', 'system'] as const;
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
] as const;

export function validateBidPayload(data: {
  auctionId: string;
  amount: number;
  bidderId: string;
  bidderName?: string;
}): void {
  assert(typeof data.auctionId === 'string' && data.auctionId.length > 0, 'Invalid auctionId');
  assert(typeof data.bidderId === 'string' && data.bidderId.length > 0, 'Invalid bidderId');
  assert(typeof data.amount === 'number' && data.amount > 0, 'Bid amount must be positive');
}

export function validateBidDocument(bid: Record<string, unknown>): void {
  assert(typeof bid.auctionId === 'string', 'Invalid bid auctionId');
  assert(typeof bid.bidderId === 'string', 'Invalid bid bidderId');
  assert(typeof bid.amount === 'number' && bid.amount > 0, 'Invalid bid amount');
  assert(bid.currency === 'INR', 'Invalid bid currency');
  assert(
    typeof bid.status === 'string' && BID_STATUSES.includes(bid.status as typeof BID_STATUSES[number]),
    'Invalid bid status'
  );
}

export function validateOrderDocument(order: Record<string, unknown>): void {
  assert(typeof order.buyerId === 'string', 'Invalid order buyerId');
  assert(typeof order.sellerId === 'string', 'Invalid order sellerId');
  assert(Array.isArray(order.items) && order.items.length > 0, 'Order must have items');
  assert(typeof order.totalAmount === 'number' && order.totalAmount >= 0, 'Invalid totalAmount');
  assert(order.currency === 'INR', 'Invalid order currency');
  assert(order.paymentStatus === 'completed', 'Invalid paymentStatus');
  assert(
    typeof order.status === 'string' && ORDER_STATUSES.includes(order.status as typeof ORDER_STATUSES[number]),
    'Invalid order status'
  );
}

export function validateChatMessagePayload(data: {
  chatRoomId: string;
  senderId: string;
  senderName: string;
  type: string;
  content: string;
  mediaUrl?: string;
  artworkId?: string;
}): void {
  assert(typeof data.chatRoomId === 'string' && data.chatRoomId.length > 0, 'Invalid chatRoomId');
  assert(typeof data.senderId === 'string' && data.senderId.length > 0, 'Invalid senderId');
  assert(typeof data.senderName === 'string' && data.senderName.length > 0, 'Invalid senderName');
  assert(
    typeof data.type === 'string' && MESSAGE_TYPES.includes(data.type as typeof MESSAGE_TYPES[number]),
    'Invalid message type'
  );
  assert(typeof data.content === 'string' && data.content.length >= 1 && data.content.length <= 5000, 'Invalid content length');
  if (data.mediaUrl !== undefined) {
    assert(typeof data.mediaUrl === 'string', 'Invalid mediaUrl');
  }
  if (data.artworkId !== undefined) {
    assert(typeof data.artworkId === 'string', 'Invalid artworkId');
  }
}

export function validateFollowPayload(data: {
  followingId: string;
  followingName: string;
}): void {
  assert(typeof data.followingId === 'string' && data.followingId.length > 0, 'Invalid followingId');
  assert(typeof data.followingName === 'string' && data.followingName.length > 0, 'Invalid followingName');
}

export function validatePaymentAmount(amount: unknown): void {
  assert(typeof amount === 'number' && amount > 0, 'Valid amount is required');
}
