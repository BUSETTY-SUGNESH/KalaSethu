'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import type { Message } from '@/app/types';

interface SystemAnnouncementProps {
  message: Message;
}

/** Extract first markdown link from content if actionUrl not on message */
function extractLink(content: string): string | null {
  const match = content.match(/\[([^\]]+)\]\(([^)]+)\)/);
  return match?.[2] ?? null;
}

export default function SystemAnnouncement({ message }: SystemAnnouncementProps) {
  const actionUrl = (message as Message & { actionUrl?: string }).actionUrl;
  const href =
    actionUrl ??
    (message.artworkId
      ? `/artwork/${message.artworkId}`
      : (message as Message & { eventId?: string }).eventId
        ? `/events/${(message as Message & { eventId?: string }).eventId}`
        : extractLink(message.content));

  const plainBody = message.content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  return (
    <div className="system-announcement" role="article">
      <div className="system-announcement-title">{message.senderName}</div>
      <div className="system-announcement-body">{plainBody}</div>
      {href && (
        <div style={{ marginTop: 10 }}>
          <Link href={href}>View details</Link>
        </div>
      )}
      <div className="text-caption" style={{ marginTop: 8, opacity: 0.7 }}>
        {format(new Date(message.createdAt), 'h:mm a')}
      </div>
    </div>
  );
}
