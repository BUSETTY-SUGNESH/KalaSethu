'use client';

import { useState, useEffect } from "react";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";

// Mock data since we haven't implemented the moderation service fully
const mockReportedItems = [
  { id: '1', type: 'artwork', title: 'Suspicious Antiquity Listing', reportedBy: 'User123', date: '2024-01-15', status: 'pending' },
  { id: '2', type: 'comment', title: 'Inappropriate language in CharchaSabha', reportedBy: 'Mod4', date: '2024-01-14', status: 'pending' },
  { id: '3', type: 'user', title: 'Fake Artist Profile', reportedBy: 'User890', date: '2024-01-12', status: 'resolved' },
];

export default function ModerationPage() {
  const [items, setItems] = useState(mockReportedItems);

  function handleAction(id: string, action: 'approve' | 'remove') {
    setItems(items.map(item => item.id === id ? { ...item, status: action === 'approve' ? 'resolved' : 'removed' } : item));
  }

  return (
    <div className="flex flex-col gap-32">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-display-sm text-primary mb-8">Content Moderation</h1>
          <p className="text-body-md text-on-surface-variant">Review reported artworks, comments, and user profiles.</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Type</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Issue / Title</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Reported By</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Date</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Status</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-outline-variant hover:bg-surface-container-lowest transition-colors">
                <td className="p-16 capitalize">
                  <span className={`px-2 py-1 rounded text-caption ${
                    item.type === 'artwork' ? 'bg-primary text-white' : 
                    item.type === 'comment' ? 'bg-accent-terracotta text-white' : 'bg-surface-container-high'
                  }`}>
                    {item.type}
                  </span>
                </td>
                <td className="p-16 font-bold text-primary">{item.title}</td>
                <td className="p-16 text-on-surface-variant">{item.reportedBy}</td>
                <td className="p-16 text-on-surface-variant">{item.date}</td>
                <td className="p-16">
                  <span className={`status-pill ${item.status}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-16">
                  {item.status === 'pending' && (
                    <div className="flex gap-8">
                      <Button variant="outline" size="sm" onClick={() => handleAction(item.id, 'approve')}>Dismiss</Button>
                      <Button variant="primary" size="sm" onClick={() => handleAction(item.id, 'remove')}>Remove</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
