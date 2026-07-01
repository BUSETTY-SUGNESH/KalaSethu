'use client';

import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import PresenceBadge from './PresenceBadge';
import type { PresenceStatus } from '@/lib/services/presence-service';

interface ConversationListItemProps {
  id: string;
  displayName: string;
  avatarUrl?: string;
  preview?: string;
  lastMessageAt?: string;
  isActive?: boolean;
  hasUnread?: boolean;
  unreadCount?: number;
  presenceStatus?: PresenceStatus;
  onClick: () => void;
}

function formatListTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

export default function ConversationListItem({
  displayName,
  avatarUrl,
  preview,
  lastMessageAt,
  isActive,
  hasUnread,
  unreadCount = 0,
  presenceStatus,
  onClick,
}: ConversationListItemProps) {
  const timeTitle = lastMessageAt
    ? formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })
    : undefined;

  return (
    <button
      type="button"
      className={`conversation-row w-full text-left ${isActive ? 'active' : ''} ${hasUnread ? 'unread' : ''}`}
      onClick={onClick}
      aria-current={isActive ? 'true' : undefined}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div className="avatar avatar-md">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            <span>{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        {presenceStatus && presenceStatus !== 'offline' && (
          <span style={{ position: 'absolute', bottom: 0, right: 0 }}>
            <PresenceBadge status={presenceStatus} size={10} />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-8">
          <span className={`conversation-row-name truncate text-body-md ${hasUnread ? 'text-primary' : ''}`}>
            {displayName}
          </span>
          {lastMessageAt && (
            <span className="text-caption shrink-0" title={timeTitle}>
              {formatListTime(lastMessageAt)}
            </span>
          )}
        </div>
        {preview && (
          <p className="conversation-row-preview" style={{ marginTop: 4 }}>
            {preview}
          </p>
        )}
      </div>
      {hasUnread && unreadCount > 0 && (
        <span className="conversation-unread-badge" aria-label={`${unreadCount} unread`}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {hasUnread && unreadCount <= 0 && <div className="notification-dot" />}
    </button>
  );
}
