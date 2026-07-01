'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/app/components/ui/Icon';
import Button from '@/app/components/ui/Button';
import { ARTIST_NAV } from '@/lib/dashboard/nav-config';
import DashboardNavList from './DashboardNavList';

export default function ArtistSidebar() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar dashboard-sidebar--artist border-r border-outline-variant">
      <div className="dashboard-sidebar-brand">
        <div className="dashboard-sidebar-brand-icon dashboard-sidebar-brand-icon--artist">
          <Icon name="palette" size={22} />
        </div>
        <div>
          <p className="dashboard-sidebar-brand-title">Artist Studio</p>
          <p className="dashboard-sidebar-brand-sub">Manage your practice</p>
        </div>
      </div>
      <div className="dashboard-sidebar-cta">
        <Link href="/dashboard/artist/upload">
          <Button variant="primary" icon="add" iconPosition="left" fullWidth>
            Upload Artwork
          </Button>
        </Link>
      </div>
      <DashboardNavList items={ARTIST_NAV} pathname={pathname} />
    </aside>
  );
}
