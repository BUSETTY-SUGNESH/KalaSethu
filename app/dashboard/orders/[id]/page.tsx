"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import { getOrder, addTrackingInfo, updateOrderStatus } from "@/lib/services/order-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import type { Order } from "@/app/types";
import {
  ARTWORK_PLACEHOLDER,
  formatOrderShippingAddress,
  getOrderStatusPillClass,
  getPaymentStatusPillClass,
} from "@/lib/utils/order-display";

function toDate(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(value as string);
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const { addToast } = useUIStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingProvider, setShippingProvider] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadOrder() {
    if (isAuthLoading) return;
    if (!user) {
      router.push(`/login?redirect=/dashboard/orders/${orderId}`);
      return;
    }

    try {
      const data = await getOrder(orderId);
      if (data && data.buyerId !== user.id && data.sellerId !== user.id && user.role !== "admin") {
        setIsForbidden(true);
      } else {
        setOrder(data);
      }
    } catch (error) {
      console.error("Failed to load order", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [isAuthLoading, orderId, router, user]);

  async function handleMarkShipped(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !order) return;
    setIsSubmitting(true);
    try {
      await addTrackingInfo(order.id, trackingNumber, shippingProvider, user.id);
      addToast({ type: "success", title: "Order Shipped", message: "Tracking information has been saved." });
      setTrackingNumber("");
      setShippingProvider("");
      setIsLoading(true);
      await loadOrder();
    } catch (error) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: error instanceof Error ? error.message : "Could not mark order as shipped.",
      });
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  }

  async function handleMarkDelivered() {
    if (!user || !order) return;
    setIsSubmitting(true);
    try {
      await updateOrderStatus(order.id, "delivered", "Package delivered", user.id);
      addToast({ type: "success", title: "Order Delivered", message: "Order marked as delivered." });
      setIsLoading(true);
      await loadOrder();
    } catch (error) {
      addToast({
        type: "error",
        title: "Update Failed",
        message: error instanceof Error ? error.message : "Could not mark order as delivered.",
      });
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  }

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex flex-col gap-24">
        <div className="skeleton" style={{ height: 48, width: "40%" }} />
        <div className="skeleton" style={{ height: 280 }} />
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="empty-state">
        <Icon name="lock" size={40} className="empty-state-icon" />
        <h1 className="text-headline-md text-primary">Order Access Restricted</h1>
        <p className="text-body-md text-on-surface-variant">This order belongs to another account.</p>
        <Link href="/dashboard/orders">
          <Button variant="primary">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="empty-state">
        <Icon name="receipt_long" size={40} className="empty-state-icon" />
        <h1 className="text-headline-md text-primary">Order Not Found</h1>
        <p className="text-body-md text-on-surface-variant">The order may have been removed or is unavailable.</p>
        <Link href="/dashboard/orders">
          <Button variant="primary">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const createdAt = toDate(order.createdAt);
  const shipping = formatOrderShippingAddress(order.shippingAddress);
  const isSeller = user?.id === order.sellerId;
  const ordersListHref = isSeller ? "/dashboard/artist/orders" : "/dashboard/orders";

  return (
    <>
      <div className="breadcrumb" style={{ marginBottom: 24 }}>
        <Link href={ordersListHref}>{isSeller ? "Sales Orders" : "Orders"}</Link>
        <Icon name="chevron_right" size={16} />
        <span className="current">{order.id}</span>
      </div>

      <div className="flex justify-between items-start" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="text-headline-lg text-primary">Order Details</h1>
          <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
            Placed on {Number.isNaN(createdAt.getTime()) ? "recently" : format(createdAt, "MMMM d, yyyy")}
          </p>
        </div>
        <span className={`status-pill ${getOrderStatusPillClass(order.status)}`}>{order.status.replace("_", " ")}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
        <div className="flex flex-col gap-24">
          <div className="bg-surface-container-lowest" style={{ padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Items</h2>
            <div className="flex flex-col gap-24">
              {order.items.map((item) => (
                <div key={`${order.id}-${item.artworkId}`} className="flex gap-16">
                  <Link href={`/artwork/${item.artworkId}`} style={{ width: 88, height: 88, borderRadius: "var(--radius-md)", overflow: "hidden", flexShrink: 0, position: "relative", display: "block" }}>
                    <Image
                      src={item.artworkImageUrl || ARTWORK_PLACEHOLDER}
                      alt={item.artworkTitle}
                      fill
                      sizes="88px"
                      style={{ objectFit: "cover" }}
                    />
                  </Link>
                  <div className="grow">
                    <Link href={`/artwork/${item.artworkId}`} className="text-title-md text-primary hover:underline">
                      {item.artworkTitle}
                    </Link>
                    <p className="text-body-md text-on-surface-variant" style={{ marginTop: 4 }}>
                      by {item.artistName}
                    </p>
                    <p className="text-body-md text-primary" style={{ marginTop: 8 }}>
                      Qty {item.quantity} x Rs. {item.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest" style={{ padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Status History</h2>
            <div className="flex flex-col gap-12">
              {order.statusHistory.map((entry, index) => {
                const entryDate = toDate(entry.timestamp);
                return (
                  <div key={`${entry.status}-${index}`} className="flex justify-between gap-16" style={{ paddingBottom: 12, borderBottom: "1px solid rgba(196, 199, 199, 0.12)" }}>
                    <div>
                      <span className="text-label-md text-primary uppercase">{entry.status.replace("_", " ")}</span>
                      {entry.note && <p className="text-body-sm text-on-surface-variant">{entry.note}</p>}
                    </div>
                    <span className="text-caption text-on-surface-variant">
                      {Number.isNaN(entryDate.getTime()) ? "" : format(entryDate, "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-24">
          <div className="bg-surface-container-lowest" style={{ padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Summary</h2>
            <div className="flex flex-col gap-12 text-body-md">
              <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal</span><span>Rs. {order.subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Shipping</span><span>Rs. {order.shippingCost.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Tax</span><span>Rs. {order.tax.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-title-md" style={{ paddingTop: 12, borderTop: "1px solid rgba(196, 199, 199, 0.2)" }}>
                <span>Total</span><span>Rs. {order.totalAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Payment</span><span className={`status-pill ${getPaymentStatusPillClass(order.paymentStatus)}`}>{order.paymentStatus}</span></div>
            </div>
          </div>

          <div className="bg-surface-container-lowest" style={{ padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Shipping</h2>
            <p className="text-body-md text-on-surface">{shipping.fullName}</p>
            <p className="text-body-md text-on-surface-variant">
              {shipping.addressLine1}
              {shipping.addressLine2 ? `, ${shipping.addressLine2}` : ""}
              <br />
              {shipping.city}, {shipping.state} {shipping.pincode}
              <br />
              {shipping.country}
            </p>
            {order.trackingNumber && (
              <p className="text-body-md text-primary" style={{ marginTop: 16 }}>
                Tracking: {order.trackingNumber}
                {order.shippingProvider ? ` (${order.shippingProvider})` : ""}
              </p>
            )}
          </div>

          {isSeller && (order.status === "processing" || order.status === "shipped") && (
            <div className="bg-surface-container-lowest" style={{ padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
              <h2 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Fulfillment</h2>
              {order.status === "processing" ? (
                <form onSubmit={handleMarkShipped} className="flex flex-col gap-16">
                  <div>
                    <label className="text-label-md text-on-surface-variant block mb-4">Tracking Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-label-md text-on-surface-variant block mb-4">Shipping Provider</label>
                    <input
                      type="text"
                      className="form-input"
                      value={shippingProvider}
                      onChange={(e) => setShippingProvider(e.target.value)}
                      placeholder="e.g. Blue Dart, Delhivery"
                      required
                    />
                  </div>
                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Mark as Shipped"}
                  </Button>
                </form>
              ) : (
                <Button variant="primary" onClick={handleMarkDelivered} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Mark as Delivered"}
                </Button>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
