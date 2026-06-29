'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/app/components/ui/Icon';
import { useUIStore } from '@/lib/stores/ui-store';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: 'dm' | 'community';
}

const DASHBOARD_NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: 'dashboard' },
  { label: 'My Collection', href: '/dashboard/collector', icon: 'collections' },
  { label: 'Artist Studio', href: '/dashboard/artist', icon: 'palette' },
  { label: 'Sales Orders', href: '/dashboard/artist/orders', icon: 'local_shipping' },
  { label: 'Messages', href: '/dashboard/messages', icon: 'chat', badge: 'dm' },
  { label: 'Communities', href: '/dashboard/communities', icon: 'groups', badge: 'community' },
  { label: 'Active Bids', href: '/bids', icon: 'gavel' },
  { label: 'Saved Artworks', href: '/dashboard/saved', icon: 'favorite' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { unreadMessageCount, unreadCommunityCount } = useUIStore();

  return (
    <aside
      className="dashboard-sidebar border-r border-outline-variant"
      style={{ borderRight: '1px solid rgba(196, 199, 199, 0.2)' }}
    >
      <nav className="flex flex-col gap-8 px-4" style={{ padding: '0 16px' }}>
        {DASHBOARD_NAV.map((item) => {
          const badgeCount =
            item.badge === 'dm'
              ? unreadMessageCount
              : item.badge === 'community'
                ? unreadCommunityCount
                : 0;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              style={{ position: 'relative' }}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
              {badgeCount > 0 && (
                <span
                  className="notification-dot"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 8,
                    height: 8,
                    marginTop: 0,
                  }}
                  aria-label={`${badgeCount} unread`}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
