/** Fixed homepage hero — brand Nataraja identity, not driven by artwork data. */
export const HOME_HERO = {
  badge: 'Heritage Spotlight',
  title: 'Discover Authentic Indian Art',
  description:
    'KalaSetu is a living bridge between India’s master artisans and collectors worldwide — preserving heritage through verified artists, authenticated provenance, curated marketplace listings, and live auctions that keep traditional art forms thriving.',
  ctaHref: '/marketplace',
  ctaLabel: 'View Masterpiece',
  imageSrc: '/hero.png',
  imageAlt: 'Bronze Nataraja sculpture — Indian heritage art',
  trustItems: [
    { icon: 'verified', label: 'Verified Artists' },
    { icon: 'history_edu', label: 'Authentic Provenance' },
    { icon: 'lock', label: 'Secure Payments' },
    { icon: 'gavel', label: 'Live Auctions' },
  ],
} as const;
