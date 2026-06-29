'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Button from '@/app/components/ui/Button';
import Icon from '@/app/components/ui/Icon';
import MarkdownRenderer from './MarkdownRenderer';
import type { Message } from '@/app/types';
import { setTypingDm, setTypingChannel } from '@/lib/services/presence-service';

interface MessageComposerProps {
  onSend: (content: string, replyTo?: Message | null) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  mentionSuggestions?: { id: string; label: string }[];
  typingContext?: {
    type: 'dm';
    roomId: string;
    userId: string;
  } | {
    type: 'channel';
    communityId: string;
    channelId: string;
    userId: string;
  };
}

export default function MessageComposer({
  onSend,
  disabled,
  placeholder = 'Type a message...',
  replyTo,
  onCancelReply,
  mentionSuggestions = [],
  typingContext,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifyTyping = useCallback(
    (isTyping: boolean) => {
      if (!typingContext) return;
      if (typingContext.type === 'dm') {
        void setTypingDm(typingContext.roomId, typingContext.userId, isTyping);
      } else {
        void setTypingChannel(
          typingContext.communityId,
          typingContext.channelId,
          typingContext.userId,
          isTyping
        );
      }
    },
    [typingContext]
  );

  const handleChange = (value: string) => {
    setContent(value);
    if (value.endsWith('@')) setShowMentions(true);
    else setShowMentions(false);

    notifyTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => notifyTyping(false), 3000);
  };

  useEffect(() => {
    return () => {
      notifyTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [notifyTyping]);

  const wrapSelection = (before: string, after: string = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const next =
      content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  };

  const insertMention = (label: string) => {
    setContent((c) => c.replace(/@$/, `@${label} `));
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isSending) return;
    setIsSending(true);
    try {
      await onSend(content.trim(), replyTo);
      setContent('');
      notifyTyping(false);
      onCancelReply?.();
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="chat-input-area flex-col" style={{ gap: 8 }}>
      {replyTo && (
        <div
          className="flex justify-between items-center w-full text-caption"
          style={{
            padding: '8px 12px',
            background: 'var(--color-surface-container-low)',
            borderRadius: 8,
          }}
        >
          <span>Replying to: {replyTo.replyToPreview || replyTo.content.slice(0, 60)}</span>
          <button type="button" className="btn-ghost" onClick={onCancelReply} aria-label="Cancel reply">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <div className="flex gap-4 items-center w-full flex-wrap">
        <button type="button" className="btn-ghost" title="Bold" onClick={() => wrapSelection('**')}>
          <Icon name="format_bold" size={18} />
        </button>
        <button type="button" className="btn-ghost" title="Italic" onClick={() => wrapSelection('_')}>
          <Icon name="format_italic" size={18} />
        </button>
        <button type="button" className="btn-ghost" title="Strikethrough" onClick={() => wrapSelection('~~')}>
          <Icon name="strikethrough_s" size={18} />
        </button>
        <button type="button" className="btn-ghost" title="Code" onClick={() => wrapSelection('`')}>
          <Icon name="code" size={18} />
        </button>
        <button
          type="button"
          className="btn-ghost"
          title="Quote"
          onClick={() => wrapSelection('> ', '')}
        >
          <Icon name="format_quote" size={18} />
        </button>
        <button
          type="button"
          className={`btn-ghost ${showPreview ? 'text-primary' : ''}`}
          title="Preview"
          onClick={() => setShowPreview((p) => !p)}
        >
          <Icon name="visibility" size={18} />
        </button>
      </div>

      {showMentions && mentionSuggestions.length > 0 && (
        <div
          className="bg-surface-container-lowest"
          style={{
            border: '1px solid rgba(196,199,199,0.2)',
            borderRadius: 8,
            maxHeight: 120,
            overflowY: 'auto',
          }}
        >
          {mentionSuggestions.slice(0, 8).map((m) => (
            <button
              key={m.id}
              type="button"
              className="block w-full text-left text-body-sm"
              style={{ padding: '8px 12px' }}
              onClick={() => insertMention(m.label)}
            >
              @{m.label}
            </button>
          ))}
        </div>
      )}

      {showPreview && content.trim() && (
        <div
          className="w-full"
          style={{
            padding: 12,
            background: 'var(--color-surface-container-low)',
            borderRadius: 8,
          }}
        >
          <MarkdownRenderer content={content} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex gap-12 w-full">
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder={placeholder}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled || isSending}
          rows={1}
          style={{ resize: 'none', minHeight: 44 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(e);
            }
          }}
        />
        <Button
          variant="primary"
          type="submit"
          disabled={!content.trim() || isSending || disabled}
          icon="send"
          style={{ padding: '0 20px', alignSelf: 'flex-end' }}
        >
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
