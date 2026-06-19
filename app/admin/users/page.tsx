'use client';

import { useState, useEffect } from "react";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getAllUsers, searchUsers, setUserBannedStatus } from "@/lib/services/user-service";
import type { User } from "@/app/types";
import { useUIStore } from "@/lib/stores/ui-store";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { addToast } = useUIStore();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);
    try {
      const res = await getAllUsers(50);
      setUsers(res.data || []);
    } catch (error) {
      console.error("Failed to load users", error);
      addToast({ type: 'error', title: 'Error', message: 'Could not load users list.' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.trim().length === 0) {
      loadUsers();
      return;
    }

    try {
      const results = await searchUsers(term);
      setUsers(results);
    } catch (error) {
      console.error("Search error", error);
    }
  }

  async function toggleStatus(uid: string, currentBannedStatus: boolean) {
    try {
      const nextStatus = !currentBannedStatus;
      await setUserBannedStatus(uid, nextStatus);
      
      setUsers(users.map(u => {
        if (u.id === uid) {
          return { ...u, isBanned: nextStatus };
        }
        return u;
      }));

      addToast({ 
        type: 'success', 
        title: nextStatus ? 'User Suspended' : 'User Activated', 
        message: `Account status updated successfully.` 
      });
    } catch (error) {
      console.error("Failed to update status", error);
      addToast({ type: 'error', title: 'Error', message: 'Could not update user status.' });
    }
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
          <input 
            type="text" 
            placeholder="Search users by name..." 
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-16">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">User</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Role</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant">Status</th>
                <th className="p-16 text-label-sm uppercase text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(u => (
                  <tr key={u.id} className="border-b border-outline-variant hover:bg-surface-container-low/20 transition-colors">
                    <td className="p-16">
                      <div className="font-bold text-primary">{u.displayName}</div>
                      <div className="text-caption text-on-surface-variant">{u.email}</div>
                    </td>
                    <td className="p-16 capitalize">
                      {u.role.replace('_', ' ')}
                    </td>
                    <td className="p-16">
                      <span className={`status-pill ${u.isBanned ? 'cancelled' : 'completed'}`}>
                        {u.isBanned ? 'suspended' : 'active'}
                      </span>
                    </td>
                    <td className="p-16 text-right">
                      <Button 
                        variant={u.isBanned ? "primary" : "outline"} 
                        size="sm" 
                        onClick={() => toggleStatus(u.id, !!u.isBanned)}
                      >
                        {u.isBanned ? 'Activate' : 'Suspend'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-32 text-center text-body-md text-on-surface-variant italic">
                    No users found.
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
