'use client';

import { useEffect, useRef } from 'react';
import { isSameDay } from 'date-fns';
import MessageBubble from './MessageBubble';
import MessageDateSeparator from './MessageDateSeparator';
import type { Message } from '@/app/types';

const GROUP_WINDOW_MS = 2 * 60 * 1000;

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  otherParticipantIds?: string[];
  getAvatar?: (senderId: string) => React.ReactNode;
  canModerate?: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onPin?: (message: Message) => void;
  emptyState?: React.ReactNode;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

function isGroupedTight(prev: Message | undefined, curr: Message): boolean {
  if (!prev || prev.senderId !== curr.senderId || prev.type === 'system' || curr.type === 'system') {
    return false;
  }
  const prevTime = new Date(prev.createdAt).getTime();
  const currTime = new Date(curr.createdAt).getTime();
  return currTime - prevTime < GROUP_WINDOW_MS;
}

export default function MessageList({
  messages,
  currentUserId,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  otherParticipantIds = [],
  getAvatar,
  canModerate,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onPin,
  emptyState,
  scrollRef,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = scrollRef ?? internalRef;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, containerRef]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-on-surface-variant">Loading messages...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        {emptyState || <p className="text-on-surface-variant">No messages yet</p>}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col"
      style={{ overflowY: 'auto', padding: 24, scrollBehavior: 'smooth' }}
      role="log"
      aria-live="polite"
    >
      <div className="flex flex-col mt-auto">
        {hasMore && onLoadMore && (
          <div className="text-center mb-16">
            <button
              type="button"
              className="text-body-sm text-primary hover:underline"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading...' : 'Load earlier messages'}
            </button>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.senderId === currentUserId;
          const prev = messages[i - 1];
          const prevDate = prev ? new Date(prev.createdAt) : null;
          const currDate = new Date(msg.createdAt);
          const showDateSeparator = !prevDate || !isSameDay(prevDate, currDate);
          const showAvatar =
            !isOwn && (i === 0 || messages[i - 1].senderId !== msg.senderId || messages[i - 1].type === 'system');
          const groupedTight = isGroupedTight(prev, msg);
          const nextSameSender = i < messages.length - 1 && messages[i + 1].senderId === msg.senderId;

          return (
            <div key={msg.id}>
              {showDateSeparator && <MessageDateSeparator date={currDate} />}
              <div
                className={`chat-message-wrap ${groupedTight ? 'is-grouped' : ''} ${nextSameSender ? 'has-follow-up' : ''}`}
              >
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  avatarContent={getAvatar?.(msg.senderId)}
                  otherParticipantIds={otherParticipantIds}
                  currentUserId={currentUserId}
                  canModerate={canModerate}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                  onPin={onPin}
                  groupedTight={groupedTight}
                />
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
