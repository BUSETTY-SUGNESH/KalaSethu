'use client';

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";

const mockTransactions = [
  { id: 'TRX-123', user: 'CollectorA', amount: 450000, date: '2024-01-16', status: 'completed' },
  { id: 'TRX-124', user: 'ArtisanB', amount: -20000, date: '2024-01-15', status: 'completed', note: 'Payout' },
  { id: 'TRX-125', user: 'CollectorC', amount: 15000, date: '2024-01-14', status: 'pending' },
];

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-32">
      <div>
        <h1 className="text-display-sm text-primary mb-8">Transactions</h1>
        <p className="text-body-md text-on-surface-variant">Platform payments, payouts, and revenue overview.</p>
      </div>

      <div className="grid grid-cols-3 gap-24">
        <div className="bg-surface-container-lowest p-24 rounded-lg border border-outline-variant">
          <span className="text-caption text-on-surface-variant uppercase">Total Volume</span>
          <h3 className="text-display-sm text-primary mt-8">₹12,45,000</h3>
        </div>
        <div className="bg-surface-container-lowest p-24 rounded-lg border border-outline-variant">
          <span className="text-caption text-on-surface-variant uppercase">Platform Fees</span>
          <h3 className="text-display-sm text-primary mt-8">₹62,250</h3>
        </div>
        <div className="bg-surface-container-lowest p-24 rounded-lg border border-outline-variant">
          <span className="text-caption text-on-surface-variant uppercase">Pending Payouts</span>
          <h3 className="text-display-sm text-status-urgency mt-8">₹4,20,000</h3>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">ID</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">User</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Amount</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Date</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockTransactions.map(trx => (
              <tr key={trx.id} className="border-b border-outline-variant">
                <td className="p-16 font-bold">{trx.id}</td>
                <td className="p-16">{trx.user} {trx.note && <span className="text-caption text-on-surface-variant">({trx.note})</span>}</td>
                <td className={`p-16 font-bold ${trx.amount > 0 ? 'text-accent-emerald' : 'text-status-urgency'}`}>
                  {trx.amount > 0 ? '+' : ''}₹{Math.abs(trx.amount).toLocaleString('en-IN')}
                </td>
                <td className="p-16 text-on-surface-variant">{trx.date}</td>
                <td className="p-16">
                  <span className={`status-pill ${trx.status}`}>
                    {trx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
