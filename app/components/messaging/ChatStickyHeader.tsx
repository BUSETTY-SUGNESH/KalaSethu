'use client';

import Icon from '@/app/components/ui/Icon';
import PresenceBadge from './PresenceBadge';
import type { PresenceStatus } from '@/lib/services/presence-service';

interface ChatStickyHeaderProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  avatarFallback?: string;
  presenceStatus?: PresenceStatus;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export default function ChatStickyHeader({
  title,
  subtitle,
  avatarUrl,
  avatarFallback = '?',
  presenceStatus,
  showBack,
  onBack,
  actions,
  children,
}: ChatStickyHeaderProps) {
  return (
    <header className="chat-sticky-header">
      <div className="flex items-center gap-12 min-w-0">
        {showBack && (
          <button
            type="button"
            className="btn-ghost mobile-only"
            onClick={onBack}
            aria-label="Back to list"
          >
            <Icon name="arrow_back" />
          </button>
        )}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div className="avatar avatar-sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" />
            ) : (
              <span>{avatarFallback.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {presenceStatus && (
            <span style={{ position: 'absolute', bottom: -1, right: -1 }}>
              <PresenceBadge status={presenceStatus} size={8} />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-label-lg truncate">{title}</h2>
          {subtitle && (
            <p className="text-caption text-on-surface-variant truncate">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
      {actions && <div className="flex items-center gap-8 shrink-0">{actions}</div>}
    </header>
  );
}
