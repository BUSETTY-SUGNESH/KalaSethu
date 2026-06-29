// ============================================================
// KalaSetu — Shared TypeScript Types
// Complete type system for the entire platform
// ============================================================

// ── User Roles ──────────────────────────────────────────────
export type UserRole = 'guest' | 'user' | 'artist' | 'verified_artist' | 'moderator' | 'admin';

// ── User ────────────────────────────────────────────────────
export interface User {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
  };
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isBanned: boolean;
  // Artist-specific
  specialty?: string;
  artworkCount: number;
  followerCount: number;
  followingCount: number;
  salesCount: number;
  totalRevenue: number;
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  preferences?: any;
}

export interface UserProfile {
  id: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  location?: string;
  specialty?: string;
  isVerified: boolean;
  artworkCount: number;
  followerCount: number;
  followingCount: number;
}

// ── Artwork ─────────────────────────────────────────────────
export type ArtworkStatus = 'draft' | 'pending' | 'published' | 'archived' | 'rejected' | 'sold';
export type ArtworkListingType = 'fixed_price' | 'auction' | 'commission' | 'not_for_sale';

export interface Artwork {
  id: string;
  title: string;
  description: string;
  artistId: string;
  artistName: string;
  artistAvatarUrl?: string;
  artistVerified: boolean;
  // Pricing
  price: number;
  originalPrice?: number;
  currency: 'INR';
  listingType: ArtworkListingType;
  // Categorization
  category: string;
  subcategory?: string;
  medium: string;
  style?: string;
  dimensions: string;
  weight?: string;
  year: number;
  tags: string[];
  // Media
  images: ArtworkImage[];
  thumbnailUrl: string;
  // Status & Flags
  status: ArtworkStatus;
  isFeatured: boolean;
  isCommissionable: boolean;
  // Provenance
  provenance?: string;
  certificate?: string;
  // Engagement
  viewCount: number;
  likeCount: number;
  favoriteCount: number;
  // Metadata
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ArtworkImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  storagePath: string;
  width?: number;
  height?: number;
  isPrimary: boolean;
  order: number;
}

// ── Category & Tags ─────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  artworkCount: number;
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
}

export interface MarketplaceCategorySummary {
  slug: string;
  label: string;
  artworkCount: number;
  imageUrl: string;
}

// ── Auction ─────────────────────────────────────────────────
export type AuctionType = 'timed' | 'live';
export type AuctionStatus = 'scheduled' | 'live' | 'ending_soon' | 'ended' | 'cancelled' | 'completed';

export interface Auction {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkImageUrl: string;
  artistId: string;
  artistName: string;
  // Auction Config
  type: AuctionType;
  startPrice: number;
  reservePrice?: number;
  currentBid: number;
  minIncrement: number;
  currency: 'INR';
  // Timing
  startsAt: string;
  endsAt: string;
  originalEndsAt: string; // Used for extension tracking
  extensionMinutes: number; // Auto-extend on late bids (e.g., 5 minutes)
  // State
  status: AuctionStatus;
  totalBids: number;
  uniqueBidders: number;
  winnerId?: string;
  winnerName?: string;
  winningBid?: number;
  lastBidderId?: string;
  lastBidderName?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  bidderAvatarUrl?: string;
  amount: number;
  currency: 'INR';
  status: 'active' | 'outbid' | 'won' | 'cancelled';
  timestamp: string;
}

// ── Commerce ────────────────────────────────────────────────
export interface CartItem {
  artworkId: string;
  artworkTitle: string;
  artworkImageUrl: string;
  artistId: string;
  artistName: string;
  price: number;
  quantity: number;
  addedAt: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  totalAmount: number;
  itemCount: number;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refund_requested'
  | 'refunded';

export interface OrderItem {
  artworkId: string;
  artworkTitle: string;
  artworkImageUrl: string;
  artistId: string;
  artistName: string;
  price: number;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface UserAddress extends ShippingAddress {
  id: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  // Items
  items: OrderItem[];
  // Pricing
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  currency: 'INR';
  // Shipping
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  shippingProvider?: string;
  // Payment
  paymentId?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  // Status
  status: OrderStatus;
  statusHistory: OrderStatusEntry[];
  // Notes
  buyerNotes?: string;
  sellerNotes?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

// ── Payments ────────────────────────────────────────────────
export type PaymentStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'emi';

export interface Payment {
  id: string;
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  // Amounts
  amount: number;
  currency: 'INR';
  // Status
  status: PaymentStatus;
  method?: PaymentMethod;
  // Refund
  refundId?: string;
  refundAmount?: number;
  refundReason?: string;
  // Error
  errorCode?: string;
  errorDescription?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'refund' | 'commission' | 'payout';
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: 'INR';
  paymentId?: string;
  orderId?: string;
  description: string;
  createdAt: string;
}

// ── Social / Community ──────────────────────────────────────
export type PostType = 'text' | 'image' | 'artwork_share' | 'discussion';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorVerified: boolean;
  // Content
  type: PostType;
  title?: string;
  content: string;
  mediaUrls: string[];
  // Linked content
  artworkId?: string;
  artworkTitle?: string;
  artworkImageUrl?: string;
  // Categorization
  category?: string;
  tags: string[];
  // Engagement
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  isTrending: boolean;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  likeCount: number;
  parentCommentId?: string | null; // For nested replies
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followerName: string;
  followingId: string;
  followingName: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'artwork' | 'post' | 'event';
  createdAt: string;
}

// ── Messaging ───────────────────────────────────────────────
export interface ChatRoom {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  participantNames: Record<string, string>;
  participantAvatars: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageBy?: string;
  unreadCount: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'text' | 'image' | 'artwork' | 'system';
export type MessageContextType = 'dm' | 'channel';
export type ContentFormat = 'markdown' | 'plain' | 'rich-json';

export interface Message {
  id: string;
  contextType: MessageContextType;
  chatRoomId?: string;
  communityId?: string;
  channelId?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  content: string;
  contentFormat?: ContentFormat;
  contentLower?: string;
  mediaUrl?: string;
  artworkId?: string;
  replyToMessageId?: string;
  replyToPreview?: string;
  mentionUserIds?: string[];
  reactions?: Record<string, string[]>;
  readBy: string[];
  deliveredTo?: string[];
  pinnedAt?: string;
  pinnedBy?: string;
  threadId?: string;
  createdAt: string;
  editedAt?: string;
  isDeleted: boolean;
  deletedBy?: string;
}

// ── Communities (Discord-style) ─────────────────────────────
export type CommunityRole = 'owner' | 'admin' | 'moderator' | 'member';
export type ChannelType = 'text' | 'voice';

export interface Community {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  bannerUrl?: string;
  description?: string;
  followerCount: number;
  memberCount: number;
  isAutoProvisioned: boolean;
  settings?: {
    announcementsReadOnly?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMember {
  id: string;
  userId: string;
  communityId: string;
  role: CommunityRole;
  displayName: string;
  avatarUrl?: string;
  nickname?: string;
  isBanned: boolean;
  mutedUntil?: string;
  joinedAt: string;
}

export interface CommunityChannel {
  id: string;
  communityId: string;
  name: string;
  type: ChannelType;
  topic?: string;
  position: number;
  isDefault: boolean;
  isAnnouncements?: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageBy?: string;
  unreadCount: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface PinnedMessage {
  id: string;
  communityId: string;
  channelId: string;
  messageId: string;
  pinnedBy: string;
  pinnedAt: string;
}

export interface ModerationLog {
  id: string;
  communityId: string;
  channelId?: string;
  messageId?: string;
  targetUserId?: string;
  moderatorId: string;
  action: 'delete_message' | 'ban' | 'unban' | 'timeout';
  reason?: string;
  createdAt: string;
}

// ── Events & Workshops ──────────────────────────────────────
export type EventType = 'workshop' | 'exhibition' | 'art_fair' | 'webinar' | 'deadline' | 'meetup';
export type EventMode = 'online' | 'offline' | 'hybrid';
export type EventStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  mode: EventMode;
  status: EventStatus;
  // Organizer
  organizerId: string;
  organizerName: string;
  // Timing
  startDate: string;
  endDate: string;
  timezone: string;
  // Location
  venue?: string;
  address?: string;
  city?: string;
  onlineLink?: string;
  // Capacity
  maxCapacity?: number;
  registrationCount: number;
  // Pricing
  isFree: boolean;
  price?: number;
  currency: 'INR';
  // Media
  imageUrl?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'registered' | 'attended' | 'cancelled';
  ticketNumber?: string;
  registeredAt: string;
}

export interface Workshop {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  instructorAvatarUrl?: string;
  // Details
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  syllabus?: string[];
  materials?: string[];
  // Scheduling
  startDate: string;
  endDate: string;
  schedule?: string; // e.g., "Every Saturday, 10 AM - 12 PM"
  mode: EventMode;
  onlineLink?: string;
  venue?: string;
  // Capacity
  maxCapacity: number;
  enrolledCount: number;
  // Pricing
  isFree: boolean;
  price?: number;
  currency: 'INR';
  // Media
  imageUrl?: string;
  // Rating
  averageRating: number;
  reviewCount: number;
  // Metadata
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopEnrollment {
  id: string;
  workshopId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'enrolled' | 'completed' | 'dropped' | 'cancelled';
  certificateUrl?: string;
  enrolledAt: string;
  completedAt?: string;
}

// ── Notifications ───────────────────────────────────────────
export type NotificationType =
  | 'bid_placed'
  | 'bid_outbid'
  | 'auction_won'
  | 'auction_lost'             // bidder who did not win when auction closes
  | 'auction_ending'           // ending-soon reminder (24h / 1h / 15m)
  | 'auction_closed_artist'    // artist notified their auction has ended
  | 'order_placed'
  | 'order_shipped'
  | 'order_delivered'
  | 'payment_received'
  | 'new_follower'
  | 'new_comment'
  | 'new_like'
  | 'new_message'
  | 'new_community_message'
  | 'new_mention'
  | 'artwork_approved'
  | 'artwork_rejected'
  | 'verification_approved'
  | 'verification_rejected'
  | 'event_reminder'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  imageUrl?: string;
  actionUrl?: string;
  // Related entities
  relatedId?: string;
  relatedType?: 'artwork' | 'auction' | 'order' | 'user' | 'post' | 'event' | 'message' | 'community';
  // Status
  isRead: boolean;
  // Metadata
  createdAt: string;
}

// ── Reports & Moderation ────────────────────────────────────
export type ReportReason =
  | 'inappropriate_content'
  | 'fake_artwork'
  | 'scam'
  | 'harassment'
  | 'spam'
  | 'copyright'
  | 'other';
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetType: 'artwork' | 'user' | 'post' | 'comment' | 'auction' | 'message';
  reason: ReportReason;
  description: string;
  evidence?: string[];
  status: ReportStatus;
  severity: 'low' | 'medium' | 'high' | 'critical';
  // Resolution
  reviewerId?: string;
  reviewerNotes?: string;
  actionTaken?: string;
  resolvedAt?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ── Artist Verification ─────────────────────────────────────
export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';

export interface ArtistVerification {
  id: string;
  artistId: string;
  artistName: string;
  artistEmail: string;
  // Application
  artForm: string;
  experience: string;
  portfolio: string;
  statement: string;
  // Documents
  documents: VerificationDocument[];
  // Review
  status: VerificationStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  // Badge
  badgeGrantedAt?: string;
  badgeExpiresAt?: string;
  // Metadata
  submittedAt: string;
  reviewedAt?: string;
  updatedAt: string;
}

export interface VerificationDocument {
  id: string;
  type: 'id_proof' | 'art_certificate' | 'portfolio_proof' | 'reference_letter' | 'other';
  name: string;
  url: string;
  storagePath: string;
  uploadedAt: string;
}

// ── Admin & Analytics ───────────────────────────────────────
export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityId: string;
  entityType: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercent: number;
  updatedAt: string;
  updatedBy: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

// ── Analytics / Metrics ─────────────────────────────────────
export interface MetricData {
  label: string;
  value: string;
  numericValue?: number;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  icon: string;
}

export interface PlatformAnalytics {
  totalUsers: number;
  totalArtists: number;
  verifiedArtists: number;
  totalArtworks: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyGMV: number;
  activeAuctions: number;
  openDisputes: number;
  // Trends
  userGrowth: number;
  revenueGrowth: number;
  // Period
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
}

export interface ArtistAnalytics {
  artworkViews: number;
  profileViews: number;
  totalSales: number;
  totalRevenue: number;
  followerCount: number;
  averageOrderValue: number;
  conversionRate: number;
  topArtwork?: { id: string; title: string; views: number };
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
}

// ── Navigation ──────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

// ── Favorites / Collections ─────────────────────────────────
export interface Favorite {
  id: string;
  userId: string;
  artworkId: string;
  createdAt: string;
}

export interface UserCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  artworkIds: string[];
  coverImageUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── API Response Types ──────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  lastDoc?: any;
  hasMore: boolean;
}

// ── Form Types ──────────────────────────────────────────────
export interface ArtworkFormData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  medium: string;
  style?: string;
  dimensions: string;
  weight?: string;
  year: number;
  price: number;
  listingType: ArtworkListingType;
  tags: string[];
  provenance?: string;
  isCommissionable: boolean;
}

export interface AuctionFormData {
  artworkId: string;
  type: AuctionType;
  startPrice: number;
  reservePrice?: number;
  minIncrement: number;
  startsAt: string;
  endsAt: string;
  extensionMinutes: number;
}

export interface CheckoutFormData {
  shippingAddress: ShippingAddress;
  buyerNotes?: string;
}
