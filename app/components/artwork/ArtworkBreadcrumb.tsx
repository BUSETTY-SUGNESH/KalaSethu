import Link from 'next/link';
import Icon from '@/app/components/ui/Icon';
import type { BreadcrumbSegment } from '@/lib/utils/artwork-breadcrumbs';

export default function ArtworkBreadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  return (
    <div className="breadcrumb">
      {segments.map((segment, index) => (
        <span key={`${segment.label}-${index}`} style={{ display: 'contents' }}>
          {index > 0 && <Icon name="chevron_right" size={16} />}
          {segment.href && index < segments.length - 1 ? (
            <Link href={segment.href}>{segment.label}</Link>
          ) : (
            <span className={index === segments.length - 1 ? 'current' : undefined}>
              {segment.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
