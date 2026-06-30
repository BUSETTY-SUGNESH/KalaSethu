'use client';

import { useState, useEffect } from "react";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getAllOrders, updateOrderStatus } from "@/lib/services/order-service";
import { safeLogAdminAction } from "@/lib/utils/admin-audit";
import type { Order } from "@/app/types";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    loadDisputes();
  }, []);

  async function loadDisputes() {
    setIsLoading(true);
    try {
      // In a real app we query where status == 'disputed'.
      // For this implementation, we get all orders and filter them in memory,
      // or show a clean list if none exist.
      const res = await getAllOrders(100);
      const disputedOrders = (res.data || []).filter(o => o.status === 'refund_requested' || o.paymentStatus === 'refunded');
      setDisputes(disputedOrders);
    } catch (error) {
      console.error("Failed to load disputes", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResolve(orderId: string, action: 'refund' | 'dismiss') {
    if (!user) {
      addToast({ type: 'error', title: 'Error', message: 'Authentication required.' });
      return;
    }

    try {
      const nextStatus = action === 'refund' ? 'cancelled' : 'delivered';
      const note = action === 'refund'
        ? 'Dispute resolved: Order cancelled and refund initiated by administrator.'
        : 'Dispute resolved: Claim dismissed by administrator.';

      await updateOrderStatus(orderId, nextStatus, note, 'admin', {
        paymentStatus: action === 'refund' ? 'refunded' : 'completed'
      });

      await safeLogAdminAction(
        user.id,
        user.displayName,
        'resolve_dispute',
        orderId,
        'order',
        action === 'refund' ? 'Approved refund' : 'Dismissed dispute claim'
      );

      setDisputes(disputes.filter(d => d.id !== orderId));
      addToast({
        type: 'success',
        title: 'Dispute Resolved',
        message: action === 'refund' ? 'Order cancelled & refunded.' : 'Dispute claim dismissed.'
      });
    } catch (error: any) {
      console.error("Dispute resolution error", error);
      addToast({ type: 'error', title: 'Error', message: error.message || 'Action failed.' });
    }
  }

  return (
    <div className="flex flex-col gap-32">
      <div>
        <h1 className="text-display-sm text-primary mb-8">Dispute Resolution</h1>
        <p className="text-body-md text-on-surface-variant">Manage disputes, chargebacks, and refund claims submitted by buyers.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-16">
          {[1, 2].map(i => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-24">
          {disputes.length > 0 ? (
            disputes.map(order => (
              <div key={order.id} className="bg-surface-container-lowest p-24 rounded-lg border border-outline-variant hover:border-primary/20 transition-all flex flex-col md:flex-row justify-between gap-24">
                <div className="flex-1 flex flex-col gap-12">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-headline-sm text-primary">Dispute on Order #{order.id.substring(0, 8)}...</h3>
                      <span className="text-caption text-on-surface-variant">Opened {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <span className="status-pill cancelled">Disputed</span>
                  </div>

                  <div className="grid grid-cols-2 gap-16 text-body-md">
                    <div>
                      <span className="text-on-surface-variant block text-caption uppercase">Buyer</span>
                      <span className="font-bold">{order.buyerName}</span> ({order.buyerEmail})
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-caption uppercase">Seller</span>
                      <span className="font-bold">{order.sellerName}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-caption uppercase">Amount</span>
                      <span className="font-bold text-accent-terracotta">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-caption uppercase">Payment ID</span>
                      <span className="font-bold text-caption">{order.paymentId || 'N/A'}</span>
                    </div>
                  </div>
                  
                  {order.buyerNotes && (
                    <div className="bg-surface-container-low p-16 rounded mt-8">
                      <span className="text-caption text-on-surface-variant uppercase block mb-4">Buyer's Claim Details</span>
                      <p className="text-body-md italic">"{order.buyerNotes}"</p>
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col justify-center gap-16 flex-shrink-0" style={{ minWidth: 160 }}>
                  <Button 
                    variant="primary" 
                    fullWidth 
                    onClick={() => handleResolve(order.id, 'refund')}
                  >
                    Approve Refund
                  </Button>
                  <Button 
                    variant="outline" 
                    fullWidth 
                    onClick={() => handleResolve(order.id, 'dismiss')}
                  >
                    Dismiss Claim
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-surface-container-lowest p-48 text-center rounded-lg border border-outline-variant">
              <span className="material-symbols-outlined empty-state-icon text-primary/50" style={{ fontSize: 32 }}>support_agent</span>
              <h3 className="text-headline-sm text-primary mt-16">No Active Disputes</h3>
              <p className="text-body-md text-on-surface-variant mt-8">Hooray! There are no open disputes or payment claims pending review.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
