import type { ReactNode } from 'react';
import Link from 'next/link';
import Icon from '@/app/components/ui/Icon';
import Button from '@/app/components/ui/Button';

export type CollectorQuickLink = {
  href: string;
  icon: string;
  label: string;
  external?: boolean;
};

type CollectorSubpageHeroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  quickLinks?: CollectorQuickLink[];
  variant?: 'full' | 'compact';
};

export default function CollectorSubpageHero({
  eyebrow,
  title,
  description,
  actions,
  quickLinks,
  variant = 'full',
}: CollectorSubpageHeroProps) {
  const isCompact = variant === 'compact';

  return (
    <section
      className={`dashboard-sub-hero dashboard-sub-hero--collector ${isCompact ? 'dashboard-sub-hero--compact' : ''}`}
    >
      <div className="flex justify-between items-start flex-wrap gap-16">
        <div>
          <p className="text-label-md text-primary uppercase tracking-wider dashboard-sub-hero-eyebrow">
            {eyebrow}
          </p>
          <h1 className={isCompact ? 'text-headline-md text-primary' : 'text-headline-lg text-primary'}>
            {title}
          </h1>
          {description && (
            <p className="text-body-md text-on-surface-variant dashboard-sub-hero-description">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex gap-12 flex-wrap items-center">{actions}</div>}
      </div>
      {quickLinks && quickLinks.length > 0 && (
        <div className="dashboard-quick-actions">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              <Button variant="outline" size="sm" icon={link.icon}>
                {link.label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

type CollectorQuickLinkListProps = {
  title?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  links: CollectorQuickLink[];
};

export function CollectorQuickLinkList({
  title = 'Quick Links',
  viewAllHref,
  viewAllLabel,
  links,
}: CollectorQuickLinkListProps) {
  return (
    <div className="card dashboard-panel-card">
      <div className="dashboard-section-header">
        <h3 className="text-headline-sm text-primary">{title}</h3>
        {viewAllHref && viewAllLabel && (
          <Link href={viewAllHref} className="text-label-sm text-primary hover:underline uppercase">
            {viewAllLabel}
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-12">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="dashboard-quick-link-row"
            {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <Icon name={link.icon} size={22} className="text-primary" />
            <span className="text-body-md text-primary">{link.label}</span>
            <span className="dashboard-quick-link-chevron">
              <Icon name="chevron_right" size={18} className="text-on-surface-variant" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CollectorPageSkeleton({ metricCount = 4 }: { metricCount?: number }) {
  return (
    <div className="flex flex-col gap-32 collector-dashboard-page">
      <div className="skeleton dashboard-hero" style={{ height: 160 }} />
      <div className="dashboard-metric-grid">
        {Array.from({ length: metricCount }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-xl)' }} />
        ))}
      </div>
      <div className="skeleton dashboard-panel-card" style={{ height: 240 }} />
    </div>
  );
}
