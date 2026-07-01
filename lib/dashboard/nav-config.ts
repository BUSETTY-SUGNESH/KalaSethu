export type DashboardNavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: 'dm' | 'community';
  external?: boolean;
};

export const COLLECTOR_NAV: DashboardNavItem[] = [
  { label: 'Home', href: '/dashboard', icon: 'home' },
  { label: 'My Collection', href: '/dashboard/collector', icon: 'collections' },
  { label: 'Wishlist', href: '/dashboard/saved', icon: 'favorite' },
  { label: 'Active Bids', href: '/dashboard/bids', icon: 'gavel' },
  { label: 'Orders', href: '/dashboard/orders', icon: 'receipt_long' },
  { label: 'Messages', href: '/dashboard/messages', icon: 'chat', badge: 'dm' },
  { label: 'Communities', href: '/dashboard/communities', icon: 'groups', badge: 'community' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
];

export const ARTIST_NAV: DashboardNavItem[] = [
  { label: 'Studio Home', href: '/dashboard/artist', icon: 'dashboard' },
  { label: 'Inventory', href: '/dashboard/artist/inventory', icon: 'inventory_2' },
  { label: 'Sales Orders', href: '/dashboard/artist/orders', icon: 'local_shipping' },
  { label: 'Auctions', href: '/dashboard/artist/auctions', icon: 'gavel' },
  { label: 'Events', href: '/events', icon: 'event', external: true },
  { label: 'Messages', href: '/dashboard/messages', icon: 'chat', badge: 'dm' },
  { label: 'Communities', href: '/dashboard/communities', icon: 'groups', badge: 'community' },
  { label: 'Analytics', href: '/dashboard/artist/analytics', icon: 'analytics' },
  { label: 'Verification', href: '/dashboard/artist/verify', icon: 'verified' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
];

export const COLLECTOR_ONLY_PREFIXES = [
  '/dashboard/collector',
  '/dashboard/saved',
  '/dashboard/orders',
  '/dashboard/bids',
] as const;

export function isCollectorOnlyPath(pathname: string): boolean {
  return COLLECTOR_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function resolveDashboardMode(
  pathname: string,
  isArtist: boolean
): 'collector' | 'artist' {
  if (pathname.startsWith('/dashboard/artist')) return 'artist';
  if (isCollectorOnlyPath(pathname)) return 'collector';
  if (isArtist) return 'artist';
  return 'collector';
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/dashboard' || href === '/dashboard/artist') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
