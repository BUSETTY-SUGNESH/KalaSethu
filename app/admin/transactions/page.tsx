'use client';

import { useState, useEffect } from "react";
import Icon from "@/app/components/ui/Icon";
import { getAllOrders } from "@/lib/services/order-service";
import type { Order } from "@/app/types";

export default function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      try {
        const res = await getAllOrders(100);
        setOrders(res.data || []);
      } catch (error) {
        console.error("Failed to load orders for transactions page", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTransactions();
  }, []);

  // Compute stats based on orders
  const totalVolume = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const platformFees = totalVolume * 0.05; // 5% platform fee
  const artistPayouts = totalVolume * 0.95; // 95% goes to artists

  return (
    <div className="flex flex-col gap-32">
      <div>
        <h1 className="text-display-sm text-primary mb-8">Transactions</h1>
        <p className="text-body-md text-on-surface-variant">Platform payments, payouts, and revenue overview.</p>
      </div>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-24">
          <div className="bg-surface-container-lowest p-24 rounded-lg border border-outline-variant">
            <span className="text-caption text-on-surface-variant uppercase">Total Volume</span>
            <h3 className="text-display-sm text-primary mt-8">₹{totalVolume.toLocaleString('en-IN')}</h3>
          </div>
          <div className="bg-surface-container-lowest p-24 rounded-lg border border-outline-variant">
            <span className="text-caption text-on-surface-variant uppercase">Platform Fees (5%)</span>
            <h3 className="text-display-sm text-primary mt-8">₹{platformFees.toLocaleString('en-IN')}</h3>
          </div>
          <div className="bg-surface-container-lowest p-24 rounded-lg border border-outline-variant">
            <span className="text-caption text-on-surface-variant uppercase">Artist Payouts</span>
            <h3 className="text-display-sm text-accent-emerald mt-8">₹{artistPayouts.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-16 mt-16">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Order ID</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Buyer</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Seller</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Amount</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Date</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map(o => (
                  <tr key={o.id} className="border-b border-outline-variant hover:bg-surface-container-low/20 transition-colors">
                    <td className="p-16 font-bold">{o.id.substring(0, 8)}...</td>
                    <td className="p-16">
                      <div className="font-bold text-primary">{o.buyerName}</div>
                      <div className="text-caption text-on-surface-variant">{o.buyerEmail}</div>
                    </td>
                    <td className="p-16 text-on-surface-variant">{o.sellerName}</td>
                    <td className="p-16 font-bold text-accent-emerald">
                      ₹{o.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-16 text-on-surface-variant">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-16">
                      <span className={`status-pill ${
                        o.status === 'delivered' ? 'completed' : 
                        o.status === 'cancelled' ? 'cancelled' : 'pending'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-32 text-center text-body-md text-on-surface-variant italic">
                    No orders/transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
