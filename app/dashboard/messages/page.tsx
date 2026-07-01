'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
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
import ConversationListItem from '@/app/components/messaging/ConversationListItem';
import ChatStickyHeader from '@/app/components/messaging/ChatStickyHeader';
import ChatHeaderContextMenu, {
  type ChatHeaderMenuSection,
} from '@/app/components/messaging/ChatHeaderContextMenu';
import ChatSearchPanel from '@/app/components/messaging/ChatSearchPanel';
import ChatMediaPanel from '@/app/components/messaging/ChatMediaPanel';
import {
  getChatClearedAt,
  isRoomMuted,
  isRoomPinned,
  toggleRoomMuted,
  toggleRoomPinned,
  clearChatForUser,
  blockUser,
  sortRoomsByPin,
} from '@/lib/utils/chat-preferences';
import type { ChatRoom, Message, User } from '@/app/types';
import type { PresenceStatus } from '@/lib/services/presence-service';
import CollectorSubpageHero from '@/app/components/dashboard/CollectorSubpageHero';

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
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatMediaOpen, setChatMediaOpen] = useState(false);
  const [prefsTick, setPrefsTick] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('offline');
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, Partial<User>>>({});
  const [mobilePanel, setMobilePanel] = useState<'list' | 'chat'>('list');

  const loadedProfileIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedRoomRef = useRef(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

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
          [id]: {
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            role: profile.role,
          },
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
        setMobilePanel('chat');
        hasInitializedRoomRef.current = true;
      } else if (!isLoadingRooms) {
        void fetchParticipantProfile(targetUserId).then(() => {
          setActiveRoomId('new_chat');
          setMobilePanel('chat');
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
  const activeDisplayName =
    activeOtherProfile?.displayName ||
    (activeOtherId && activeRoom?.participantNames[activeOtherId]) ||
    'Chat';

  const presenceSubtitle =
    typingUserIds.length > 0
      ? 'typing…'
      : presenceStatus === 'online'
        ? 'Online'
        : 'Offline';

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
    setChatSearchOpen(false);
    setChatMediaOpen(false);
    setIsMoreMenuOpen(false);
  }, [activeRoomId]);

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

  const filteredRooms = useMemo(() => {
    const list = localRooms.filter((room) => {
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
    return user ? sortRoomsByPin(user.id, list) : list;
  }, [localRooms, searchQuery, participantProfiles, user, prefsTick]);

  const clearedAt =
    user && activeRoomId && activeRoomId !== 'new_chat'
      ? getChatClearedAt(user.id, activeRoomId)
      : null;

  const visibleMessages = useMemo(() => {
    if (!clearedAt) return messages;
    const cutoff = new Date(clearedAt).getTime();
    return messages.filter((m) => new Date(m.createdAt).getTime() > cutoff);
  }, [messages, clearedAt]);

  const roomMuted =
    user && activeRoomId && activeRoomId !== 'new_chat'
      ? isRoomMuted(user.id, activeRoomId)
      : false;

  const roomPinned =
    user && activeRoomId && activeRoomId !== 'new_chat'
      ? isRoomPinned(user.id, activeRoomId)
      : false;

  const isOtherArtist =
    activeOtherProfile?.role === 'artist' ||
    activeOtherProfile?.role === 'verified_artist';

  const headerMenuSections: ChatHeaderMenuSection[] = useMemo(() => {
    if (!activeOtherId) return [];
    const profileSection: ChatHeaderMenuSection = {
      id: 'profile',
      items: [
        {
          id: 'view-profile',
          label: 'View Profile',
          icon: 'person',
          href: `/profile/${activeOtherId}`,
        },
        ...(isOtherArtist
          ? [
              {
                id: 'view-artist-profile',
                label: 'View Artist Profile',
                icon: 'palette',
                href: `/profile/${activeOtherId}`,
              },
            ]
          : []),
      ],
    };

    const chatSection: ChatHeaderMenuSection = {
      id: 'chat',
      items: [
        {
          id: 'search',
          label: 'Search in Chat',
          icon: 'search',
          onClick: () => setChatSearchOpen(true),
          disabled: activeRoomId === 'new_chat',
        },
        {
          id: 'media',
          label: 'Media & Files',
          icon: 'perm_media',
          onClick: () => setChatMediaOpen(true),
          disabled: activeRoomId === 'new_chat',
        },
      ],
    };

    const settingsSection: ChatHeaderMenuSection = {
      id: 'settings',
      items: [
        {
          id: 'mute',
          label: roomMuted ? 'Unmute Notifications' : 'Mute Notifications',
          icon: roomMuted ? 'notifications' : 'notifications_off',
          active: roomMuted,
          onClick: () => {
            if (!user || !activeRoomId || activeRoomId === 'new_chat') return;
            const nowMuted = toggleRoomMuted(user.id, activeRoomId);
            setPrefsTick((t) => t + 1);
            addToast({
              type: 'info',
              title: nowMuted ? 'Notifications muted' : 'Notifications unmuted',
            });
          },
          disabled: activeRoomId === 'new_chat',
        },
        {
          id: 'pin',
          label: roomPinned ? 'Unpin Conversation' : 'Pin Conversation',
          icon: 'push_pin',
          active: roomPinned,
          onClick: () => {
            if (!user || !activeRoomId || activeRoomId === 'new_chat') return;
            const nowPinned = toggleRoomPinned(user.id, activeRoomId);
            setPrefsTick((t) => t + 1);
            addToast({
              type: 'success',
              title: nowPinned ? 'Conversation pinned' : 'Conversation unpinned',
            });
          },
          disabled: activeRoomId === 'new_chat',
        },
      ],
    };

    const dangerSection: ChatHeaderMenuSection = {
      id: 'danger',
      destructive: true,
      items: [
        {
          id: 'clear',
          label: 'Clear Chat',
          icon: 'delete_sweep',
          destructive: true,
          onClick: () => {
            if (!user || !activeRoomId || activeRoomId === 'new_chat') return;
            if (
              !window.confirm(
                'Clear this chat from your view? Messages will be hidden for you only.'
              )
            ) {
              return;
            }
            clearChatForUser(user.id, activeRoomId);
            setPrefsTick((t) => t + 1);
            addToast({ type: 'success', title: 'Chat cleared on your device' });
          },
          disabled: activeRoomId === 'new_chat',
        },
        {
          id: 'block',
          label: 'Block User',
          icon: 'block',
          destructive: true,
          onClick: () => {
            if (!user || !activeOtherId) return;
            if (
              !window.confirm(
                `Block ${activeDisplayName}? You will no longer see messages from them.`
              )
            ) {
              return;
            }
            blockUser(user.id, activeOtherId);
            setPrefsTick((t) => t + 1);
            setActiveRoomId(null);
            setMobilePanel('list');
            addToast({ type: 'success', title: 'User blocked' });
          },
        },
        {
          id: 'report',
          label: 'Report User',
          icon: 'flag',
          destructive: true,
          onClick: async () => {
            const desc = window.prompt('Describe the issue:');
            if (!desc || !user) return;
            await createReport({
              reporterId: user.id,
              reporterName: user.displayName,
              targetId: activeOtherId,
              targetType: 'user',
              reason: 'harassment',
              description: desc,
            });
            addToast({ type: 'success', title: 'Report submitted' });
          },
        },
      ],
    };

    return [profileSection, chatSection, settingsSection, dangerSection];
  }, [
    activeOtherId,
    activeRoomId,
    activeDisplayName,
    isOtherArtist,
    roomMuted,
    roomPinned,
    user,
    addToast,
  ]);

  const otherParticipantIds =
    activeRoom?.participants.filter((id) => id !== user?.id) ?? [];

  function selectRoom(roomId: string) {
    setActiveRoomId(roomId);
    setMobilePanel('chat');
  }

  return (
    <div className="collector-dashboard-page">
      <CollectorSubpageHero
        variant="compact"
        eyebrow="Messages"
        title="Direct Messages"
        description="Chat with artists and collectors you follow."
        actions={
          <Link href="/dashboard/communities" className="text-body-sm text-primary hover:underline">
            Communities
          </Link>
        }
      />
      <div
        className="bg-surface-container-lowest messaging-layout dashboard-panel-card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 380px) 1fr',
          height: 'calc(100vh - 280px)',
          minHeight: 600,
          overflow: 'hidden',
        }}
      >
        <div className={`messaging-list-panel ${mobilePanel !== 'list' ? 'mobile-hide' : ''}`}>
          <div style={{ padding: 20, borderBottom: '1px solid rgba(196,199,199,0.2)' }}>
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
              <div className="flex flex-col">
                {filteredRooms.map((room) => {
                  const otherId = getOtherId(room);
                  const profile = otherId ? participantProfiles[otherId] : null;
                  const displayName =
                    profile?.displayName || room.participantNames[otherId ?? ''] || 'User';
                  const unreadCount = room.unreadCount[user?.id || ''] || 0;
                  const hasUnread = unreadCount > 0 && room.lastMessageBy !== user?.id;
                  const preview = room.lastMessage
                    ? `${room.lastMessageBy === user?.id ? 'You: ' : ''}${room.lastMessage}`
                    : undefined;

                  return (
                    <ConversationListItem
                      key={room.id}
                      id={room.id}
                      displayName={displayName}
                      avatarUrl={profile?.avatarUrl}
                      preview={preview}
                      lastMessageAt={room.lastMessageAt}
                      isActive={room.id === activeRoomId}
                      hasUnread={hasUnread}
                      unreadCount={unreadCount}
                      onClick={() => selectRoom(room.id)}
                    />
                  );
                })}
              </div>
            )}
            {hasMoreRooms && (
              <div className="p-16 text-center">
                <button
                  type="button"
                  className="text-primary text-body-sm"
                  onClick={async () => {
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
                  }}
                >
                  {isLoadingMoreRooms ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`messaging-chat-panel ${mobilePanel !== 'chat' ? 'mobile-hide' : ''}`}>
          {activeRoomId ? (
            <>
              <ChatStickyHeader
                title={activeDisplayName}
                subtitle={presenceSubtitle}
                avatarUrl={activeOtherProfile?.avatarUrl}
                avatarFallback={activeDisplayName}
                presenceStatus={presenceStatus}
                showBack
                onBack={() => setMobilePanel('list')}
                actions={
                  activeOtherId ? (
                    <>
                      <button
                        ref={menuTriggerRef}
                        type="button"
                        className="chat-header-menu-trigger"
                        onClick={() => setIsMoreMenuOpen((o) => !o)}
                        aria-label="Chat options"
                        aria-expanded={isMoreMenuOpen}
                        aria-haspopup="menu"
                      >
                        <Icon name="more_vert" />
                      </button>
                      <ChatHeaderContextMenu
                        isOpen={isMoreMenuOpen}
                        onClose={() => setIsMoreMenuOpen(false)}
                        triggerRef={menuTriggerRef}
                        sections={headerMenuSections}
                      />
                    </>
                  ) : undefined
                }
              />

              {chatSearchOpen && activeRoomId && activeRoomId !== 'new_chat' && (
                <ChatSearchPanel
                  roomId={activeRoomId}
                  onClose={() => setChatSearchOpen(false)}
                />
              )}

              {chatMediaOpen && (
                <ChatMediaPanel
                  messages={visibleMessages}
                  onClose={() => setChatMediaOpen(false)}
                />
              )}

              <div className="chat-wallpaper flex flex-col flex-1 min-h-0">
                <MessageList
                  messages={visibleMessages}
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
                      <p>Say hello to {activeDisplayName}!</p>
                    </div>
                  }
                />
              </div>

              <TypingIndicator
                names={typingUserIds.map(
                  (id) => participantProfiles[id]?.displayName || 'Someone'
                )}
              />

              <MessageComposer
                variant="dm"
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
    <Suspense
      fallback={
        <div className="collector-dashboard-page">
          <div className="skeleton dashboard-sub-hero" style={{ height: 80, marginBottom: 24 }} />
          <div className="skeleton dashboard-panel-card" style={{ height: 500 }} />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
