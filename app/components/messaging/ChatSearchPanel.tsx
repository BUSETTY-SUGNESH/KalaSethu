'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from '@/app/components/ui/Icon';
import { searchDmMessages } from '@/lib/services/messaging-service';
import type { Message } from '@/app/types';
import { format } from 'date-fns';

interface ChatSearchPanelProps {
  roomId: string;
  onClose: () => void;
  onSelectMessage?: (message: Message) => void;
}

export default function ChatSearchPanel({
  roomId,
  onClose,
  onSelectMessage,
}: ChatSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const found = await searchDmMessages(roomId, query.trim());
        setResults(found);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, roomId]);

  return (
    <div className="chat-header-panel" role="search">
      <div className="chat-header-panel-bar">
        <Icon name="search" size={20} className="text-on-surface-variant" />
        <input
          ref={inputRef}
          type="search"
          className="chat-header-panel-input"
          placeholder="Search in chat..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search messages"
        />
        <button type="button" className="chat-header-panel-close" onClick={onClose} aria-label="Close search">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="chat-header-panel-body">
        {isSearching && <p className="chat-header-panel-hint">Searching...</p>}
        {!isSearching && query.trim().length >= 2 && results.length === 0 && (
          <p className="chat-header-panel-hint">No messages found</p>
        )}
        {!isSearching && query.trim().length < 2 && (
          <p className="chat-header-panel-hint">Type at least 2 characters</p>
        )}
        <ul className="chat-header-panel-list">
          {results.map((msg) => (
            <li key={msg.id}>
              <button
                type="button"
                className="chat-header-panel-result"
                onClick={() => {
                  onSelectMessage?.(msg);
                  onClose();
                }}
              >
                <span className="chat-header-panel-result-text">{msg.content.slice(0, 120)}</span>
                <span className="chat-header-panel-result-meta">
                  {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
