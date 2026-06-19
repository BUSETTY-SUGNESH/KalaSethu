'use client';

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { sendMessage, subscribeToUserChatRooms, subscribeToMessages, markMessagesAsRead } from "@/lib/services/chat-service";
import { getUserProfile } from "@/lib/services/user-service";
import type { ChatRoom, Message, User } from "@/app/types";
import { format } from "date-fns";

function MessagesContent() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const { user } = useAuthStore();
  
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Store participant profiles we fetch
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, Partial<User>>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat rooms
  useEffect(() => {
    if (!user) return;
    
    setIsLoadingRooms(true);
    
    // Subscribe to chat rooms for real-time updates
    const unsubscribe = subscribeToUserChatRooms(user.id, async (rooms) => {
      setChatRooms(rooms);
      setIsLoadingRooms(false);
      
      // If we don't have an active room but we have a target user from URL, 
      // we need to see if a room exists, otherwise create one on first message
      if (!activeRoomId && targetUserId) {
        const existingRoom = rooms.find(r => r.participants.includes(targetUserId));
        if (existingRoom) {
          setActiveRoomId(existingRoom.id);
        } else {
          // Fetch target user profile so we can show their name
          try {
            const targetProfile = await getUserProfile(targetUserId);
            if (targetProfile) {
              setParticipantProfiles(prev => ({
                ...prev,
                [targetUserId]: {
                  displayName: targetProfile.displayName,
                  avatarUrl: targetProfile.avatarUrl
                }
              }));
              setActiveRoomId('new_chat');
            }
          } catch (e) {
            console.error("Failed to fetch target user");
          }
        }
      } else if (!activeRoomId && rooms.length > 0 && !targetUserId) {
        // Select first room by default
        setActiveRoomId(rooms[0].id);
      }
      
      // Fetch missing participant profiles
      const missingIds = new Set<string>();
      rooms.forEach(room => {
        room.participants.forEach(id => {
          if (id !== user.id && !participantProfiles[id]) {
            missingIds.add(id);
          }
        });
      });
      
      Array.from(missingIds).forEach(async (id) => {
        try {
          const profile = await getUserProfile(id);
          if (profile) {
            setParticipantProfiles(prev => ({
              ...prev,
              [id]: {
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl
              }
            }));
          }
        } catch (e) {
          console.error(`Failed to fetch profile for ${id}`);
        }
      });
    });

    return () => unsubscribe();
  }, [user, activeRoomId, targetUserId, participantProfiles]);

  // Load messages for active room
  useEffect(() => {
    if (!activeRoomId || activeRoomId === 'new_chat' || !user) {
      setMessages([]);
      return;
    }
    
    setIsLoadingMessages(true);
    
    // Mark as read when opening room
    markMessagesAsRead(activeRoomId, user.id).catch(console.error);
    
    const unsubscribe = subscribeToMessages(activeRoomId, (newMessages) => {
      setMessages(newMessages.reverse()); // Reverse to get oldest first for chat view
      setIsLoadingMessages(false);
      
      // If we get new messages while in the room, mark them as read
      const unreadCount = newMessages.filter(m => m.senderId !== user.id && !m.readBy.includes(user.id)).length;
      if (unreadCount > 0) {
        markMessagesAsRead(activeRoomId, user.id).catch(console.error);
      }
    });

    return () => unsubscribe();
  }, [activeRoomId, user]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;
    
    setIsSending(true);
    try {
      if (activeRoomId === 'new_chat' && targetUserId) {
        // First message to a new user
        // In a real app, we'd need a service function that checks if room exists 
        // or creates it, then adds the message.
        // For now, we'll assume we can just create a new room by sending a message
        // using the chat-service.ts sendMessage which takes roomId.
        // Let's generate a temporary ID format that the service could intercept, 
        // or we just need an endpoint to "startChat".
        // For Phase D, let's just log it if we can't create it directly.
        console.warn("Starting new chat needs a dedicated function. Creating a pseudo-room.");
      } else if (activeRoomId) {
        await sendMessage(activeRoomId, user.id, user.displayName, newMessage.trim());
      }
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  }

  // Helper to get the other participant in a 1-on-1 chat
  const getOtherParticipantId = (room: ChatRoom) => {
    if (!user) return null;
    return room.participants.find(id => id !== user.id) || null;
  };

  const activeRoom = chatRooms.find(r => r.id === activeRoomId);
  const activeOtherId = activeRoom ? getOtherParticipantId(activeRoom) : (activeRoomId === 'new_chat' ? targetUserId : null);
  const activeOtherProfile = activeOtherId ? participantProfiles[activeOtherId] : null;

  return (
    <div className="container" style={{ padding: "32px var(--margin-desktop)" }}>
      <h1 className="text-display-sm text-primary mb-24">Messages</h1>

      <div className="bg-surface-container-lowest" style={{ 
        display: "grid", 
        gridTemplateColumns: "350px 1fr", 
        height: "calc(100vh - 200px)", 
        minHeight: 600,
        borderRadius: "var(--radius-lg)", 
        border: "1px solid rgba(196, 199, 199, 0.2)",
        overflow: "hidden"
      }}>
        {/* Left Sidebar: Chat Rooms */}
        <div className="flex flex-col border-r border-outline-variant" style={{ borderRight: "1px solid rgba(196, 199, 199, 0.2)" }}>
          <div style={{ padding: 24, borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <div className="header-search" style={{ margin: 0, width: "100%" }}>
              <Icon name="search" size={20} className="text-on-surface-variant" />
              <input type="text" placeholder="Search messages..." suppressHydrationWarning />
            </div>
          </div>
          
          <div className="flex-1" style={{ overflowY: "auto" }}>
            {isLoadingRooms ? (
              <div className="flex flex-col gap-16 p-24" style={{ padding: 24 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-12 items-center">
                    <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%" }} />
                    <div className="flex flex-col gap-8 flex-1">
                      <div className="skeleton" style={{ width: "60%", height: 16 }} />
                      <div className="skeleton" style={{ width: "90%", height: 12 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : chatRooms.length === 0 && !targetUserId ? (
              <div className="text-center p-32 text-on-surface-variant">
                <Icon name="chat_bubble_outline" size={32} className="mb-16" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {activeRoomId === 'new_chat' && activeOtherProfile && (
                  <li 
                    className="flex gap-16 items-center cursor-pointer" 
                    style={{ padding: "16px 24px", backgroundColor: "var(--color-surface-container-low)", borderLeft: "3px solid var(--color-primary)" }}
                  >
                    <div className="avatar avatar-md" style={{ backgroundColor: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {activeOtherProfile.avatarUrl ? (
                        <img src={activeOtherProfile.avatarUrl} alt={activeOtherProfile.displayName || "User"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        (activeOtherProfile.displayName || "U").charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <div className="flex justify-between items-baseline mb-4">
                        <span className="text-label-md text-primary truncate">{activeOtherProfile.displayName}</span>
                        <span className="text-caption text-on-surface-variant flex-shrink-0 ml-8">New</span>
                      </div>
                      <span className="text-body-sm text-on-surface-variant truncate italic">Start a conversation...</span>
                    </div>
                  </li>
                )}

                {chatRooms.map(room => {
                  const otherId = getOtherParticipantId(room);
                  const otherProfile = otherId ? participantProfiles[otherId] : null;
                  const isActive = room.id === activeRoomId;
                  const hasUnread = (room.unreadCount[user?.id || ''] || 0) > 0 && room.lastMessageBy !== user?.id;
                  
                  return (
                    <li 
                      key={room.id} 
                      onClick={() => setActiveRoomId(room.id)}
                      className={`flex gap-16 items-center cursor-pointer transition-colors ${isActive ? 'bg-surface-container-low' : 'hover:bg-surface-container-lowest'}`}
                      style={{ 
                        padding: "16px 24px", 
                        borderBottom: "1px solid rgba(196, 199, 199, 0.1)",
                        borderLeft: isActive ? "3px solid var(--color-primary)" : "3px solid transparent" 
                      }}
                    >
                      <div className="avatar avatar-md" style={{ backgroundColor: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {otherProfile?.avatarUrl ? (
                          <img src={otherProfile.avatarUrl} alt={otherProfile.displayName || "User"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          (otherProfile?.displayName || "U").charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex justify-between items-baseline mb-4">
                          <span className={`text-label-md truncate ${hasUnread ? 'text-primary font-bold' : 'text-on-surface'}`}>
                            {otherProfile?.displayName || "Loading..."}
                          </span>
                          {room.lastMessageAt && (
                            <span className={`text-caption flex-shrink-0 ml-8 ${hasUnread ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                              {format(new Date(room.lastMessageAt), "MMM d")}
                            </span>
                          )}
                        </div>
                        {room.lastMessage && (
                          <span className={`text-body-sm truncate ${hasUnread ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>
                            {room.lastMessageBy === user?.id ? "You: " : ""}{room.lastMessage}
                          </span>
                        )}
                      </div>
                      {hasUnread && (
                        <div className="notification-dot ml-8" style={{ width: 10, height: 10, marginTop: 0 }} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right Area: Chat Window */}
        <div className="flex flex-col h-full bg-surface">
          {activeRoomId ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between" style={{ padding: "20px 24px", borderBottom: "1px solid rgba(196, 199, 199, 0.2)", backgroundColor: "var(--color-surface-container-lowest)" }}>
                <div className="flex items-center gap-16">
                  <div className="avatar avatar-sm" style={{ backgroundColor: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {activeOtherProfile?.avatarUrl ? (
                      <img src={activeOtherProfile.avatarUrl} alt={activeOtherProfile.displayName || "User"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      (activeOtherProfile?.displayName || "U").charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="text-label-lg text-primary">{activeOtherProfile?.displayName || "Loading..."}</h3>
                    {activeOtherId && (
                      <Link href={`/profile/${activeOtherId}`} className="text-caption text-on-surface-variant hover:underline">
                        View Profile
                      </Link>
                    )}
                  </div>
                </div>
                <div>
                  <button className="btn-ghost" aria-label="More options"><Icon name="more_vert" /></button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1" style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-on-surface-variant">Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-on-surface-variant">
                      <div className="avatar avatar-lg mx-auto mb-16" style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                        <Icon name="waving_hand" size={32} />
                      </div>
                      <p>Say hello to {activeOtherProfile?.displayName || "them"}!</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col mt-auto">
                    {messages.map((msg, i) => {
                      const isOwn = msg.senderId === user?.id;
                      const showAvatar = !isOwn && (i === 0 || messages[i-1].senderId !== msg.senderId);
                      
                      return (
                        <div key={msg.id} className={`chat-message ${isOwn ? 'own' : ''}`} style={{ marginBottom: i < messages.length - 1 && messages[i+1].senderId === msg.senderId ? 4 : 16 }}>
                          {!isOwn && (
                            <div className="avatar avatar-sm" style={{ visibility: showAvatar ? 'visible' : 'hidden', flexShrink: 0, backgroundColor: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                              {activeOtherProfile?.avatarUrl ? (
                                <img src={activeOtherProfile.avatarUrl} alt="" />
                              ) : (
                                (activeOtherProfile?.displayName || "U").charAt(0)
                              )}
                            </div>
                          )}
                          <div className={`chat-bubble ${isOwn ? 'outgoing' : 'incoming'}`}>
                            {msg.content}
                            <div className="text-caption" style={{ 
                              marginTop: 4, 
                              textAlign: "right", 
                              fontSize: 10,
                              color: isOwn ? "rgba(255,255,255,0.7)" : "var(--color-on-surface-variant)" 
                            }}>
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="chat-input-area">
                <button className="btn-ghost" aria-label="Attach file" style={{ padding: 8 }}>
                  <Icon name="attach_file" />
                </button>
                <button className="btn-ghost" aria-label="Add image" style={{ padding: 8 }}>
                  <Icon name="image" />
                </button>
                <form onSubmit={handleSendMessage} className="flex-1 flex gap-12">
                  <input 
                    type="text" 
                    className="chat-input" 
                    placeholder="Type a message..." 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    disabled={isSending}
                  />
                  <Button variant="primary" type="submit" disabled={!newMessage.trim() || isSending} icon="send" style={{ padding: "0 20px" }}>
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-on-surface-variant max-w-sm">
                <Icon name="forum" size={64} className="mb-24 opacity-50 mx-auto block" />
                <h3 className="text-headline-sm text-primary mb-8">Your Messages</h3>
                <p>Select a conversation from the list or start a new one to connect with artisans and collectors.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "48px var(--margin-desktop)" }}>Loading messages...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
