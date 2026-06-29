'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/app/components/ui/Icon';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useMessaging } from '@/lib/contexts/messaging-context';
import {
  sendMessage,
  startDirectChat,
  subscribeToMessages,
  markMessagesAsRead,
  getOlderMessages,
  getMessageSnapshot,
  loadMoreRooms,
  getRoomSnapshot,
  getChatRoom,
} from '@/lib/services/chat-service';
import {
  editDmMessage,
  deleteDmMessage,
  toggleDmReaction,
} from '@/lib/services/messaging-service';
import { subscribeToPresence, subscribeToDmTyping } from '@/lib/services/presence-service';
import { createReport } from '@/lib/services/admin-service';
import { getUserProfile } from '@/lib/services/user-service';
import { resolveDisplayName, getCallableErrorMessage } from '@/lib/utils/display-name';
import MessageList from '@/app/components/messaging/MessageList';
import MessageComposer from '@/app/components/messaging/MessageComposer';
import TypingIndicator from '@/app/components/messaging/TypingIndicator';
import PresenceBadge from '@/app/components/messaging/PresenceBadge';
import type { ChatRoom, Message, User } from '@/app/types';
import type { PresenceStatus } from '@/lib/services/presence-service';
import { format } from 'date-fns';

const ROOM_PAGE_SIZE = 30;
const MESSAGE_PAGE_SIZE = 50;

function MessagesContent() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const { chatRooms, isLoadingRooms } = useMessaging();

  const [localRooms, setLocalRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMoreRooms, setIsLoadingMoreRooms] = useState(false);
  const [hasMoreRooms, setHasMoreRooms] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('offline');
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, Partial<User>>>({});

  const loadedProfileIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedRoomRef = useRef(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalRooms((prev) => {
      const subIds = new Set(chatRooms.map((r) => r.id));
      const olderLoaded = prev.filter((r) => !subIds.has(r.id));
      return [...chatRooms, ...olderLoaded];
    });
    setHasMoreRooms(chatRooms.length >= ROOM_PAGE_SIZE);
  }, [chatRooms]);

  useEffect(() => {
    if (user && targetUserId && targetUserId === user.id) {
      addToast({ type: 'error', title: 'Cannot message yourself' });
    }
  }, [user, targetUserId, addToast]);

  const fetchParticipantProfile = useCallback(async (id: string) => {
    if (loadedProfileIdsRef.current.has(id)) return;
    loadedProfileIdsRef.current.add(id);
    try {
      const profile = await getUserProfile(id);
      if (profile) {
        setParticipantProfiles((prev) => ({
          ...prev,
          [id]: { displayName: profile.displayName, avatarUrl: profile.avatarUrl },
        }));
      }
    } catch {
      loadedProfileIdsRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    localRooms.forEach((room) => {
      room.participants.forEach((id) => {
        if (id !== user.id) void fetchParticipantProfile(id);
      });
    });
  }, [localRooms, user, fetchParticipantProfile]);

  useEffect(() => {
    if (!user || hasInitializedRoomRef.current) return;
    if (targetUserId && targetUserId === user.id) return;

    if (targetUserId) {
      const existing = localRooms.find((r) => r.participants.includes(targetUserId));
      if (existing) {
        setActiveRoomId(existing.id);
        hasInitializedRoomRef.current = true;
      } else if (!isLoadingRooms) {
        void fetchParticipantProfile(targetUserId).then(() => {
          setActiveRoomId('new_chat');
          hasInitializedRoomRef.current = true;
        });
      }
    } else if (localRooms.length > 0) {
      setActiveRoomId(localRooms[0].id);
      hasInitializedRoomRef.current = true;
    }
  }, [user, targetUserId, localRooms, isLoadingRooms, fetchParticipantProfile]);

  const activeRoom = localRooms.find((r) => r.id === activeRoomId);
  const getOtherId = (room: ChatRoom) =>
    user ? room.participants.find((id) => id !== user.id) || null : null;
  const activeOtherId = activeRoom
    ? getOtherId(activeRoom)
    : activeRoomId === 'new_chat'
      ? targetUserId
      : null;
  const activeOtherProfile = activeOtherId ? participantProfiles[activeOtherId] : null;

  useEffect(() => {
    const roomId = activeRoomId;
    const userId = user?.id;
    if (!roomId || roomId === 'new_chat' || !userId) {
      setMessages([]);
      return;
    }

    const chatRoomId: string = roomId;
    const currentUserId: string = userId;

    let cancelled = false;
    let unsub: (() => void) | undefined;
    let unsubTyping: (() => void) | undefined;

    async function setupSubscription() {
      const room =
        localRooms.find((r) => r.id === chatRoomId) ?? (await getChatRoom(chatRoomId));
      if (cancelled) return;

      if (!room?.participants.includes(currentUserId)) {
        setMessages([]);
        setIsLoadingMessages(false);
        setActiveRoomId(null);
        addToast({ type: 'error', title: 'You do not have access to this chat' });
        return;
      }

      setIsLoadingMessages(true);
      void markMessagesAsRead(chatRoomId, currentUserId);

      unsub = subscribeToMessages(
        chatRoomId,
        currentUserId,
        (newMessages) => {
          setMessages((prev) => {
            const subIds = new Set(newMessages.map((m) => m.id));
            const older = prev.filter((m) => !subIds.has(m.id));
            return [...older, ...newMessages];
          });
          setIsLoadingMessages(false);
          setHasMoreMessages(newMessages.length >= MESSAGE_PAGE_SIZE);
          if (
            newMessages.some(
              (m) => m.senderId !== currentUserId && !m.readBy.includes(currentUserId)
            )
          ) {
            void markMessagesAsRead(chatRoomId, currentUserId);
          }
        },
        (err) => {
          setIsLoadingMessages(false);
          if (err.code === 'permission-denied') {
            setActiveRoomId(null);
            addToast({ type: 'error', title: 'Could not load messages for this chat' });
          }
        }
      );

      unsubTyping = subscribeToDmTyping(chatRoomId, currentUserId, setTypingUserIds);
    }

    void setupSubscription();

    return () => {
      cancelled = true;
      unsub?.();
      unsubTyping?.();
    };
  }, [activeRoomId, user, localRooms, addToast]);

  useEffect(() => {
    if (!activeOtherId) return;
    return subscribeToPresence(activeOtherId, setPresenceStatus);
  }, [activeOtherId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }
    if (isMoreMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen]);

  async function handleSend(content: string, reply?: Message | null) {
    if (!user) return;
    const senderName = resolveDisplayName(user.displayName, user.email);
    try {
      if (activeRoomId === 'new_chat' && targetUserId) {
        const profile = participantProfiles[targetUserId];
        if (!profile?.displayName) {
          addToast({ type: 'error', title: 'Could not load recipient profile' });
          return;
        }
        const roomId = await startDirectChat(
          user.id,
          senderName,
          user.avatarUrl ?? '',
          targetUserId,
          resolveDisplayName(profile.displayName),
          profile.avatarUrl ?? '',
          content
        );
        setActiveRoomId(roomId);
      } else if (activeRoomId && activeRoomId !== 'new_chat') {
        await sendMessage(
          activeRoomId,
          user.id,
          senderName,
          content,
          'text',
          undefined,
          undefined,
          reply?.id
        );
      }
      setReplyTo(null);
    } catch (error) {
      console.error('[messages] send failed', error);
      addToast({
        type: 'error',
        title: 'Failed to send message',
        message: getCallableErrorMessage(error, 'Please try again.'),
      });
    }
  }

  async function handleLoadOlder() {
    if (!activeRoomId || activeRoomId === 'new_chat' || !messages.length) return;
    const beforeDoc = await getMessageSnapshot(activeRoomId, messages[0].id);
    if (!beforeDoc) return;
    const prevHeight = messagesScrollRef.current?.scrollHeight ?? 0;
    setIsLoadingOlderMessages(true);
    try {
      const result = await getOlderMessages(activeRoomId, beforeDoc, 30);
      if (result.data.length) setMessages((prev) => [...result.data, ...prev]);
      setHasMoreMessages(result.hasMore);
      requestAnimationFrame(() => {
        const el = messagesScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }

  const filteredRooms = localRooms.filter((room) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const otherId = getOtherId(room);
    const name = (
      otherId
        ? participantProfiles[otherId]?.displayName ?? room.participantNames[otherId]
        : ''
    ).toLowerCase();
    return name.includes(q) || (room.lastMessage ?? '').toLowerCase().includes(q);
  });

  const otherParticipantIds =
    activeRoom?.participants.filter((id) => id !== user?.id) ?? [];

  return (
    <div className="container" style={{ padding: '32px var(--margin-desktop)' }}>
      <h1 className="text-display-sm text-primary mb-24">Messages</h1>
      <div
        className="bg-surface-container-lowest messaging-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 350px) 1fr',
          height: 'calc(100vh - 200px)',
          minHeight: 600,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(196, 199, 199, 0.2)',
          overflow: 'hidden',
        }}
      >
        <div className="flex flex-col border-r" style={{ borderRight: '1px solid rgba(196,199,199,0.2)' }}>
          <div style={{ padding: 24, borderBottom: '1px solid rgba(196,199,199,0.2)' }}>
            <div className="header-search" style={{ margin: 0, width: '100%' }}>
              <Icon name="search" size={20} />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1" style={{ overflowY: 'auto' }}>
            {isLoadingRooms ? (
              <p className="p-24 text-on-surface-variant">Loading...</p>
            ) : (
              <ul className="flex flex-col">
                {filteredRooms.map((room) => {
                  const otherId = getOtherId(room);
                  const profile = otherId ? participantProfiles[otherId] : null;
                  const hasUnread =
                    (room.unreadCount[user?.id || ''] || 0) > 0 &&
                    room.lastMessageBy !== user?.id;
                  return (
                    <li
                      key={room.id}
                      onClick={() => setActiveRoomId(room.id)}
                      className={`flex gap-16 items-center cursor-pointer ${room.id === activeRoomId ? 'bg-surface-container-low' : ''}`}
                      style={{ padding: '16px 24px', borderLeft: room.id === activeRoomId ? '3px solid var(--color-primary)' : '3px solid transparent' }}
                    >
                      <div className="avatar avatar-md">{profile?.displayName?.charAt(0) || 'U'}</div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between">
                          <span className={`truncate ${hasUnread ? 'font-bold' : ''}`}>
                            {profile?.displayName || room.participantNames[otherId ?? ''] || 'User'}
                          </span>
                          {room.lastMessageAt && (
                            <span className="text-caption">{format(new Date(room.lastMessageAt), 'MMM d')}</span>
                          )}
                        </div>
                        {room.lastMessage && (
                          <span className="text-body-sm truncate text-on-surface-variant block">
                            {room.lastMessageBy === user?.id ? 'You: ' : ''}
                            {room.lastMessage}
                          </span>
                        )}
                      </div>
                      {hasUnread && <div className="notification-dot" />}
                    </li>
                  );
                })}
              </ul>
            )}
            {hasMoreRooms && (
              <div className="p-16 text-center">
                <button type="button" className="text-primary text-body-sm" onClick={async () => {
                  if (!user || !localRooms.length) return;
                  setIsLoadingMoreRooms(true);
                  try {
                    const lastDoc = await getRoomSnapshot(localRooms[localRooms.length - 1].id);
                    if (!lastDoc) return;
                    const result = await loadMoreRooms(user.id, lastDoc, ROOM_PAGE_SIZE);
                    setLocalRooms((prev) => {
                      const ids = new Set(prev.map((r) => r.id));
                      return [...prev, ...result.data.filter((r) => !ids.has(r.id))];
                    });
                    setHasMoreRooms(result.hasMore);
                  } finally {
                    setIsLoadingMoreRooms(false);
                  }
                }}>
                  {isLoadingMoreRooms ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col h-full bg-surface">
          {activeRoomId ? (
            <>
              <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(196,199,199,0.2)' }}>
                <div className="flex items-center gap-12">
                  <div style={{ position: 'relative' }}>
                    <div className="avatar avatar-sm">{activeOtherProfile?.displayName?.charAt(0) || 'U'}</div>
                    {activeOtherId && (
                      <span style={{ position: 'absolute', bottom: 0, right: 0 }}>
                        <PresenceBadge status={presenceStatus} size={8} />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-label-lg">{activeOtherProfile?.displayName || 'Chat'}</h3>
                    {activeOtherId && (
                      <Link href={`/profile/${activeOtherId}`} className="text-caption hover:underline">
                        View Profile
                      </Link>
                    )}
                  </div>
                </div>
                <div ref={moreMenuRef} style={{ position: 'relative' }}>
                  <button type="button" className="btn-ghost" onClick={() => setIsMoreMenuOpen((o) => !o)}>
                    <Icon name="more_vert" />
                  </button>
                  {isMoreMenuOpen && activeOtherId && (
                    <div className="bg-surface-container-lowest" style={{ position: 'absolute', right: 0, top: '100%', minWidth: 160, border: '1px solid rgba(196,199,199,0.2)', borderRadius: 8, zIndex: 10 }}>
                      <Link href={`/profile/${activeOtherId}`} style={{ display: 'block', padding: 12 }} onClick={() => setIsMoreMenuOpen(false)}>View profile</Link>
                      <button type="button" style={{ display: 'block', width: '100%', padding: 12, textAlign: 'left' }} onClick={async () => {
                        const desc = window.prompt('Describe the issue:');
                        if (!desc || !user) return;
                        await createReport({ reporterId: user.id, reporterName: user.displayName, targetId: activeOtherId, targetType: 'user', reason: 'harassment', description: desc });
                        addToast({ type: 'success', title: 'Report submitted' });
                        setIsMoreMenuOpen(false);
                      }}>Report user</button>
                    </div>
                  )}
                </div>
              </div>

              <MessageList
                messages={messages}
                currentUserId={user?.id || ''}
                isLoading={isLoadingMessages}
                hasMore={hasMoreMessages}
                isLoadingMore={isLoadingOlderMessages}
                onLoadMore={handleLoadOlder}
                scrollRef={messagesScrollRef}
                otherParticipantIds={otherParticipantIds}
                onReply={setReplyTo}
                onEdit={async (msg) => {
                  const next = window.prompt('Edit message:', msg.content);
                  if (!next || !activeRoomId) return;
                  await editDmMessage(activeRoomId, msg.id, next);
                }}
                onDelete={async (msg) => {
                  if (!activeRoomId || !window.confirm('Delete message?')) return;
                  await deleteDmMessage(activeRoomId, msg.id);
                }}
                onReact={async (msg, emoji) => {
                  if (!activeRoomId) return;
                  await toggleDmReaction(activeRoomId, msg.id, emoji);
                }}
                emptyState={
                  <div className="text-center">
                    <Icon name="waving_hand" size={32} />
                    <p>Say hello to {activeOtherProfile?.displayName || 'them'}!</p>
                  </div>
                }
              />

              <TypingIndicator
                names={typingUserIds.map(
                  (id) => participantProfiles[id]?.displayName || 'Someone'
                )}
              />

              <MessageComposer
                onSend={handleSend}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                typingContext={
                  user && activeRoomId && activeRoomId !== 'new_chat'
                    ? { type: 'dm', roomId: activeRoomId, userId: user.id }
                    : undefined
                }
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-on-surface-variant">
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="container p-48">Loading messages...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
