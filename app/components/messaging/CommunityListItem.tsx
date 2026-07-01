'use client';

import type { Community } from '@/app/types';

interface CommunityListItemProps {
  community: Community;
  isActive?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export default function CommunityListItem({
  community,
  isActive,
  unreadCount = 0,
  onClick,
}: CommunityListItemProps) {
  return (
    <button
      type="button"
      className={`community-server-btn ${isActive ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
      onClick={onClick}
      title={community.name}
      aria-label={community.name}
      aria-current={isActive ? 'true' : undefined}
    >
      {community.avatarUrl ? (
        <img src={community.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        community.name.charAt(0).toUpperCase()
      )}
    </button>
  );
}
