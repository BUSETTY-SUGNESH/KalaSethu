'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { getBuyerOrders } from "@/lib/services/order-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Order } from "@/app/types";
import { format } from "date-fns";

export default function OrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      if (!user) return;
      try {
        const result = await getBuyerOrders(user.id, 20);
        setOrders(result.data);
      } catch (error) {
        console.error("Failed to load orders", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrders();
  }, [user]);

  if (isLoading) {
    return (
      <div className="container" style={{ padding: "48px var(--margin-desktop)" }}>
        <h1 className="text-display-sm text-primary mb-32">Your Orders</h1>
        <div className="flex flex-col gap-24">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "48px var(--margin-desktop)" }}>
      <h1 className="text-display-sm text-primary" style={{ marginBottom: 32 }}>Your Orders</h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>
            receipt_long
          </span>
          <p className="text-body-lg text-on-surface-variant">You haven't placed any orders yet.</p>
          <Link href="/marketplace" className="btn btn-primary" style={{ marginTop: 24 }}>
            Explore Marketplace
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-24">
          {orders.map((order) => (
            <div key={order.id} className="bg-surface-container-lowest" style={{ borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)", overflow: "hidden" }}>
              <div className="bg-surface-container-low flex justify-between items-center" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.1)" }}>
                <div className="flex gap-48">
                  <div>
                    <span className="text-caption text-on-surface-variant block uppercase mb-4">Order Placed</span>
                    <span className="text-body-md font-bold">{format(new Date(order.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-caption text-on-surface-variant block uppercase mb-4">Total</span>
                    <span className="text-body-md font-bold">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-caption text-on-surface-variant block uppercase mb-4">Order ID</span>
                    <span className="text-body-md font-bold">{order.id}</span>
                  </div>
                </div>
                <Link href={`/dashboard/orders/${order.id}`} className="text-primary hover:underline font-bold flex items-center gap-4">
                  View Details <Icon name="arrow_forward" size={16} />
                </Link>
              </div>

              <div style={{ padding: 24 }}>
                <ul className="flex flex-col gap-24">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex gap-24">
                      <div style={{ width: 80, height: 80, borderRadius: "var(--radius-sm)", overflow: "hidden", flexShrink: 0 }}>
                        <img src={item.artworkImageUrl || "https://placehold.co/100x100"} alt={item.artworkTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div className="flex flex-col grow justify-center">
                        <Link href={`/artwork/${item.artworkId}`} className="text-headline-sm text-primary hover:underline">
                          {item.artworkTitle}
                        </Link>
                        <span className="text-body-md text-on-surface-variant mt-4">₹{item.price.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex flex-col items-end justify-center">
                        <span className={`status-pill ${order.status}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        {order.status === 'shipped' && order.trackingNumber && (
                          <span className="text-caption text-on-surface-variant mt-8">
                            Tracking: {order.trackingNumber}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
