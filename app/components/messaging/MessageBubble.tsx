'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Icon from '@/app/components/ui/Icon';
import MarkdownRenderer from './MarkdownRenderer';
import SystemAnnouncement from './SystemAnnouncement';
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
  groupedTight?: boolean;
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
  groupedTight,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [menuOpen, closeMenu]);

  if (message.type === 'system') {
    return <SystemAnnouncement message={message} />;
  }

  if (message.isDeleted) {
    return (
      <div className={`chat-message ${isOwn ? 'own' : ''}`}>
        <div className="chat-bubble incoming chat-bubble-deleted">
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
  const reactionEntries = Object.entries(reactions).filter(([, userIds]) => userIds.length > 0);
  const hasMenuActions =
    onReply ||
    onEdit ||
    onDelete ||
    onPin ||
    onReact;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      // clipboard unavailable — silent fail
    }
    closeMenu();
  }

  function runAction(action: () => void) {
    action();
    closeMenu();
  }

  return (
    <div
      className={`chat-message ${isOwn ? 'own' : ''} ${groupedTight ? 'grouped-tight' : ''}`}
    >
      {!isOwn && (
        <div
          className="avatar avatar-sm chat-message-avatar"
          style={{ visibility: showAvatar ? 'visible' : 'hidden' }}
          aria-hidden={!showAvatar}
        >
          {avatarContent}
        </div>
      )}

      <div className="chat-message-column">
        <div className="chat-message-row">
          <div className={`chat-bubble ${isOwn ? 'outgoing' : 'incoming'}`}>
            {message.replyToPreview && (
              <div className="chat-bubble-reply">{message.replyToPreview}</div>
            )}
            {message.type === 'image' && message.mediaUrl && (
              <img
                src={message.mediaUrl}
                alt=""
                className="chat-bubble-image"
              />
            )}
            <div className="chat-bubble-body">
              <div className="chat-bubble-text">
                <MarkdownRenderer content={message.content} />
              </div>
              <div className="chat-bubble-meta">
                {message.editedAt && <span className="chat-bubble-edited">edited</span>}
                <time dateTime={message.createdAt}>
                  {format(new Date(message.createdAt), 'h:mm a')}
                </time>
                <ReadReceiptIcon isRead={allOthersRead} isOwn={isOwn} />
              </div>
            </div>
          </div>

          {hasMenuActions && (
            <div
              ref={toolbarRef}
              className={`chat-message-toolbar ${menuOpen ? 'is-open' : ''}`}
            >
              <button
                type="button"
                className="chat-message-menu-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
                aria-label="Message options"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <Icon name="more_vert" size={18} />
              </button>

              {menuOpen && (
                <div className="chat-message-menu" role="menu">
                  {onReact && (
                    <div className="chat-message-menu-reactions" role="group" aria-label="React">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="chat-message-menu-emoji"
                          role="menuitem"
                          onClick={() => runAction(() => onReact(message, emoji))}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  {onReply && (
                    <button
                      type="button"
                      className="chat-message-menu-item"
                      role="menuitem"
                      onClick={() => runAction(() => onReply(message))}
                    >
                      <Icon name="reply" size={16} />
                      Reply
                    </button>
                  )}
                  <button
                    type="button"
                    className="chat-message-menu-item"
                    role="menuitem"
                    onClick={() => void handleCopy()}
                  >
                    <Icon name="content_copy" size={16} />
                    Copy
                  </button>
                  {isOwn && onEdit && (
                    <button
                      type="button"
                      className="chat-message-menu-item"
                      role="menuitem"
                      onClick={() => runAction(() => onEdit(message))}
                    >
                      <Icon name="edit" size={16} />
                      Edit
                    </button>
                  )}
                  {(isOwn || canModerate) && onDelete && (
                    <button
                      type="button"
                      className="chat-message-menu-item chat-message-menu-item-danger"
                      role="menuitem"
                      onClick={() => runAction(() => onDelete(message))}
                    >
                      <Icon name="delete" size={16} />
                      Delete
                    </button>
                  )}
                  {canModerate && onPin && (
                    <button
                      type="button"
                      className="chat-message-menu-item"
                      role="menuitem"
                      onClick={() => runAction(() => onPin(message))}
                    >
                      <Icon name="push_pin" size={16} />
                      Pin
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {reactionEntries.length > 0 && (
          <div className="chat-reaction-chips" aria-label="Reactions">
            {reactionEntries.map(([emoji, userIds]) => (
              <button
                key={emoji}
                type="button"
                className={`chat-reaction-chip ${userIds.includes(currentUserId || '') ? 'is-mine' : ''}`}
                onClick={() => onReact?.(message, emoji)}
              >
                <span className="chat-reaction-chip-emoji">{emoji}</span>
                <span className="chat-reaction-chip-count">{userIds.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
