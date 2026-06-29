'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/app/components/ui/Icon';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useMessaging } from '@/lib/contexts/messaging-context';
import {
  subscribeToChannelMessages,
  subscribeToMembers,
  subscribeToPinnedMessages,
  sendChannelMessage,
  markChannelAsRead,
  getOlderChannelMessages,
  getChannelMessageSnapshot,
  toggleChannelReaction,
  pinChannelMessage,
  deleteChannelMessage,
  editChannelMessage,
  joinCommunity,
} from '@/lib/services/community-messaging-service';
import { subscribeToChannelTyping } from '@/lib/services/presence-service';
import MessageList from '@/app/components/messaging/MessageList';
import MessageComposer from '@/app/components/messaging/MessageComposer';
import TypingIndicator from '@/app/components/messaging/TypingIndicator';
import type { CommunityChannel, CommunityMember, Message, PinnedMessage } from '@/app/types';

function CommunitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const { communities, communityChannels, isLoadingRooms } = useMessaging();

  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [pins, setPins] = useState<PinnedMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const [mobilePanel, setMobilePanel] = useState<'servers' | 'channels' | 'chat'>('servers');
  const scrollRef = useRef<HTMLDivElement>(null);

  const channelParam = searchParams.get('channel');

  useEffect(() => {
    if (communities.length && !activeCommunityId) {
      setActiveCommunityId(communities[0].id);
    }
  }, [communities, activeCommunityId]);

  useEffect(() => {
    if (channelParam && activeCommunityId) {
      setActiveChannelId(channelParam);
      setMobilePanel('chat');
    }
  }, [channelParam, activeCommunityId]);

  const channels = activeCommunityId ? communityChannels[activeCommunityId] || [] : [];
  const activeCommunity = communities.find((c) => c.id === activeCommunityId);
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const myMember = members.find((m) => m.userId === user?.id);
  const canModerate =
    myMember?.role === 'owner' ||
    myMember?.role === 'admin' ||
    myMember?.role === 'moderator';

  useEffect(() => {
    if (!activeCommunityId) return;
    return subscribeToMembers(activeCommunityId, setMembers);
  }, [activeCommunityId]);

  useEffect(() => {
    if (!activeCommunityId || !activeChannelId || !user) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    void markChannelAsRead(activeCommunityId, activeChannelId);

    const unsub = subscribeToChannelMessages(
      activeCommunityId,
      activeChannelId,
      (msgs) => {
        setMessages((prev) => {
          const ids = new Set(msgs.map((m) => m.id));
          return [...prev.filter((m) => !ids.has(m.id)), ...msgs];
        });
        setIsLoadingMessages(false);
        setHasMoreMessages(msgs.length >= 50);
      }
    );

    const unsubPins = subscribeToPinnedMessages(
      activeCommunityId,
      activeChannelId,
      setPins
    );

    const unsubTyping = subscribeToChannelTyping(
      activeCommunityId,
      activeChannelId,
      user.id,
      setTypingIds
    );

    return () => {
      unsub();
      unsubPins();
      unsubTyping();
    };
  }, [activeCommunityId, activeChannelId, user]);

  useEffect(() => {
    if (channels.length && !activeChannelId) {
      const def = channels.find((c) => c.isDefault) || channels[0];
      setActiveChannelId(def.id);
    }
  }, [channels, activeChannelId]);

  async function handleSend(content: string, reply?: Message | null) {
    if (!user || !activeCommunityId || !activeChannelId) return;
    try {
      await sendChannelMessage(
        activeCommunityId,
        activeChannelId,
        user.displayName,
        content,
        reply?.id
      );
      setReplyTo(null);
    } catch {
      addToast({ type: 'error', title: 'Failed to send message' });
    }
  }

  async function handleJoin(communityId: string) {
    if (!user) return;
    try {
      await joinCommunity(communityId, user.displayName, user.avatarUrl);
      addToast({ type: 'success', title: 'Joined community' });
    } catch {
      addToast({ type: 'error', title: 'Failed to join' });
    }
  }

  return (
    <div className="container" style={{ padding: '32px var(--margin-desktop)' }}>
      <div className="flex justify-between items-center mb-24">
        <h1 className="text-display-sm text-primary">Communities</h1>
        <Link href="/dashboard/messages" className="text-body-sm text-primary hover:underline">
          Direct Messages
        </Link>
      </div>

      <div
        className="communities-layout bg-surface-container-lowest"
        style={{
          display: 'grid',
          gridTemplateColumns: '72px 240px 1fr',
          height: 'calc(100vh - 200px)',
          minHeight: 600,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(196, 199, 199, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Server list */}
        <div
          className={`flex flex-col gap-8 p-8 ${mobilePanel !== 'servers' ? 'mobile-hide' : ''}`}
          style={{ background: 'var(--color-surface-container)', overflowY: 'auto' }}
        >
          {isLoadingRooms && !communities.length ? (
            <p className="text-caption p-8">Loading...</p>
          ) : (
            communities.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.name}
                className="avatar avatar-md mx-auto"
                style={{
                  border:
                    c.id === activeCommunityId
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                }}
                onClick={() => {
                  setActiveCommunityId(c.id);
                  setActiveChannelId(null);
                  setMobilePanel('channels');
                }}
              >
                {c.name.charAt(0)}
              </button>
            ))
          )}
        </div>

        {/* Channel list */}
        <div
          className={`flex flex-col border-r ${mobilePanel !== 'channels' && mobilePanel !== 'chat' ? 'mobile-hide' : ''}`}
          style={{ borderRight: '1px solid rgba(196,199,199,0.2)' }}
        >
          {activeCommunity ? (
            <>
              <div style={{ padding: 16, borderBottom: '1px solid rgba(196,199,199,0.2)' }}>
                <h2 className="text-label-lg truncate">{activeCommunity.name}</h2>
                {myMember?.role === 'owner' && (
                  <Link
                    href={`/dashboard/communities/${activeCommunity.id}/settings`}
                    className="text-caption text-primary"
                  >
                    Settings
                  </Link>
                )}
              </div>
              <ul className="flex-1 overflow-y-auto p-8">
                {channels.map((ch: CommunityChannel) => {
                  const unread = (ch.unreadCount[user?.id || ''] || 0) > 0;
                  return (
                    <li key={ch.id}>
                      <button
                        type="button"
                        className={`w-full text-left text-body-sm ${ch.id === activeChannelId ? 'text-primary font-bold' : ''}`}
                        style={{ padding: '8px 12px', borderRadius: 8 }}
                        onClick={() => {
                          setActiveChannelId(ch.id);
                          setMobilePanel('chat');
                          router.replace(`/dashboard/communities?community=${activeCommunity.id}&channel=${ch.id}`);
                        }}
                      >
                        <span className="text-on-surface-variant"># </span>
                        {ch.name}
                        {unread && <span className="notification-dot ml-8" style={{ display: 'inline-block' }} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="p-24 text-on-surface-variant">No communities yet</div>
          )}
        </div>

        {/* Chat */}
        <div className={`flex flex-col ${mobilePanel !== 'chat' ? 'mobile-hide' : ''}`}>
          {activeCommunityId && activeChannelId && user ? (
            <>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(196,199,199,0.2)' }}>
                <button type="button" className="btn-ghost mobile-only mb-8" onClick={() => setMobilePanel('channels')}>
                  <Icon name="arrow_back" size={18} /> Channels
                </button>
                <h3 className="text-label-lg">#{activeChannel?.name}</h3>
                {activeChannel?.topic && (
                  <p className="text-caption text-on-surface-variant">{activeChannel.topic}</p>
                )}
                {pins.length > 0 && (
                  <div className="text-caption mt-8" style={{ background: 'var(--color-surface-container-low)', padding: 8, borderRadius: 8 }}>
                    <Icon name="push_pin" size={14} /> {pins.length} pinned message{pins.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <MessageList
                messages={messages}
                currentUserId={user.id}
                isLoading={isLoadingMessages}
                hasMore={hasMoreMessages}
                isLoadingMore={isLoadingOlder}
                scrollRef={scrollRef}
                canModerate={canModerate}
                onReply={setReplyTo}
                onEdit={async (msg) => {
                  const next = window.prompt('Edit:', msg.content);
                  if (!next) return;
                  await editChannelMessage(activeCommunityId, activeChannelId, msg.id, next);
                }}
                onDelete={async (msg) => {
                  if (!window.confirm('Delete?')) return;
                  await deleteChannelMessage(activeCommunityId, activeChannelId, msg.id);
                }}
                onReact={async (msg, emoji) => {
                  await toggleChannelReaction(activeCommunityId, activeChannelId, msg.id, emoji);
                }}
                onPin={async (msg) => {
                  await pinChannelMessage(activeCommunityId, activeChannelId, msg.id);
                  addToast({ type: 'success', title: 'Message pinned' });
                }}
                onLoadMore={async () => {
                  if (!messages.length) return;
                  const before = await getChannelMessageSnapshot(
                    activeCommunityId,
                    activeChannelId,
                    messages[0].id
                  );
                  if (!before) return;
                  setIsLoadingOlder(true);
                  try {
                    const result = await getOlderChannelMessages(
                      activeCommunityId,
                      activeChannelId,
                      before
                    );
                    if (result.data.length) setMessages((prev) => [...result.data, ...prev]);
                    setHasMoreMessages(result.hasMore);
                  } finally {
                    setIsLoadingOlder(false);
                  }
                }}
              />

              <TypingIndicator
                names={typingIds.map(
                  (id) => members.find((m) => m.userId === id)?.displayName || 'Someone'
                )}
              />

              <MessageComposer
                onSend={handleSend}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                placeholder={
                  activeChannel?.isAnnouncements && !canModerate
                    ? 'Read-only channel'
                    : `Message #${activeChannel?.name}`
                }
                disabled={!!activeChannel?.isAnnouncements && !canModerate}
                mentionSuggestions={members.map((m) => ({
                  id: m.userId,
                  label: m.nickname || m.displayName,
                }))}
                typingContext={{
                  type: 'channel',
                  communityId: activeCommunityId,
                  channelId: activeChannelId,
                  userId: user.id,
                }}
              />
            </>
          ) : activeCommunity && !myMember ? (
            <div className="flex items-center justify-center h-full flex-col gap-16">
              <p>Join {activeCommunity.name} to participate</p>
              <button type="button" className="btn-primary" onClick={() => handleJoin(activeCommunity.id)}>
                Join Community
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-on-surface-variant">
              {communities.length === 0
                ? 'Follow verified artists to join their communities'
                : 'Select a channel'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommunitiesPage() {
  return (
    <Suspense fallback={<div className="container p-48">Loading communities...</div>}>
      <CommunitiesContent />
    </Suspense>
  );
}
