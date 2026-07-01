'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Icon from '@/app/components/ui/Icon';

export interface ChatHeaderMenuItem {
  id: string;
  label: string;
  icon: string;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  active?: boolean;
  disabled?: boolean;
}

export interface ChatHeaderMenuSection {
  id: string;
  items: ChatHeaderMenuItem[];
  destructive?: boolean;
}

interface ChatHeaderContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  sections: ChatHeaderMenuSection[];
}

export default function ChatHeaderContextMenu({
  isOpen,
  onClose,
  triggerRef,
  sections,
}: ChatHeaderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0, flipUp: false });
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const flatItems = sections.flatMap((s) => s.items.filter((i) => !i.disabled));

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < menuHeight + 16 && rect.top > menuHeight + 16;
    setPosition({
      top: flipUp ? rect.top - menuHeight - 8 : rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
      flipUp,
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [isOpen, updatePosition, sections]);

  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
      return;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => (i + 1) % flatItems.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => (i <= 0 ? flatItems.length - 1 : i - 1));
      }
      if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        flatItems[focusedIndex]?.onClick?.();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, flatItems, focusedIndex, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, onClose, triggerRef]);

  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return;
    const el = menuRef.current?.querySelector(
      `[data-menu-index="${focusedIndex}"]`
    ) as HTMLElement | null;
    el?.focus();
  }, [focusedIndex, isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  let itemIndex = 0;

  return createPortal(
    <>
      <div className="chat-header-menu-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={menuRef}
        className={`chat-header-context-menu ${position.flipUp ? 'flip-up' : ''}`}
        role="menu"
        aria-label="Chat options"
        style={{
          position: 'fixed',
          top: position.top,
          right: position.right,
          zIndex: 1000,
        }}
      >
        {sections.map((section, si) => (
          <div
            key={section.id}
            className={`chat-header-menu-section ${section.destructive ? 'is-destructive' : ''}`}
            role="presentation"
          >
            {si > 0 && <div className="chat-header-menu-divider" role="separator" />}
            {section.items.map((item) => {
              if (item.disabled) return null;
              const idx = itemIndex++;
              const content = (
                <>
                  <span className="chat-header-menu-icon" aria-hidden="true">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="chat-header-menu-label">{item.label}</span>
                  {item.active && (
                    <Icon name="check" size={16} className="chat-header-menu-check" />
                  )}
                </>
              );

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`chat-header-menu-item ${item.destructive ? 'is-destructive' : ''}`}
                    role="menuitem"
                    data-menu-index={idx}
                    tabIndex={focusedIndex === idx ? 0 : -1}
                    onClick={() => onClose()}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`chat-header-menu-item ${item.destructive ? 'is-destructive' : ''}`}
                  role="menuitem"
                  data-menu-index={idx}
                  tabIndex={focusedIndex === idx ? 0 : -1}
                  onClick={() => {
                    item.onClick?.();
                    onClose();
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>,
    document.body
  );
}
