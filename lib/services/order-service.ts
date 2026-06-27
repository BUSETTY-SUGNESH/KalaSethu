// ============================================================
// KalaSetu — Order Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { orderRepository } from '@/lib/repositories';
import type {
  Order,
  OrderStatus,
  OrderStatusEntry,
  PaginatedResult,
} from '@/app/types';
import type { DocumentSnapshot } from '@/lib/firebase/firestore';

// --- Get Single Order ---
export async function getOrder(orderId: string): Promise<Order | null> {
  return orderRepository.findById(orderId);
}

// --- Get Buyer Orders ---
export async function getBuyerOrders(
  buyerId: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Order>> {
  return orderRepository.findByBuyer(buyerId, pageSize, lastDoc);
}

// --- Get Seller Orders ---
export async function getSellerOrders(
  sellerId: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Order>> {
  return orderRepository.findBySeller(sellerId, pageSize, lastDoc);
}

// --- Update Order Status ---
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
  updatedBy?: string,
  additionalData?: Record<string, unknown>
): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error('Order not found');

  if (status === 'delivered' && order.status !== 'shipped') {
    throw new Error('Order must be shipped before marking as delivered');
  }

  const newEntry: OrderStatusEntry = {
    status,
    timestamp: new Date().toISOString(),
    note,
    updatedBy,
  };

  await orderRepository.update(orderId, {
    status,
    statusHistory: [...order.statusHistory, newEntry],
    ...additionalData,
  });
}

// --- Add Tracking Info ---
export async function addTrackingInfo(
  orderId: string,
  trackingNumber: string,
  shippingProvider: string,
  updatedBy?: string
): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error('Order not found');
  if (order.status !== 'processing') {
    throw new Error('Only processing orders can be marked as shipped');
  }
  if (!trackingNumber.trim() || !shippingProvider.trim()) {
    throw new Error('Tracking number and shipping provider are required');
  }

  return updateOrderStatus(orderId, 'shipped', 'Tracking number added', updatedBy, {
    trackingNumber: trackingNumber.trim(),
    shippingProvider: shippingProvider.trim(),
  });
}

// --- Get All Orders (Admin) ---
export async function getAllOrders(
  pageSize: number = 50,
  lastDoc?: DocumentSnapshot | null,
  statusFilter?: OrderStatus
): Promise<PaginatedResult<Order>> {
  return orderRepository.findAll(pageSize, lastDoc, statusFilter);
}
