// ============================================================
// KalaSetu — Repository Layer
// This file exports the active database implementation.
// To migrate to a different database, change the imports here.
// ============================================================

import { userRepository } from './firestore/user.repository';
import { artworkRepository } from './firestore/artwork.repository';
import { auctionRepository } from './firestore/auction.repository';
import { orderRepository } from './firestore/order.repository';
import { communityRepository } from './firestore/community.repository';
import { communityMessagingRepository } from './firestore/community-messaging.repository';
import { chatRepository } from './firestore/chat.repository';
import { eventRepository } from './firestore/event.repository';
import { notificationRepository } from './firestore/notification.repository';
import { adminRepository } from './firestore/admin.repository';

// Export the active implementations
export {
  userRepository,
  artworkRepository,
  auctionRepository,
  orderRepository,
  communityRepository,
  chatRepository,
  communityMessagingRepository,
  eventRepository,
  notificationRepository,
  adminRepository,
};
