import { functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";

export interface CreateOrderItem {
  artworkId: string;
  quantity?: number;
}

export interface CreateOrderResponse {
  id: string;
  amount: number;
  currency: string;
  serverTotal: number;
}

export interface VerifyPaymentResponse {
  success: boolean;
  /** All created order IDs (one per seller) */
  orderIds?: string[];
  /** First order ID — preserved for single-seller backward compatibility */
  orderId?: string;
  error?: string;
  refunded?: boolean;
}

/** Checkout form shape passed to verifyPayment Cloud Function */
export interface VerifyPaymentShippingAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface VerifyPaymentOrderDetails {
  shippingAddress: VerifyPaymentShippingAddress;
}

/**
 * Calls the Cloud Function to create a new Razorpay order with server-validated items
 */
export const createOrder = async (
  items: CreateOrderItem[],
  shippingAddress: VerifyPaymentShippingAddress,
  amount?: number,
  currency: string = "INR"
): Promise<CreateOrderResponse> => {
  const createOrderFn = httpsCallable(functions, 'createOrder');
  const result = await createOrderFn({ items, shippingAddress, amount, currency });
  return result.data as CreateOrderResponse;
};

/**
 * Calls the Cloud Function to verify a completed Razorpay payment and save the order
 */
export const verifyPayment = async (
  razorpay_order_id: string, 
  razorpay_payment_id: string, 
  razorpay_signature: string,
  orderDetails: VerifyPaymentOrderDetails
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
