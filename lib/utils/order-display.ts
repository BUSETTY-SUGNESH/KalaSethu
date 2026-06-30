import type { ShippingAddress } from '@/app/types';

type LegacyShippingAddress = ShippingAddress & {
  name?: string;
  address?: string;
};

export function getOrderStatusPillClass(status: string): string {
  switch (status) {
    case 'processing':
    case 'confirmed':
    case 'pending':
      return 'pending';
    case 'shipped':
    case 'delivered':
      return 'live';
    case 'completed':
      return 'completed';
    case 'cancelled':
    case 'refund_requested':
    case 'refunded':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function getPaymentStatusPillClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'failed':
    case 'refunded':
      return 'cancelled';
    case 'pending':
    default:
      return 'pending';
  }
}

/** Supports canonical Order schema and legacy checkout field names. */
export function formatOrderShippingAddress(
  shippingAddress: ShippingAddress | LegacyShippingAddress
): {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone?: string;
} {
  const legacy = shippingAddress as LegacyShippingAddress;
  return {
    fullName: legacy.fullName || legacy.name || '',
    addressLine1: legacy.addressLine1 || legacy.address || '',
    addressLine2: legacy.addressLine2,
    city: legacy.city || '',
    state: legacy.state || '',
    pincode: legacy.pincode || '',
    country: legacy.country || 'India',
    phone: legacy.phone,
  };
}

export { ARTWORK_PLACEHOLDER } from '@/lib/constants/placeholders';
