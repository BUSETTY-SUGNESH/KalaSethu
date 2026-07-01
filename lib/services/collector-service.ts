// ============================================================
// KalaSetu — Collector Service
// Shared data helpers for customer/collector dashboard pages.
// ============================================================
import { isValidQueryString, filterValidIds } from '@/lib/firebase/query-guards';
import type { Auction, Order, OrderStatus, Post } from '@/app/types';
import { getBuyerOrders } from '@/lib/services/order-service';
import {
  EMPTY_BID_ANALYTICS,
  getAuctionsByIds,
  getUserBidAnalytics,
  getUserBids,
  normalizeBidAnalytics,
  type BidAnalytics,
} from '@/lib/services/auction-service';
import { getFeedPosts, getFollowing } from '@/lib/services/community-service';
import { ARTWORK_PLACEHOLDER } from '@/lib/utils/order-display';

const COLLECTION_ORDER_STATUSES: OrderStatus[] = ['delivered', 'completed'];
const FETCH_PAGE_SIZE = 50;
const ENDING_SOON_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export type CollectorItem = {
  artworkId: string;
  title: string;
  artistName: string;
  imageUrl: string;
  price: number;
  acquiredAt: string;
  source: 'order' | 'auction';
};

export type CollectorStats = {
  totalCollection: number;
  newThisMonth: number;
  activeBids: number;
  endingSoonCount: number;
  estimatedValue: number;
};

export type CollectorActivityItem = {
  id: string;
  type: 'bid' | 'order';
  icon: 'gavel' | 'local_shipping';
  message: string;
  timestamp: string;
};

export type FollowedArtistUpdate = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string;
};

export type RecentPurchase = {
  orderId: string;
  artworkId: string;
  title: string;
  imageUrl: string;
  price: number;
  status: OrderStatus;
  purchasedAt: string;
};

export type AuctionReminder = {
  auctionId: string;
  artworkId: string;
  title: string;
  imageUrl: string;
  endsAt: string;
  currentBid: number;
  userMaxBid: number;
};

export function formatCompactINR(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '₹0';
  if (value >= 100000) {
    const lakhs = value / 100000;
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
  }
  if (value >= 1000) {
    const thousands = value / 1000;
    return `₹${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
}

function itemsFromOrders(orders: Order[]): CollectorItem[] {
  const items: CollectorItem[] = [];

  for (const order of orders) {
    if (!COLLECTION_ORDER_STATUSES.includes(order.status)) continue;

    const acquiredAt = order.updatedAt || order.createdAt;
    for (const item of order.items) {
      items.push({
        artworkId: item.artworkId,
        title: item.artworkTitle,
        artistName: item.artistName,
        imageUrl: item.artworkImageUrl || ARTWORK_PLACEHOLDER,
        price: item.price,
        acquiredAt,
        source: 'order',
      });
    }
  }

  return items;
}

function itemsFromAuctionWins(auctions: Auction[], userId: string): CollectorItem[] {
  return auctions
    .filter(
      (auction) =>
        auction.winnerId === userId &&
        ['ended', 'completed'].includes(auction.status)
    )
    .map((auction) => ({
      artworkId: auction.artworkId,
      title: auction.artworkTitle,
      artistName: auction.artistName,
      imageUrl: auction.artworkImageUrl || ARTWORK_PLACEHOLDER,
      price: auction.winningBid ?? auction.currentBid,
      acquiredAt: auction.updatedAt || auction.endsAt,
      source: 'auction' as const,
    }));
}

function dedupeCollectorItems(items: CollectorItem[]): CollectorItem[] {
  const byArtwork = new Map<string, CollectorItem>();

  for (const item of items) {
    const existing = byArtwork.get(item.artworkId);
    if (!existing || new Date(item.acquiredAt).getTime() > new Date(existing.acquiredAt).getTime()) {
      byArtwork.set(item.artworkId, item);
    }
  }

  return Array.from(byArtwork.values()).sort(
    (a, b) => new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime()
  );
}

export async function getCollectorItems(userId: string): Promise<CollectorItem[]> {
  if (!isValidQueryString(userId)) return [];
  const [ordersResult, bidsResult] = await Promise.all([
    getBuyerOrders(userId, FETCH_PAGE_SIZE),
    getUserBids(userId, FETCH_PAGE_SIZE),
  ]);

  const auctionIds = filterValidIds(bidsResult.data.map((bid) => bid.auctionId));
  const auctions = auctionIds.length > 0 ? await getAuctionsByIds(auctionIds) : [];

  const orderItems = itemsFromOrders(ordersResult.data);
  const auctionItems = itemsFromAuctionWins(auctions, userId);

  return dedupeCollectorItems([...orderItems, ...auctionItems]);
}

export function getCollectorStats(
  items: CollectorItem[],
  analytics: BidAnalytics,
  userBidsAuctions: Auction[] = []
): CollectorStats {
  const now = Date.now();
  const monthAgo = now - MONTH_MS;

  const newThisMonth = items.filter(
    (item) => new Date(item.acquiredAt).getTime() >= monthAgo
  ).length;

  const liveStatuses = new Set(['live', 'ending_soon']);
  const endingSoonCount = userBidsAuctions.filter((auction) => {
    if (!liveStatuses.has(auction.status)) return false;
    const endsAt = new Date(auction.endsAt).getTime();
    return endsAt > now && endsAt - now <= ENDING_SOON_MS;
  }).length;

  return {
    totalCollection: items.length,
    newThisMonth,
    activeBids: analytics.activeBids,
    endingSoonCount,
    estimatedValue: items.reduce((sum, item) => sum + item.price, 0),
  };
}

function orderActivityMessage(order: Order): string {
  const primaryItem = order.items[0];
  const itemName = primaryItem?.artworkTitle ?? 'your order';

  switch (order.status) {
    case 'shipped':
      return `Your recent purchase ${itemName} has shipped.`;
    case 'delivered':
    case 'completed':
      return `Your purchase ${itemName} was delivered.`;
    case 'processing':
    case 'confirmed':
      return `Your order for ${itemName} is being processed.`;
    default:
      return `Order update for ${itemName}.`;
  }
}

export async function getRecentActivity(userId: string, limit = 5): Promise<CollectorActivityItem[]> {
  if (!isValidQueryString(userId)) return [];
  const [bidsResult, ordersResult] = await Promise.all([
    getUserBids(userId, 5),
    getBuyerOrders(userId, 5),
  ]);

  const auctionIds = filterValidIds(bidsResult.data.map((bid) => bid.auctionId));
  const auctions = auctionIds.length > 0 ? await getAuctionsByIds(auctionIds) : [];
  const auctionById = new Map(auctions.map((auction) => [auction.id, auction]));

  const bidActivities: CollectorActivityItem[] = bidsResult.data.map((bid) => {
    const auction = auctionById.get(bid.auctionId);
    const title = auction?.artworkTitle ?? 'an artwork';
    return {
      id: `bid-${bid.id}`,
      type: 'bid',
      icon: 'gavel',
      message: `You placed a bid of ₹${bid.amount.toLocaleString('en-IN')} on ${title}.`,
      timestamp: bid.timestamp,
    };
  });

  const orderActivities: CollectorActivityItem[] = ordersResult.data.map((order) => {
    const latestEntry = order.statusHistory[order.statusHistory.length - 1];
    return {
      id: `order-${order.id}`,
      type: 'order',
      icon: 'local_shipping',
      message: orderActivityMessage(order),
      timestamp: latestEntry?.timestamp ?? order.updatedAt ?? order.createdAt,
    };
  });

  return [...bidActivities, ...orderActivities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export async function getFollowedArtistUpdates(
  userId: string,
  limit = 3
): Promise<FollowedArtistUpdate[]> {
  if (!isValidQueryString(userId)) return [];
  const following = await getFollowing(userId, 50);
  if (following.length === 0) return [];

  const followingIds = new Set(
    following.map((entry) => entry.followingId).filter(isValidQueryString)
  );
  const feed = await getFeedPosts(20);

  return feed.data
    .filter((post: Post) => followingIds.has(post.authorId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((post) => ({
      id: post.id,
      authorId: post.authorId,
      authorName: post.authorName,
      authorAvatarUrl: post.authorAvatarUrl,
      content: post.artworkTitle
        ? `published ${post.artworkTitle}.`
        : post.title
          ? `shared "${post.title}".`
          : post.content.slice(0, 80) + (post.content.length > 80 ? '…' : ''),
      createdAt: post.createdAt,
    }));
}

export async function getRecentPurchases(userId: string, limit = 4): Promise<RecentPurchase[]> {
  if (!isValidQueryString(userId)) return [];
  const ordersResult = await getBuyerOrders(userId, limit);
  const purchases: RecentPurchase[] = [];

  for (const order of ordersResult.data) {
    if (order.status === 'cancelled' || order.status === 'refunded') continue;
    for (const item of order.items) {
      purchases.push({
        orderId: order.id,
        artworkId: item.artworkId,
        title: item.artworkTitle,
        imageUrl: item.artworkImageUrl || ARTWORK_PLACEHOLDER,
        price: item.price,
        status: order.status,
        purchasedAt: order.createdAt,
      });
    }
  }

  return purchases
    .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
    .slice(0, limit);
}

export async function getAuctionReminders(userId: string, limit = 3): Promise<AuctionReminder[]> {
  if (!isValidQueryString(userId)) return [];
  const bidsResult = await getUserBids(userId, FETCH_PAGE_SIZE);
  const auctionIds = filterValidIds(bidsResult.data.map((bid) => bid.auctionId));
  if (auctionIds.length === 0) return [];

  const auctions = await getAuctionsByIds(auctionIds);
  const now = Date.now();
  const maxBidByAuction = new Map<string, number>();
  bidsResult.data.forEach((bid) => {
    const existing = maxBidByAuction.get(bid.auctionId) || 0;
    if (bid.amount > existing) maxBidByAuction.set(bid.auctionId, bid.amount);
  });

  return auctions
    .filter((auction) => {
      const endsAt = new Date(auction.endsAt).getTime();
      const isLive = ['live', 'ending_soon'].includes(auction.status);
      return isLive && endsAt > now && endsAt - now <= ENDING_SOON_MS;
    })
    .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
    .slice(0, limit)
    .map((auction) => ({
      auctionId: auction.id,
      artworkId: auction.artworkId,
      title: auction.artworkTitle,
      imageUrl: auction.artworkImageUrl || ARTWORK_PLACEHOLDER,
      endsAt: auction.endsAt,
      currentBid: auction.currentBid,
      userMaxBid: maxBidByAuction.get(auction.id) || 0,
    }));
}

export async function getCollectorDashboardData(userId: string) {
  if (!isValidQueryString(userId)) {
    return {
      items: [] as CollectorItem[],
      stats: getCollectorStats([], EMPTY_BID_ANALYTICS),
      activity: [] as CollectorActivityItem[],
      artistUpdates: [] as FollowedArtistUpdate[],
      recentPurchases: [] as RecentPurchase[],
      auctionReminders: [] as AuctionReminder[],
    };
  }
  const [items, bidsResult, activity, artistUpdates, recentPurchases, auctionReminders] =
    await Promise.all([
      getCollectorItems(userId),
      getUserBids(userId, FETCH_PAGE_SIZE),
      getRecentActivity(userId),
      getFollowedArtistUpdates(userId),
      getRecentPurchases(userId),
      getAuctionReminders(userId),
    ]);

  const auctionIds = filterValidIds(bidsResult.data.map((bid) => bid.auctionId));
  const userBidAuctions = auctionIds.length > 0 ? await getAuctionsByIds(auctionIds) : [];

  let analytics: BidAnalytics = { ...EMPTY_BID_ANALYTICS };
  try {
    analytics = normalizeBidAnalytics(await getUserBidAnalytics());
  } catch {
    analytics = { ...EMPTY_BID_ANALYTICS };
  }

  const stats = getCollectorStats(items, analytics, userBidAuctions);

  return { items, stats, activity, artistUpdates, recentPurchases, auctionReminders };
}
