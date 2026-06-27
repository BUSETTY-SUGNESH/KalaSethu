import * as functions from "firebase-functions/v1";

import { db } from './config';
import { notificationRepository } from './repositories/notification.repository';

export const onOrderCreated = functions.region('asia-south1').firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const orderData = snap.data();
    const orderId = context.params.orderId;
    
    try {
      await notificationRepository.createNotification(orderData.buyerId, {
        title: "Order Confirmed",
        message: `Your order #${orderId} has been confirmed.`,
        type: "order_placed",
        isRead: false,
        actionUrl: `/dashboard/orders/${orderId}`
      });

      const sellerIds = new Set<string>(orderData.items.map((item: { artistId: string }) => item.artistId));
      
      const batch = db.batch();
      for (const sellerId of sellerIds) {
        await notificationRepository.batchCreateNotification(batch, sellerId, {
          title: "New Sale",
          message: `Congratulations! You have a new sale from order #${orderId}.`,
          type: "payment_received",
          isRead: false,
          actionUrl: `/dashboard/artist/orders`
        });
      }
      
      await batch.commit();
      console.log(`Successfully processed new order ${orderId}`);
      
    } catch (error) {
      console.error(`Failed to process new order ${orderId}`, error);
    }
  });

export const onOrderUpdated = functions.region('us-central1').firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    if (before.status === after.status) return;

    try {
      if (after.status === 'shipped') {
        const trackingNote = after.trackingNumber
          ? ` Tracking: ${after.trackingNumber}.`
          : '';
        await notificationRepository.createNotification(after.buyerId, {
          title: 'Order Shipped',
          message: `Your order #${orderId} has been shipped.${trackingNote}`,
          type: 'order_shipped',
          isRead: false,
          actionUrl: `/dashboard/orders/${orderId}`,
        });
      } else if (after.status === 'delivered') {
        await notificationRepository.createNotification(after.buyerId, {
          title: 'Order Delivered',
          message: `Your order #${orderId} has been delivered.`,
          type: 'order_delivered',
          isRead: false,
          actionUrl: `/dashboard/orders/${orderId}`,
        });
      }
    } catch (error) {
      console.error(`Failed to process order update ${orderId}`, error);
    }
  });
