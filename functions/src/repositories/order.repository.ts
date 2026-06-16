import { db } from '../config';
import * as admin from 'firebase-admin';
import type { Order } from '../types';

export const orderRepository = {
  async getOrder(orderId: string): Promise<Order | null> {
    const snap = await db.collection('orders').doc(orderId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Order;
  },

  async updateOrder(orderId: string, data: Partial<Order>): Promise<void> {
    await db.collection('orders').doc(orderId).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  },

  async createOrder(data: any): Promise<string> {
    const newOrderRef = db.collection('orders').doc();
    await newOrderRef.set({
      id: newOrderRef.id,
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return newOrderRef.id;
  }
};
