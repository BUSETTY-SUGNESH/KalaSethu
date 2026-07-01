'use client';

import { format, isToday, isYesterday } from 'date-fns';

interface MessageDateSeparatorProps {
  date: Date;
}

export function formatMessageDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

export default function MessageDateSeparator({ date }: MessageDateSeparatorProps) {
  return (
    <div className="message-date-separator" role="separator">
      <span>{formatMessageDateLabel(date)}</span>
    </div>
  );
}
