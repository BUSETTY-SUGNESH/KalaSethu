// ============================================================
// KalaSetu — Order Repository (Firestore Implementation)
// ============================================================
import {
  collections,
  docRef,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  paginatedQuery,
  type DocumentSnapshot,
} from '@/lib/firebase/firestore';
import { emptyPaginatedResult, isValidQueryString } from '@/lib/firebase/query-guards';
import type { Order, OrderStatus, PaginatedResult } from '@/app/types';

export const orderRepository = {
  async findById(id: string): Promise<Order | null> {
    const snap = await getDoc(docRef.order(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Order;
  },

  async create(data: Omit<Order, 'id'>): Promise<string> {
    const ref = await addDoc(collections.orders(), data);
    return ref.id;
  },

  async update(id: string, data: Partial<Order>): Promise<void> {
    await updateDoc(docRef.order(id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async findByBuyer(
    buyerId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Order>> {
    if (!isValidQueryString(buyerId)) return emptyPaginatedResult<Order>();
    return paginatedQuery<Order>(
      collections.orders(),
      [where('buyerId', '==', buyerId), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  async findBySeller(
    sellerId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Order>> {
    if (!isValidQueryString(sellerId)) return emptyPaginatedResult<Order>();
    return paginatedQuery<Order>(
      collections.orders(),
      [where('sellerId', '==', sellerId), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  async findAll(
    pageSize: number = 50,
    lastDoc?: DocumentSnapshot | null,
    statusFilter?: OrderStatus
  ): Promise<PaginatedResult<Order>> {
    const constraints = statusFilter
      ? [where('status', '==', statusFilter), orderBy('createdAt', 'desc')]
      : [orderBy('createdAt', 'desc')];
    return paginatedQuery<Order>(collections.orders(), constraints, pageSize, lastDoc);
  },
};
