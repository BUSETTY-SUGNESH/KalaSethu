'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/app/components/ui/Icon';
import Button from '@/app/components/ui/Button';
import { COLLECTOR_NAV } from '@/lib/dashboard/nav-config';
import DashboardNavList from './DashboardNavList';

export default function CollectorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar dashboard-sidebar--collector border-r border-outline-variant">
      <div className="dashboard-sidebar-brand">
        <div className="dashboard-sidebar-brand-icon dashboard-sidebar-brand-icon--collector">
          <Icon name="collections_bookmark" size={22} />
        </div>
        <div>
          <p className="dashboard-sidebar-brand-title">Collector</p>
          <p className="dashboard-sidebar-brand-sub">Your heritage collection</p>
        </div>
      </div>
      <div className="dashboard-sidebar-cta">
        <Link href="/explore">
          <Button variant="primary" icon="explore" iconPosition="left" fullWidth>
            Discover Art
          </Button>
        </Link>
      </div>
      <DashboardNavList items={COLLECTOR_NAV} pathname={pathname} />
    </aside>
  );
}
