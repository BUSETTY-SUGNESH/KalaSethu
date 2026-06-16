'use client';

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";

const mockUsers = [
  { id: '1', name: 'Rajan Sthapati', email: 'rajan@example.com', role: 'verified_artist', joined: '2023-11-01', status: 'active' },
  { id: '2', name: 'Art Collector X', email: 'collector@example.com', role: 'collector', joined: '2023-12-15', status: 'active' },
  { id: '3', name: 'Spam User', email: 'spam@example.com', role: 'collector', joined: '2024-01-16', status: 'suspended' },
];

export default function UsersPage() {
  const [users, setUsers] = useState(mockUsers);

  function toggleStatus(id: string) {
    setUsers(users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'active' ? 'suspended' : 'active' };
      }
      return u;
    }));
  }

  return (
    <div className="flex flex-col gap-32">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-display-sm text-primary mb-8">User Management</h1>
          <p className="text-body-md text-on-surface-variant">Manage platform users, roles, and access.</p>
        </div>
        <div className="header-search">
          <Icon name="search" size={20} />
          <input type="text" placeholder="Search users by email..." />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">User</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Role</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Joined</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant">Status</th>
              <th className="p-16 text-label-sm uppercase text-on-surface-variant text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-outline-variant">
                <td className="p-16">
                  <div className="font-bold text-primary">{u.name}</div>
                  <div className="text-caption text-on-surface-variant">{u.email}</div>
                </td>
                <td className="p-16 capitalize">
                  {u.role.replace('_', ' ')}
                </td>
                <td className="p-16 text-on-surface-variant">{u.joined}</td>
                <td className="p-16">
                  <span className={`status-pill ${u.status === 'active' ? 'completed' : 'cancelled'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="p-16 text-right">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => toggleStatus(u.id)}
                  >
                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
