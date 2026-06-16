// ============================================================
// KalaSetu — Order Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { orderRepository } from '@/lib/repositories';
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEntry,
  ShippingAddress,
  CartItem,
  PaginatedResult,
} from '@/app/types';
import type { DocumentSnapshot } from '@/lib/firebase/firestore';

// --- Create Order from Cart ---
export async function createOrder(
  buyerId: string,
  buyerName: string,
  buyerEmail: string,
  items: CartItem[],
  shippingAddress: ShippingAddress,
  buyerNotes?: string
): Promise<string> {
  const now = new Date().toISOString();

  // Group items by seller
  const sellerGroups = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    if (!acc[item.artistId]) acc[item.artistId] = [];
    acc[item.artistId].push(item);
    return acc;
  }, {});

  // Create separate orders for each seller
  const orderIds: string[] = [];

  for (const [sellerId, sellerItems] of Object.entries(sellerGroups)) {
    const orderItems: OrderItem[] = sellerItems.map((item) => ({
      artworkId: item.artworkId,
      artworkTitle: item.artworkTitle,
      artworkImageUrl: item.artworkImageUrl,
      artistId: item.artistId,
      artistName: item.artistName,
      price: item.price,
      quantity: item.quantity,
    }));

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shippingCost = 0; // Free shipping for now
    const tax = 0; // To be calculated based on GST rules

    const order: Omit<Order, 'id'> = {
      buyerId,
      buyerName,
      buyerEmail,
      sellerId,
      sellerName: sellerItems[0].artistName,
      items: orderItems,
      subtotal,
      shippingCost,
      tax,
      totalAmount: subtotal + shippingCost + tax,
      currency: 'INR',
      shippingAddress,
      paymentStatus: 'pending',
      status: 'pending',
      statusHistory: [
        { status: 'pending', timestamp: now, note: 'Order placed' },
      ],
      buyerNotes,
      createdAt: now,
      updatedAt: now,
    };

    const id = await orderRepository.create(order);
    orderIds.push(id);
  }

  return orderIds.join(',');
}

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
  shippingProvider: string
): Promise<void> {
  return updateOrderStatus(orderId, 'shipped', 'Tracking number added', undefined, {
    trackingNumber,
    shippingProvider,
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
