// ============================================================
// KalaSetu — Firestore Database Helpers
// ============================================================
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc as fbSetDoc,
  addDoc as fbAddDoc,
  updateDoc as fbUpdateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  runTransaction,
  type Firestore,
  type DocumentReference,
  type CollectionReference,
  type QueryConstraint,
  type DocumentData,
  type DocumentSnapshot,
  type QuerySnapshot,
  type Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { app } from './config';

// Initialize Firestore with IndexedDB local cache enabled
const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({ 
    tabManager: persistentMultipleTabManager() 
  })
});

// --- Typed Collection References ---
export const collections = {
  users: () => collection(db, 'users'),
  artworks: () => collection(db, 'artworks'),
  auctions: () => collection(db, 'auctions'),
  bids: () => collection(db, 'bids'),
  orders: () => collection(db, 'orders'),
  payments: () => collection(db, 'payments'),
  carts: () => collection(db, 'carts'),
  favorites: () => collection(db, 'favorites'),
  userCollections: () => collection(db, 'collections'),
  posts: () => collection(db, 'posts'),
  chatRooms: () => collection(db, 'chatRooms'),
  events: () => collection(db, 'events'),
  workshops: () => collection(db, 'workshops'),
  notifications: () => collection(db, 'notifications'),
  reports: () => collection(db, 'reports'),
  artistVerifications: () => collection(db, 'artistVerifications'),
  categories: () => collection(db, 'categories'),
  tags: () => collection(db, 'tags'),
  adminLogs: () => collection(db, 'adminLogs'),
  auditLogs: () => collection(db, 'auditLogs'),
  analytics: () => collection(db, 'analytics'),
  featureFlags: () => collection(db, 'featureFlags'),
  systemConfigs: () => collection(db, 'systemConfigs'),
} as const;

// --- Subcollection References ---
export const subcollections = {
  userFollowers: (userId: string) =>
    collection(db, 'users', userId, 'followers'),
  userFollowing: (userId: string) =>
    collection(db, 'users', userId, 'following'),
  userNotifications: (userId: string) =>
    collection(db, 'users', userId, 'notifications'),
  postComments: (postId: string) =>
    collection(db, 'posts', postId, 'comments'),
  postLikes: (postId: string) =>
    collection(db, 'posts', postId, 'likes'),
  chatMessages: (roomId: string) =>
    collection(db, 'chatRooms', roomId, 'messages'),
  eventRegistrations: (eventId: string) =>
    collection(db, 'events', eventId, 'registrations'),
  workshopEnrollments: (workshopId: string) =>
    collection(db, 'workshops', workshopId, 'enrollments'),
} as const;

// --- Document References ---
export const docRef = {
  user: (userId: string) => doc(db, 'users', userId),
  artwork: (artworkId: string) => doc(db, 'artworks', artworkId),
  auction: (auctionId: string) => doc(db, 'auctions', auctionId),
  bid: (bidId: string) => doc(db, 'bids', bidId),
  order: (orderId: string) => doc(db, 'orders', orderId),
  payment: (paymentId: string) => doc(db, 'payments', paymentId),
  cart: (userId: string) => doc(db, 'carts', userId),
  post: (postId: string) => doc(db, 'posts', postId),
  chatRoom: (roomId: string) => doc(db, 'chatRooms', roomId),
  event: (eventId: string) => doc(db, 'events', eventId),
  workshop: (workshopId: string) => doc(db, 'workshops', workshopId),
  notification: (notifId: string) => doc(db, 'notifications', notifId),
  report: (reportId: string) => doc(db, 'reports', reportId),
  verification: (verifId: string) => doc(db, 'artistVerifications', verifId),
  category: (catId: string) => doc(db, 'categories', catId),
} as const;

// --- Helper: Convert Firestore Timestamp to ISO string ---
export function timestampToISO(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return new Date().toISOString();
  return timestamp.toDate().toISOString();
}

// --- Helper: Paginated query ---
export interface PaginatedResult<T> {
  data: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export async function paginatedQuery<T>(
  collectionRef: CollectionReference,
  constraints: QueryConstraint[],
  pageSize: number,
  lastDocument?: DocumentSnapshot | null,
): Promise<PaginatedResult<T>> {
  const queryConstraints = [...constraints, limit(pageSize + 1)];

  if (lastDocument) {
    queryConstraints.push(startAfter(lastDocument));
  }

  const q = query(collectionRef, ...queryConstraints);
  const snapshot = await getDocs(q);

  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  return {
    data: docs.map((d) => ({ id: d.id, ...d.data() } as T)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

// --- Helper: Strip undefined values for Firestore ---
function isPlainObject(obj: any): boolean {
  return Object.prototype.toString.call(obj) === '[object Object]' &&
         (obj.constructor === Object || obj.constructor === undefined);
}

export function stripUndefined(obj: any): any {
  if (obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined).filter(v => v !== undefined);
  }
  if (isPlainObject(obj)) {
    return Object.keys(obj).reduce((acc, key) => {
      if (obj[key] !== undefined) {
        acc[key] = stripUndefined(obj[key]);
      }
      return acc;
    }, {} as any);
  }
  return obj; // Return FieldValues, Dates, Timestamps, primitives as-is
}

// --- Safe Wrappers ---
export function setDoc(reference: DocumentReference, data: any, options?: any) {
  return fbSetDoc(reference, stripUndefined(data), options);
}

export function addDoc(reference: CollectionReference, data: any) {
  return fbAddDoc(reference, stripUndefined(data));
}

export function updateDoc(reference: DocumentReference, data: any) {
  return fbUpdateDoc(reference, stripUndefined(data));
}

// Re-export commonly used Firestore utilities
export {
  db,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  runTransaction,
  Timestamp,
};
export type {
  DocumentReference,
  CollectionReference,
  QueryConstraint,
  DocumentData,
  DocumentSnapshot,
  QuerySnapshot,
  Unsubscribe,
};
