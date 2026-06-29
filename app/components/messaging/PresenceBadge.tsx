'use client';

import Icon from '@/app/components/ui/Icon';
import type { PresenceStatus } from '@/lib/services/presence-service';

interface PresenceBadgeProps {
  status: PresenceStatus;
  size?: number;
}

export default function PresenceBadge({ status, size = 10 }: PresenceBadgeProps) {
  const color =
    status === 'online' ? 'var(--color-success, #22c55e)' :
    status === 'idle' ? 'var(--color-warning, #eab308)' :
    'var(--color-outline)';

  return (
    <span
      aria-label={`Status: ${status}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        border: '2px solid var(--color-surface-container-lowest)',
        flexShrink: 0,
      }}
    />
  );
}

export function ReadReceiptIcon({
  isRead,
  isOwn,
}: {
  isRead: boolean;
  isOwn: boolean;
}) {
  if (!isOwn) return null;
  return (
    <span style={{ marginLeft: 4, opacity: isRead ? 1 : 0.7, display: 'inline-flex' }}>
      <Icon name={isRead ? 'done_all' : 'done'} size={14} />
    </span>
  );
}
