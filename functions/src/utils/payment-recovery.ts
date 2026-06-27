import Razorpay from 'razorpay';
import * as admin from 'firebase-admin';
import { db } from '../config';
import { notificationRepository } from '../repositories/notification.repository';

export interface FulfillmentFailureParams {
  razorpay: Razorpay;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  buyerId: string;
  amountPaise: number;
  reason: string;
}

export async function recordPaymentCapture(
  razorpayPaymentId: string,
  data: {
    razorpayOrderId: string;
    buyerId: string;
    amountPaise: number;
  }
): Promise<void> {
  await db.collection('paymentCaptures').doc(razorpayPaymentId).set(
    {
      razorpayOrderId: data.razorpayOrderId,
      buyerId: data.buyerId,
      amountPaise: data.amountPaise,
      status: 'pending',
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updatePaymentCaptureStatus(
  razorpayPaymentId: string,
  status: 'fulfilled' | 'refunded'
): Promise<void> {
  await db.collection('paymentCaptures').doc(razorpayPaymentId).set(
    { status, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

export async function issueFullRefund(
  razorpay: Razorpay,
  paymentId: string,
  amountPaise: number
): Promise<string> {
  const refund = await razorpay.payments.refund(paymentId, { amount: amountPaise });
  return refund.id;
}

export async function handleFulfillmentFailure(
  params: FulfillmentFailureParams
): Promise<{ refunded: boolean; refundId?: string; alreadyHandled?: boolean }> {
  const lockRef = db.collection('paymentLocks').doc(params.razorpayPaymentId);
  const existing = await lockRef.get();

  if (existing.exists) {
    const data = existing.data()!;
    if (data.status === 'refunded') {
      return { refunded: true, refundId: data.refundId as string | undefined, alreadyHandled: true };
    }
    const orderIds = (data.orderIds as string[] | undefined) || [];
    if (data.status === 'fulfilled' || orderIds.length > 0) {
      return { refunded: false, alreadyHandled: true };
    }
  }

  let refundId: string;
  try {
    refundId = await issueFullRefund(params.razorpay, params.razorpayPaymentId, params.amountPaise);
  } catch (error) {
    console.error('Razorpay refund failed', {
      paymentId: params.razorpayPaymentId,
      error,
    });
    throw error;
  }

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(lockRef);
    if (snap.exists) {
      const data = snap.data()!;
      if (data.status === 'refunded') return;
      const orderIds = (data.orderIds as string[] | undefined) || [];
      if (data.status === 'fulfilled' || orderIds.length > 0) return;
    }

    transaction.set(lockRef, {
      status: 'refunded',
      orderIds: [],
      refundId,
      reason: params.reason,
      razorpayOrderId: params.razorpayOrderId,
      buyerId: params.buyerId,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const sessionRef = db.collection('checkoutSessions').doc(params.razorpayOrderId);
    transaction.set(
      sessionRef,
      {
        status: 'failed',
        failureReason: params.reason,
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  await updatePaymentCaptureStatus(params.razorpayPaymentId, 'refunded');

  if (params.buyerId) {
    try {
      await notificationRepository.createNotification(params.buyerId, {
        title: 'Payment Refunded',
        message: `Your payment could not be completed and has been refunded. ${params.reason}`,
        type: 'system',
        isRead: false,
        actionUrl: '/dashboard/orders',
      });
    } catch (notifyError) {
      console.error('Failed to notify buyer of refund', notifyError);
    }
  }

  return { refunded: true, refundId };
}

export function isNonRetryableFulfillmentError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    return ['failed-precondition', 'invalid-argument', 'not-found', 'permission-denied'].includes(code);
  }
  return false;
}
