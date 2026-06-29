'use client';

import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import type { Message } from '@/app/types';

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
      ref={scrollRef}
      className="flex-1 flex flex-col"
      style={{ overflowY: 'auto', padding: 24 }}
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
          const showAvatar =
            !isOwn && (i === 0 || messages[i - 1].senderId !== msg.senderId);
          return (
            <div
              key={msg.id}
              style={{
                marginBottom:
                  i < messages.length - 1 && messages[i + 1].senderId === msg.senderId ? 4 : 16,
              }}
              onMouseEnter={(e) => {
                const actions = e.currentTarget.querySelector('.message-actions') as HTMLElement;
                if (actions) actions.style.display = 'flex';
              }}
              onMouseLeave={(e) => {
                const actions = e.currentTarget.querySelector('.message-actions') as HTMLElement;
                if (actions) actions.style.display = 'none';
              }}
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
              />
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
