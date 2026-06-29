'use client';

import { format } from 'date-fns';
import MarkdownRenderer from './MarkdownRenderer';
import { ReadReceiptIcon } from './PresenceBadge';
import type { Message } from '@/app/types';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  avatarContent?: React.ReactNode;
  otherParticipantIds?: string[];
  currentUserId?: string;
  canModerate?: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onPin?: (message: Message) => void;
}

export default function MessageBubble({
  message,
  isOwn,
  showAvatar,
  avatarContent,
  otherParticipantIds = [],
  currentUserId,
  canModerate,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onPin,
}: MessageBubbleProps) {
  if (message.isDeleted) {
    return (
      <div className={`chat-message ${isOwn ? 'own' : ''}`} style={{ opacity: 0.6 }}>
        <div className="chat-bubble incoming" style={{ fontStyle: 'italic' }}>
          Message deleted
        </div>
      </div>
    );
  }

  const allOthersRead =
    isOwn &&
    otherParticipantIds.length > 0 &&
    otherParticipantIds.every((id) => message.readBy.includes(id));

  const reactions = message.reactions || {};

  return (
    <div className={`chat-message ${isOwn ? 'own' : ''}`} style={{ position: 'relative' }}>
      {!isOwn && (
        <div
          className="avatar avatar-sm"
          style={{
            visibility: showAvatar ? 'visible' : 'hidden',
            flexShrink: 0,
          }}
        >
          {avatarContent}
        </div>
      )}
      <div className={`chat-bubble ${isOwn ? 'outgoing' : 'incoming'}`}>
        {message.replyToPreview && (
          <div
            className="text-caption"
            style={{
              borderLeft: '3px solid var(--color-primary)',
              paddingLeft: 8,
              marginBottom: 8,
              opacity: 0.85,
            }}
          >
            {message.replyToPreview}
          </div>
        )}
        {message.type === 'image' && message.mediaUrl && (
          <img
            src={message.mediaUrl}
            alt=""
            style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8 }}
          />
        )}
        <MarkdownRenderer content={message.content} />
        <div
          className="text-caption"
          style={{
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            fontSize: 10,
            color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--color-on-surface-variant)',
          }}
        >
          {message.editedAt && <span style={{ marginRight: 6 }}>edited</span>}
          {format(new Date(message.createdAt), 'h:mm a')}
          <ReadReceiptIcon isRead={allOthersRead} isOwn={isOwn} />
        </div>
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-4" style={{ marginTop: 6 }}>
            {Object.entries(reactions).map(([emoji, userIds]) =>
              userIds.length > 0 ? (
                <button
                  key={emoji}
                  type="button"
                  className="text-caption"
                  style={{
                    background: 'var(--color-surface-container-high)',
                    borderRadius: 12,
                    padding: '2px 8px',
                    border: userIds.includes(currentUserId || '')
                      ? '1px solid var(--color-primary)'
                      : '1px solid transparent',
                  }}
                  onClick={() => onReact?.(message, emoji)}
                >
                  {emoji} {userIds.length}
                </button>
              ) : null
            )}
          </div>
        )}
        <div className="message-actions" style={{ display: 'none', gap: 4, marginTop: 4 }}>
          {onReply && (
            <button type="button" className="btn-ghost text-caption" onClick={() => onReply(message)}>
              Reply
            </button>
          )}
          {isOwn && onEdit && (
            <button type="button" className="btn-ghost text-caption" onClick={() => onEdit(message)}>
              Edit
            </button>
          )}
          {(isOwn || canModerate) && onDelete && (
            <button type="button" className="btn-ghost text-caption" onClick={() => onDelete(message)}>
              Delete
            </button>
          )}
          {canModerate && onPin && (
            <button type="button" className="btn-ghost text-caption" onClick={() => onPin(message)}>
              Pin
            </button>
          )}
          {onReact &&
            QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="btn-ghost"
                style={{ padding: 2 }}
                onClick={() => onReact(message, emoji)}
              >
                {emoji}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
