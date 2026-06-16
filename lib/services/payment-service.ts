import { functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";

export interface CreateOrderResponse {
  id: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  orderId?: string;
  error?: string;
}

/**
 * Calls the Cloud Function to create a new Razorpay order
 */
export const createOrder = async (amount: number, currency: string = "INR"): Promise<CreateOrderResponse> => {
  const createOrderFn = httpsCallable(functions, 'createOrder');
  const result = await createOrderFn({ amount, currency });
  return result.data as CreateOrderResponse;
};

/**
 * Calls the Cloud Function to verify a completed Razorpay payment and save the order
 */
export const verifyPayment = async (
  razorpay_order_id: string, 
  razorpay_payment_id: string, 
  razorpay_signature: string,
  orderDetails: any
): Promise<VerifyPaymentResponse> => {
  const verifyPaymentFn = httpsCallable(functions, 'verifyPayment');
  const result = await verifyPaymentFn({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderDetails
  });
  return result.data as VerifyPaymentResponse;
};
