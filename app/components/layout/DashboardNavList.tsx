'use client';

import Link from 'next/link';
import Icon from '@/app/components/ui/Icon';
import { useUIStore } from '@/lib/stores/ui-store';
import {
  isNavItemActive,
  type DashboardNavItem,
} from '@/lib/dashboard/nav-config';

type DashboardNavListProps = {
  items: DashboardNavItem[];
  pathname: string;
};

export default function DashboardNavList({ items, pathname }: DashboardNavListProps) {
  const { unreadMessageCount, unreadCommunityCount } = useUIStore();

  return (
    <nav className="flex flex-col gap-4 px-4" style={{ padding: '0 16px' }}>
      {items.map((item) => {
        const badgeCount =
          item.badge === 'dm'
            ? unreadMessageCount
            : item.badge === 'community'
              ? unreadCommunityCount
              : 0;
        const isActive = isNavItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${isActive ? 'active' : ''}`}
            style={{ position: 'relative' }}
            {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <Icon name={item.icon} size={20} />
            <span className="sidebar-item-label">{item.label}</span>
            {item.external && (
              <Icon name="open_in_new" size={14} className="sidebar-item-external" />
            )}
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
  );
}
