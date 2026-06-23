'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import {
  getUserNotifications,
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/services/notification-service';
import type { Notification } from '@/app/types';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationPanel() {
  const { user } = useAuthStore();
  const { isNotificationPanelOpen, setNotificationPanelOpen, setUnreadNotificationCount } = useUIStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // Load initial notifications
    getUserNotifications(user.id, 20).then((res) => {
      setNotifications(res.data);
      const unread = res.data.filter((n: Notification) => !n.isRead).length;
      setUnreadNotificationCount(unread);
    });

    // Subscribe to new notifications
    const unsubscribe = subscribeToNotifications(user.id, (newNotifs) => {
      setNotifications(newNotifs);
      const unread = newNotifs.filter((n: Notification) => !n.isRead).length;
      setUnreadNotificationCount(unread);
    });

    return () => unsubscribe();
  }, [user, setUnreadNotificationCount]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Also check if they clicked the notification button (so we don't immediately reopen)
        const btn = document.getElementById('notification-btn');
        if (btn && btn.contains(event.target as Node)) return;
        
        setNotificationPanelOpen(false);
      }
    }

    if (isNotificationPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationPanelOpen, setNotificationPanelOpen]);

  if (!isNotificationPanelOpen || !user) return null;

  async function handleNotificationClick(notification: Notification) {
    if (user && !notification.isRead) {
      await markNotificationAsRead(user.id, notification.id);
    }
    setNotificationPanelOpen(false);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  }

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllNotificationsAsRead(user.id);
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'bid_placed':
      case 'bid_outbid':
      case 'auction_won':
        return 'gavel';
      case 'order_placed':
      case 'order_shipped':
      case 'order_delivered':
        return 'local_shipping';
      case 'new_comment':
      case 'new_like':
      case 'new_follower':
        return 'favorite';
      default:
        return 'notifications';
    }
  };

  return (
    <div className="notification-panel" ref={panelRef}>
      <div className="notification-panel-header">
        <h3 className="text-body-lg" style={{ fontWeight: 600 }}>Notifications</h3>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="text-caption text-primary hover:underline"
            style={{ fontWeight: 600 }}
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="notification-panel-body">
        {notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <span className="material-symbols-outlined empty-state-icon" style={{ width: 48, height: 48, fontSize: 24 }}>
              notifications_paused
            </span>
            <p className="text-body-sm text-on-surface-variant">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notif)}
              style={{ cursor: 'pointer' }}
            >
              <div
                className="trust-icon-wrap"
                style={{ width: 40, height: 40, fontSize: 20 }}
              >
                <span className="material-symbols-outlined">
                  {getIconForType(notif.type)}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <h4 className="text-body-sm" style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                  {notif.title}
                </h4>
                <p className="text-caption text-on-surface-variant" style={{ marginTop: 2 }}>
                  {notif.message}
                </p>
                <p className="text-caption" style={{ marginTop: 4, color: 'var(--color-primary)', opacity: 0.8 }}>
                  {(() => {
                    let d = new Date();
                    try {
                      if (notif.createdAt) {
                        d = typeof (notif.createdAt as any).toDate === 'function' 
                          ? (notif.createdAt as any).toDate() 
                          : new Date(notif.createdAt);
                        if (isNaN(d.getTime())) d = new Date();
                      }
                    } catch (e) {}
                    return formatDistanceToNow(d, { addSuffix: true });
                  })()}
                </p>
              </div>
              {!notif.isRead && <div className="notification-dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
