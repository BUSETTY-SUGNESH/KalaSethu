"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import { getOrder } from "@/lib/services/order-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Order } from "@/app/types";

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
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
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

    loadOrder();
  }, [isAuthLoading, orderId, router, user]);

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

  return (
    <>
      <div className="breadcrumb" style={{ marginBottom: 24 }}>
        <Link href="/dashboard/orders">Orders</Link>
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
        <span className={`status-pill ${order.status}`}>{order.status.replace("_", " ")}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
        <div className="flex flex-col gap-24">
          <div className="bg-surface-container-lowest" style={{ padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Items</h2>
            <div className="flex flex-col gap-24">
              {order.items.map((item) => (
                <div key={`${order.id}-${item.artworkId}`} className="flex gap-16">
                  <Link href={`/artwork/${item.artworkId}`} style={{ width: 88, height: 88, borderRadius: "var(--radius-md)", overflow: "hidden", flexShrink: 0 }}>
                    <img src={item.artworkImageUrl || "https://placehold.co/160x160"} alt={item.artworkTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
              <div className="flex justify-between"><span className="text-on-surface-variant">Payment</span><span className={`status-pill ${order.paymentStatus}`}>{order.paymentStatus}</span></div>
            </div>
          </div>

          <div className="bg-surface-container-lowest" style={{ padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Shipping</h2>
            <p className="text-body-md text-on-surface">{order.shippingAddress.fullName}</p>
            <p className="text-body-md text-on-surface-variant">
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
              <br />
              {order.shippingAddress.country}
            </p>
            {order.trackingNumber && (
              <p className="text-body-md text-primary" style={{ marginTop: 16 }}>
                Tracking: {order.trackingNumber}
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
