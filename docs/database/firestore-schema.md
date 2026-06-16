# KalaSetu — Firestore Database Schema

> **Version:** 1.0  
> **Last Updated:** 2026-06-16  
> **Firebase Project:** `kala-sethu`

This document is the authoritative reference for all Firestore collections in the KalaSetu platform. It was derived from exhaustive analysis of the actual TypeScript type system, service layer, and application flows.

---

## Architecture Overview

```
KalaSetu Firestore
│
├── users/{uid}
│   ├── followers/{followerId}
│   ├── following/{followingId}
│   └── notifications/{notifId}  [legacy subcollection, also in root]
│
├── artworks/{artworkId}
├── auctions/{auctionId}
├── bids/{bidId}
├── orders/{orderId}
├── payments/{paymentId}
├── transactions/{transactionId}
├── carts/{userId}
├── favorites/{favoriteId}
├── collections/{collectionId}
│
├── posts/{postId}
│   ├── comments/{commentId}
│   └── likes/{likeId}
│
├── chatRooms/{roomId}
│   └── messages/{messageId}
│
├── events/{eventId}
│   └── registrations/{userId}
│
├── workshops/{workshopId}
│   └── enrollments/{userId}
│
├── notifications/{notifId}           [root-level for performance]
├── reports/{reportId}
├── artistVerifications/{verifId}
├── categories/{catId}
├── tags/{tagId}
├── adminLogs/{logId}
├── auditLogs/{logId}
├── analytics/{docId}
├── featureFlags/{flagId}
└── systemConfigs/{configId}
```

---

## Collection Reference

### `users/{uid}`

**Purpose:** Master user record. Created automatically on first auth. Used for all profile lookups, role checks, and artist portfolios.

**Document ID:** Firebase Auth UID (immutable)

| Field | Type | Required | Notes |
|---|---|---|---|
| `displayName` | `string` | ✅ | 1–100 chars |
| `email` | `string` | ✅ | Immutable after creation |
| `phone` | `string` | ❌ | E.164 format |
| `role` | `'guest'\|'user'\|'artist'\|'verified_artist'\|'moderator'\|'admin'` | ✅ | Default: `user` |
| `avatarUrl` | `string` | ❌ | Firebase Storage URL |
| `coverImageUrl` | `string` | ❌ | Firebase Storage URL |
| `bio` | `string` | ❌ | Max 2000 chars |
| `location` | `string` | ❌ | City, Country |
| `website` | `string` | ❌ | URL |
| `socialLinks` | `object` | ❌ | `{ instagram, twitter, facebook, youtube }` |
| `isVerified` | `boolean` | ✅ | Default: `false` — set by admin only |
| `isEmailVerified` | `boolean` | ✅ | Synced from Firebase Auth |
| `isPhoneVerified` | `boolean` | ✅ | Default: `false` |
| `isBanned` | `boolean` | ✅ | Default: `false` — admin only |
| `specialty` | `string` | ❌ | Artist's art form (e.g., "Madhubani Painting") |
| `artworkCount` | `number` | ✅ | Default: `0` — incremented by Cloud Function |
| `followerCount` | `number` | ✅ | Default: `0` |
| `followingCount` | `number` | ✅ | Default: `0` |
| `salesCount` | `number` | ✅ | Default: `0` — for artists |
| `totalRevenue` | `number` | ✅ | Default: `0` — INR, for artists |
| `provider` | `'email'\|'google'\|'phone'` | ✅ | Auth provider used on signup |
| `onboardingComplete` | `boolean` | ✅ | Default: `false` |
| `createdAt` | `ISO string` | ✅ | Set once on creation |
| `updatedAt` | `ISO string` | ✅ | Updated on every write |
| `lastLoginAt` | `ISO string` | ❌ | Updated on every login |

**Relationships:** Referenced by virtually every other collection via `artistId`, `buyerId`, `sellerId`, `authorId`, `userId`, `organizerId`.

**Access Rules:** Public read. Self-write (excluding `role`, `isVerified`, `isBanned`). Admin full write.

**Required Indexes:**
- `role ASC, createdAt DESC`
- `isVerified ASC, followerCount DESC`
- `displayName ASC, displayName ASC` (prefix search)

---

### `users/{uid}/followers/{followerId}`

**Purpose:** Tracks who follows a user. Document ID is the follower's UID.

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | The follower's UID |
| `userName` | `string` | Denormalized display name |
| `createdAt` | `ISO string` | When follow occurred |

---

### `users/{uid}/following/{followingId}`

**Purpose:** Tracks who a user follows. Document ID is the followed user's UID.

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | The followed user's UID |
| `userName` | `string` | Denormalized display name |
| `createdAt` | `ISO string` | When follow occurred |

---

### `artworks/{artworkId}`

**Purpose:** All artworks listed on the platform (drafts, published, sold, archived).

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | `string` | ✅ | 1–200 chars |
| `description` | `string` | ✅ | Max 5000 chars |
| `artistId` | `string` | ✅ | FK → `users/{uid}` |
| `artistName` | `string` | ✅ | Denormalized |
| `artistAvatarUrl` | `string` | ❌ | Denormalized |
| `artistVerified` | `boolean` | ✅ | Denormalized |
| `price` | `number` | ✅ | INR, ≥ 0 |
| `originalPrice` | `number` | ❌ | Before discount |
| `currency` | `'INR'` | ✅ | Always INR |
| `listingType` | `'fixed_price'\|'auction'\|'commission'\|'not_for_sale'` | ✅ | |
| `category` | `string` | ✅ | FK → `categories` |
| `subcategory` | `string` | ❌ | |
| `medium` | `string` | ✅ | e.g., "Oil on Canvas" |
| `style` | `string` | ❌ | |
| `dimensions` | `string` | ✅ | e.g., "24" x 36"" |
| `weight` | `string` | ❌ | For shipping |
| `year` | `number` | ✅ | Year of creation |
| `tags` | `string[]` | ✅ | For search/discovery |
| `images` | `ArtworkImage[]` | ✅ | Min 1 image |
| `thumbnailUrl` | `string` | ✅ | Primary image URL |
| `status` | `'draft'\|'pending'\|'published'\|'archived'\|'rejected'\|'sold'` | ✅ | Default: `draft` |
| `isFeatured` | `boolean` | ✅ | Admin-curated |
| `isCommissionable` | `boolean` | ✅ | Default: `false` |
| `provenance` | `string` | ❌ | Ownership history |
| `certificate` | `string` | ❌ | Certificate URL |
| `viewCount` | `number` | ✅ | Default: `0` |
| `likeCount` | `number` | ✅ | Default: `0` |
| `favoriteCount` | `number` | ✅ | Default: `0` |
| `createdAt` | `ISO string` | ✅ | |
| `updatedAt` | `ISO string` | ✅ | |
| `publishedAt` | `ISO string` | ❌ | Set when status → `published` |

**Required Indexes:**
- `status ASC, createdAt DESC`
- `status ASC, category ASC, createdAt DESC`
- `status ASC, isFeatured ASC, createdAt DESC`
- `status ASC, price ASC`
- `status ASC, viewCount DESC`
- `status ASC, medium ASC, createdAt DESC`
- `artistId ASC, createdAt DESC`

---

### `auctions/{auctionId}`

**Purpose:** Timed or live auctions for artworks. Real-time bidding supported via `onSnapshot`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `artworkId` | `string` | ✅ | FK → `artworks` |
| `artworkTitle` | `string` | ✅ | Denormalized |
| `artworkImageUrl` | `string` | ✅ | Denormalized |
| `artistId` | `string` | ✅ | FK → `users` |
| `artistName` | `string` | ✅ | Denormalized |
| `type` | `'timed'\|'live'` | ✅ | |
| `startPrice` | `number` | ✅ | INR |
| `reservePrice` | `number` | ❌ | Hidden reserve |
| `currentBid` | `number` | ✅ | Starts at `startPrice` |
| `minIncrement` | `number` | ✅ | Min bid increment, INR |
| `currency` | `'INR'` | ✅ | |
| `startsAt` | `ISO string` | ✅ | |
| `endsAt` | `ISO string` | ✅ | May extend on late bids |
| `originalEndsAt` | `ISO string` | ✅ | Original end time before extensions |
| `extensionMinutes` | `number` | ✅ | Auto-extend window (e.g., 5 min) |
| `status` | `'scheduled'\|'live'\|'ending_soon'\|'ended'\|'cancelled'\|'completed'` | ✅ | |
| `totalBids` | `number` | ✅ | Default: `0` |
| `uniqueBidders` | `number` | ✅ | Default: `0` |
| `winnerId` | `string` | ❌ | Set on completion |
| `winnerName` | `string` | ❌ | Denormalized |
| `winningBid` | `number` | ❌ | Final winning amount |
| `createdAt` | `ISO string` | ✅ | |
| `updatedAt` | `ISO string` | ✅ | |

**Update Policy:** `currentBid`, `totalBids`, `uniqueBidders`, `status`, `winnerId` are ONLY updated by Cloud Functions (Admin SDK bypasses rules). Client-side updates are blocked by security rules.

---

### `bids/{bidId}`

**Purpose:** Individual bid records. Created exclusively by Cloud Functions after server-side validation.

| Field | Type | Required | Notes |
|---|---|---|---|
| `auctionId` | `string` | ✅ | FK → `auctions` |
| `bidderId` | `string` | ✅ | FK → `users` |
| `bidderName` | `string` | ✅ | Denormalized |
| `bidderAvatarUrl` | `string` | ❌ | Denormalized |
| `amount` | `number` | ✅ | INR |
| `currency` | `'INR'` | ✅ | |
| `status` | `'active'\|'outbid'\|'won'\|'cancelled'` | ✅ | |
| `timestamp` | `ISO string` | ✅ | Server timestamp |

**Access Rules:** Client read only. Create/Update/Delete: Cloud Functions only.

---

### `orders/{orderId}`

**Purpose:** Purchase orders. One order per seller per checkout (cart split by seller).

| Field | Type | Required | Notes |
|---|---|---|---|
| `buyerId` | `string` | ✅ | FK → `users` |
| `buyerName` | `string` | ✅ | Denormalized |
| `buyerEmail` | `string` | ✅ | Denormalized |
| `sellerId` | `string` | ✅ | FK → `users` (artist) |
| `sellerName` | `string` | ✅ | Denormalized |
| `items` | `OrderItem[]` | ✅ | Array of purchased items |
| `subtotal` | `number` | ✅ | INR |
| `shippingCost` | `number` | ✅ | INR, `0` for free shipping |
| `tax` | `number` | ✅ | INR, GST |
| `totalAmount` | `number` | ✅ | INR |
| `currency` | `'INR'` | ✅ | |
| `shippingAddress` | `ShippingAddress` | ✅ | Full address object |
| `trackingNumber` | `string` | ❌ | Added on shipment |
| `shippingProvider` | `string` | ❌ | e.g., "Delhivery", "India Post" |
| `paymentId` | `string` | ❌ | FK → `payments` |
| `paymentStatus` | `'pending'\|'completed'\|'failed'\|'refunded'` | ✅ | |
| `status` | `OrderStatus` | ✅ | Default: `pending` |
| `statusHistory` | `OrderStatusEntry[]` | ✅ | Immutable audit trail |
| `buyerNotes` | `string` | ❌ | |
| `sellerNotes` | `string` | ❌ | |
| `createdAt` | `ISO string` | ✅ | |
| `updatedAt` | `ISO string` | ✅ | |

---

### `payments/{paymentId}`

**Purpose:** Razorpay payment records. Created exclusively by Cloud Functions (`verifyPayment`).

| Field | Type | Notes |
|---|---|---|
| `orderId` | `string` | FK → `orders` |
| `razorpayOrderId` | `string` | Razorpay order ID |
| `razorpayPaymentId` | `string` | Set after capture |
| `razorpaySignature` | `string` | HMAC signature (never expose) |
| `amount` | `number` | INR paise |
| `currency` | `'INR'` | |
| `status` | `'created'\|'authorized'\|'captured'\|'failed'\|'refunded'` | |
| `method` | `'card'\|'upi'\|'netbanking'\|'wallet'\|'emi'` | |
| `refundId` | `string` | If refunded |
| `refundAmount` | `number` | INR |
| `refundReason` | `string` | |
| `errorCode` | `string` | On failure |
| `errorDescription` | `string` | On failure |
| `createdAt` | `ISO string` | |
| `updatedAt` | `ISO string` | |

**Access Rules:** No client writes. Cloud Functions only.

---

### `transactions/{transactionId}`

**Purpose:** Financial ledger — every money movement on the platform (sales, commissions, payouts, refunds).

| Field | Type | Notes |
|---|---|---|
| `type` | `'sale'\|'refund'\|'commission'\|'payout'` | |
| `fromUserId` | `string` | FK → `users` |
| `toUserId` | `string` | FK → `users` |
| `amount` | `number` | INR |
| `currency` | `'INR'` | |
| `paymentId` | `string` | FK → `payments` |
| `orderId` | `string` | FK → `orders` |
| `description` | `string` | Human-readable description |
| `createdAt` | `ISO string` | |

---

### `carts/{userId}`

**Purpose:** Persistent server-side cart (document ID = user UID). Also backed by `localStorage` on client.

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | Owner UID |
| `items` | `CartItem[]` | Array of cart items |
| `totalAmount` | `number` | INR |
| `itemCount` | `number` | |
| `updatedAt` | `ISO string` | |

---

### `favorites/{favoriteId}`

**Purpose:** User bookmarks/saves for artworks, posts, and events.

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | FK → `users` |
| `targetId` | `string` | FK → artworks/posts/events |
| `targetType` | `'artwork'\|'post'\|'event'` | |
| `createdAt` | `ISO string` | |

**Required Indexes:**
- `userId ASC, createdAt DESC`
- `userId ASC, targetType ASC, createdAt DESC`

---

### `collections/{collectionId}`

**Purpose:** User-curated art collections (e.g., "My Modern Indian Collection").

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | FK → `users` |
| `name` | `string` | 1–100 chars |
| `description` | `string` | |
| `artworkIds` | `string[]` | FK → `artworks[]` |
| `coverImageUrl` | `string` | |
| `isPublic` | `boolean` | Default: `false` |
| `createdAt` | `ISO string` | |
| `updatedAt` | `ISO string` | |

---

### `posts/{postId}`

**Purpose:** Community (CharchaSabha) posts — text, images, artwork shares, discussions.

| Field | Type | Notes |
|---|---|---|
| `authorId` | `string` | FK → `users` |
| `authorName` | `string` | Denormalized |
| `authorAvatarUrl` | `string` | Denormalized |
| `authorVerified` | `boolean` | Denormalized |
| `type` | `'text'\|'image'\|'artwork_share'\|'discussion'` | |
| `title` | `string` | Optional, for discussions |
| `content` | `string` | Main body |
| `mediaUrls` | `string[]` | Image URLs |
| `artworkId` | `string` | FK → `artworks` (for shares) |
| `artworkTitle` | `string` | Denormalized |
| `artworkImageUrl` | `string` | Denormalized |
| `category` | `string` | |
| `tags` | `string[]` | |
| `likeCount` | `number` | Default: `0` |
| `commentCount` | `number` | Default: `0` |
| `shareCount` | `number` | Default: `0` |
| `viewCount` | `number` | Default: `0` |
| `isTrending` | `boolean` | Set by Cloud Function |
| `createdAt` | `ISO string` | |
| `updatedAt` | `ISO string` | |

---

### `posts/{postId}/comments/{commentId}`

**Purpose:** Comments on posts, supports nested replies.

| Field | Type | Notes |
|---|---|---|
| `postId` | `string` | Parent post ID |
| `authorId` | `string` | FK → `users` |
| `authorName` | `string` | Denormalized |
| `authorAvatarUrl` | `string` | Denormalized |
| `content` | `string` | |
| `likeCount` | `number` | |
| `parentCommentId` | `string` | Set for replies, absent for top-level |
| `replyCount` | `number` | |
| `createdAt` | `ISO string` | |
| `updatedAt` | `ISO string` | |

---

### `posts/{postId}/likes/{likeId}`

**Purpose:** Tracks which users have liked a post. Document ID = userId.

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | |
| `userName` | `string` | Denormalized |
| `createdAt` | `ISO string` | |

---

### `chatRooms/{roomId}`

**Purpose:** Direct message conversations between users.

| Field | Type | Notes |
|---|---|---|
| `type` | `'direct'\|'group'` | |
| `participants` | `string[]` | Array of user UIDs |
| `participantNames` | `Record<uid, name>` | Denormalized |
| `participantAvatars` | `Record<uid, url>` | Denormalized |
| `lastMessage` | `string` | Preview |
| `lastMessageAt` | `ISO string` | |
| `lastMessageBy` | `string` | UID |
| `unreadCount` | `Record<uid, number>` | Per-user unread count |
| `createdAt` | `ISO string` | |
| `updatedAt` | `ISO string` | |

---

### `chatRooms/{roomId}/messages/{messageId}`

| Field | Type | Notes |
|---|---|---|
| `chatRoomId` | `string` | Parent room ID |
| `senderId` | `string` | FK → `users` |
| `senderName` | `string` | Denormalized |
| `type` | `'text'\|'image'\|'artwork'\|'system'` | |
| `content` | `string` | |
| `mediaUrl` | `string` | Image URL |
| `artworkId` | `string` | FK → `artworks` |
| `readBy` | `string[]` | UIDs who read this |
| `createdAt` | `ISO string` | |
| `editedAt` | `ISO string` | |
| `isDeleted` | `boolean` | Soft delete |

---

### `events/{eventId}`

**Purpose:** All events — workshops, exhibitions, webinars, art fairs, meetups.

| Field | Type | Notes |
|---|---|---|
| `title` | `string` | |
| `description` | `string` | |
| `type` | `'workshop'\|'exhibition'\|'art_fair'\|'webinar'\|'deadline'\|'meetup'` | |
| `mode` | `'online'\|'offline'\|'hybrid'` | |
| `status` | `'upcoming'\|'live'\|'completed'\|'cancelled'` | |
| `organizerId` | `string` | FK → `users` |
| `organizerName` | `string` | Denormalized |
| `startDate` | `ISO string` | |
| `endDate` | `ISO string` | |
| `timezone` | `string` | e.g., "Asia/Kolkata" |
| `venue` | `string` | For offline events |
| `address` | `string` | |
| `city` | `string` | |
| `onlineLink` | `string` | For online events |
| `maxCapacity` | `number` | |
| `registrationCount` | `number` | Default: `0` |
| `isFree` | `boolean` | |
| `price` | `number` | INR |
| `currency` | `'INR'` | |
| `imageUrl` | `string` | |
| `createdAt` | `ISO string` | |
| `updatedAt` | `ISO string` | |

---

### `events/{eventId}/registrations/{userId}`

**Purpose:** Event registrations. Document ID = userId (idempotent).

| Field | Type | Notes |
|---|---|---|
| `eventId` | `string` | |
| `userId` | `string` | |
| `userName` | `string` | Denormalized |
| `userEmail` | `string` | Denormalized |
| `status` | `'registered'\|'attended'\|'cancelled'` | |
| `ticketNumber` | `string` | e.g., `KS-A1B2C3` |
| `registeredAt` | `ISO string` | |

---

### `workshops/{workshopId}`

**Purpose:** Paid or free workshops with capacity, scheduling, and ratings.

| Field | Type | Notes |
|---|---|---|
| `title` | `string` | |
| `description` | `string` | |
| `instructorId` | `string` | FK → `users` |
| `instructorName` | `string` | Denormalized |
| `instructorAvatarUrl` | `string` | Denormalized |
| `level` | `'beginner'\|'intermediate'\|'advanced'` | |
| `duration` | `string` | e.g., "6 hours across 3 sessions" |
| `syllabus` | `string[]` | Ordered topic list |
| `materials` | `string[]` | Required materials |
| `startDate` | `ISO string` | |
| `endDate` | `ISO string` | |
| `schedule` | `string` | Human-readable schedule |
| `mode` | `'online'\|'offline'\|'hybrid'` | |
| `onlineLink` | `string` | |
| `venue` | `string` | |
| `maxCapacity` | `number` | |
| `enrolledCount` | `number` | Default: `0` |
| `isFree` | `boolean` | |
| `price` | `number` | INR |
| `currency` | `'INR'` | |
| `imageUrl` | `string` | |
| `averageRating` | `number` | 0–5 |
| `reviewCount` | `number` | |
| `status` | `'upcoming'\|'ongoing'\|'completed'\|'cancelled'` | |
| `createdAt` | `ISO string` | |
| `updatedAt` | `ISO string` | |

---

### `notifications/{notifId}`

**Purpose:** In-app notifications for all user activity (bids, orders, follows, moderation).

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | FK → `users` (recipient) |
| `type` | `NotificationType` | See type enum |
| `title` | `string` | Short notification title |
| `message` | `string` | Full message body |
| `imageUrl` | `string` | Related image |
| `actionUrl` | `string` | Deep link |
| `relatedId` | `string` | FK → related entity |
| `relatedType` | `'artwork'\|'auction'\|'order'\|'user'\|'post'\|'event'` | |
| `isRead` | `boolean` | Default: `false` |
| `createdAt` | `ISO string` | |

**NotificationType values:** `bid_placed`, `bid_outbid`, `auction_won`, `auction_ending`, `order_placed`, `order_shipped`, `order_delivered`, `payment_received`, `new_follower`, `new_comment`, `new_like`, `new_message`, `artwork_approved`, `artwork_rejected`, `verification_approved`, `verification_rejected`, `event_reminder`, `system`

---

### `reports/{reportId}`

**Purpose:** User-submitted reports for moderation of artworks, users, posts, comments, and auctions.

| Field | Type | Notes |
|---|---|---|
| `reporterId` | `string` | FK → `users` |
| `reporterName` | `string` | Denormalized |
| `targetId` | `string` | FK → reported entity |
| `targetType` | `'artwork'\|'user'\|'post'\|'comment'\|'auction'` | |
| `reason` | `'inappropriate_content'\|'fake_artwork'\|'scam'\|'harassment'\|'spam'\|'copyright'\|'other'` | |
| `description` | `string` | Reporter's description |
| `evidence` | `string[]` | Screenshot URLs |
| `status` | `'pending'\|'under_review'\|'resolved'\|'dismissed'` | Default: `pending` |
| `severity` | `'low'\|'medium'\|'high'\|'critical'` | Default: `medium` |
| `reviewerId` | `string` | FK → `users` (admin/moderator) |
| `reviewerNotes` | `string` | |
| `actionTaken` | `string` | e.g., "Content removed, user warned" |
| `resolvedAt` | `ISO string` | |
| `createdAt` | `ISO string` | |
| `updatedAt` | `ISO string` | |

---

### `artistVerifications/{verifId}`

**Purpose:** Artist badge verification applications and review tracking.

| Field | Type | Notes |
|---|---|---|
| `artistId` | `string` | FK → `users` |
| `artistName` | `string` | Denormalized |
| `artistEmail` | `string` | Denormalized |
| `artForm` | `string` | Primary art form |
| `experience` | `string` | Years / description |
| `portfolio` | `string` | URL or description |
| `statement` | `string` | Artist statement |
| `documents` | `VerificationDocument[]` | Uploaded proofs |
| `status` | `'pending'\|'under_review'\|'approved'\|'rejected'\|'expired'` | |
| `reviewerId` | `string` | FK → `users` (admin) |
| `reviewerName` | `string` | Denormalized |
| `reviewNotes` | `string` | |
| `rejectionReason` | `string` | |
| `badgeGrantedAt` | `ISO string` | |
| `badgeExpiresAt` | `ISO string` | 1 year after grant |
| `submittedAt` | `ISO string` | |
| `reviewedAt` | `ISO string` | |
| `updatedAt` | `ISO string` | |

---

### `categories/{catId}`

**Purpose:** Art categories (e.g., Paintings, Sculptures, Textiles). Admin-managed.

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | e.g., "Madhubani Art" |
| `slug` | `string` | URL-friendly, unique |
| `description` | `string` | |
| `imageUrl` | `string` | |
| `parentId` | `string` | For subcategories |
| `artworkCount` | `number` | Updated by Cloud Functions |
| `order` | `number` | Display order |

---

### `tags/{tagId}`

**Purpose:** Searchable tags attached to artworks and posts.

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | |
| `slug` | `string` | |
| `usageCount` | `number` | Updated by Cloud Functions |

---

### `adminLogs/{logId}`

**Purpose:** Immutable audit trail of all admin actions. Write-only after creation.

| Field | Type | Notes |
|---|---|---|
| `adminId` | `string` | FK → `users` |
| `adminName` | `string` | Denormalized |
| `action` | `string` | e.g., "APPROVE_VERIFICATION", "BAN_USER" |
| `targetId` | `string` | Affected entity ID |
| `targetType` | `string` | Affected entity type |
| `details` | `string` | JSON or human-readable |
| `timestamp` | `ISO string` | |

---

### `auditLogs/{logId}`

**Purpose:** Full audit trail of all significant state changes across the platform.

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | Who made the change |
| `action` | `string` | What was done |
| `entityId` | `string` | What was changed |
| `entityType` | `string` | Type of entity |
| `previousValue` | `object` | Before state |
| `newValue` | `object` | After state |
| `ipAddress` | `string` | Request origin |
| `timestamp` | `ISO string` | |

---

### `analytics/{docId}`

**Purpose:** Platform-level aggregate metrics. Written exclusively by scheduled Cloud Functions.

| Field | Type | Notes |
|---|---|---|
| `totalUsers` | `number` | |
| `totalArtists` | `number` | |
| `verifiedArtists` | `number` | |
| `totalArtworks` | `number` | |
| `totalOrders` | `number` | |
| `totalRevenue` | `number` | INR |
| `monthlyGMV` | `number` | INR |
| `activeAuctions` | `number` | |
| `openDisputes` | `number` | |
| `userGrowth` | `number` | % change from prior period |
| `revenueGrowth` | `number` | % change from prior period |
| `period` | `'daily'\|'weekly'\|'monthly'` | |
| `date` | `ISO string` | |

---

### `featureFlags/{flagId}`

**Purpose:** Runtime feature toggles managed by admin without deployment.

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | |
| `description` | `string` | |
| `enabled` | `boolean` | |
| `rolloutPercent` | `number` | 0–100 |
| `updatedAt` | `ISO string` | |
| `updatedBy` | `string` | Admin UID |

---

### `systemConfigs/{configId}`

**Purpose:** Global platform configuration values (commission rates, limits, feature configs).

| Field | Type | Notes |
|---|---|---|
| `key` | `string` | Unique config key |
| `value` | `string\|number\|boolean\|object` | Config value |
| `description` | `string` | |
| `updatedAt` | `ISO string` | |
| `updatedBy` | `string` | Admin UID |

---

## Key Design Patterns

### Denormalization
Fields like `artistName`, `buyerName`, `authorAvatarUrl` are duplicated from `users` documents to avoid costly joins on read. These must be kept in sync by Cloud Functions on user profile updates.

### Counters
Fields like `artworkCount`, `followerCount`, `likeCount` are maintained using Firestore's `increment()` atomic operation to avoid race conditions.

### Subcollections vs Root Collections
- **Subcollections** (`followers`, `comments`, `messages`, `registrations`) are used when data is always accessed in the context of its parent.
- **Root collections** (`notifications`, `bids`) are used when data needs to be queried across multiple parents (e.g., "all unread notifications for a user").

### Server-Only Writes
`payments`, `bids`, `analytics`, and `auditLogs` are ONLY written by Cloud Functions using the Admin SDK. Client writes are blocked by security rules. The Admin SDK bypasses all Firestore security rules.
