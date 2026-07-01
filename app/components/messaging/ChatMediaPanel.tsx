'use client';

import { useEffect } from 'react';
import Icon from '@/app/components/ui/Icon';
import type { Message } from '@/app/types';
import { format } from 'date-fns';

interface ChatMediaPanelProps {
  messages: Message[];
  onClose: () => void;
}

export default function ChatMediaPanel({ messages, onClose }: ChatMediaPanelProps) {
  const mediaMessages = messages.filter(
    (m) => !m.isDeleted && (m.type === 'image' || m.mediaUrl)
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="chat-header-panel chat-header-panel-media" role="dialog" aria-label="Media and files">
      <div className="chat-header-panel-bar">
        <Icon name="perm_media" size={20} className="text-on-surface-variant" />
        <span className="chat-header-panel-title">Media &amp; Files</span>
        <button type="button" className="chat-header-panel-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="chat-header-panel-body">
        {mediaMessages.length === 0 ? (
          <p className="chat-header-panel-hint">No media shared in this chat yet</p>
        ) : (
          <div className="chat-media-grid">
            {mediaMessages.map((msg) => (
              <a
                key={msg.id}
                href={msg.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="chat-media-grid-item"
                title={format(new Date(msg.createdAt), 'MMM d, yyyy')}
              >
                <img src={msg.mediaUrl} alt="" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
