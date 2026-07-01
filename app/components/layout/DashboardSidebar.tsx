'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { resolveDashboardMode } from '@/lib/dashboard/nav-config';
import ArtistSidebar from './ArtistSidebar';
import CollectorSidebar from './CollectorSidebar';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { isArtist } = useAuthStore();
  const mode = resolveDashboardMode(pathname, isArtist());

  if (mode === 'artist') {
    return <ArtistSidebar />;
  }

  return <CollectorSidebar />;
}
