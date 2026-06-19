import * as functions from "firebase-functions/v1";


import { db } from './config';
import { notificationRepository } from './repositories/notification.repository';

export const onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const orderData = snap.data();
    const orderId = context.params.orderId;
    
    try {
      // Create notification for the buyer
      await notificationRepository.createNotification(orderData.buyerId, {
        title: "Order Confirmed",
        message: `Your order #${orderId} has been confirmed.`,
        type: "order_update",
        isRead: false,
        actionUrl: `/dashboard/orders/${orderId}`
      });

      // Notify sellers (extract artistIds from items)
      const sellerIds = new Set<string>(orderData.items.map((item: any) => item.artistId as string));
      
      const batch = db.batch();
      for (const sellerId of sellerIds) {
        await notificationRepository.batchCreateNotification(batch, sellerId, {
          title: "New Sale",
          message: `Congratulations! You have a new sale from order #${orderId}.`,
          type: "system",
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
