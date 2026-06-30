'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import RoleBadge from "@/app/components/community/RoleBadge";
import { requestOpenCreateEventModal } from "@/app/(public)/events/CreateEventModal";
import {
  createPost,
  getFeedPosts,
  getTrendingPosts,
  getUserPosts,
  getPostsByCategory,
  getTopContributors,
  pinPost,
  unpinPost,
} from "@/lib/services/community-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import type { Post, CommunityContributor, UserRole } from "@/app/types";
import { formatDistanceToNow } from "date-fns";

type FeedFilter = 'latest' | 'trending' | 'techniques' | 'provenance' | 'my_posts';

const FILTER_TABS: { id: FeedFilter; label: string; sellerOnly?: boolean }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'trending', label: 'Trending' },
  { id: 'techniques', label: 'Techniques' },
  { id: 'provenance', label: 'Provenance' },
  { id: 'my_posts', label: 'My Posts', sellerOnly: true },
];

function resolvePostRole(post: Post): UserRole {
  if (post.authorRole) return post.authorRole;
  return post.authorVerified ? 'verified_artist' : 'user';
}

function sortPinnedFirst(posts: Post[]): Post[] {
  const pinned = posts
    .filter((post) => post.isPinned)
    .sort((a, b) => (b.pinnedAt ?? '').localeCompare(a.pinnedAt ?? ''));
  const rest = posts.filter((post) => !post.isPinned);
  return [...pinned, ...rest];
}

function getContributorInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function CommunityPage() {
  const router = useRouter();
  const { isAuthenticated, isArtist, user } = useAuthStore();
  const { addToast } = useUIStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [contributors, setContributors] = useState<CommunityContributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isContributorsLoading, setIsContributorsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('latest');
  const [showPostForm, setShowPostForm] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalPosts, setPinModalPosts] = useState<Post[]>([]);
  const [isPinModalLoading, setIsPinModalLoading] = useState(false);
  const [pinningPostId, setPinningPostId] = useState<string | null>(null);

  const loadPosts = useCallback(async (filter: FeedFilter) => {
    setIsLoading(true);
    try {
      if (filter === 'my_posts') {
        if (!user) {
          setPosts([]);
          return;
        }
        const result = await getUserPosts(user.id, 20);
        setPosts(result.data);
        return;
      }

      if (filter === 'trending') {
        const trending = await getTrendingPosts(20);
        setPosts(trending);
        return;
      }

      if (filter === 'techniques') {
        const result = await getPostsByCategory('Techniques', 20);
        setPosts(result.data);
        return;
      }

      if (filter === 'provenance') {
        const result = await getPostsByCategory('Provenance', 20);
        setPosts(result.data);
        return;
      }

      const result = await getFeedPosts(20);
      setPosts(sortPinnedFirst(result.data));
    } catch (error) {
      console.error("Failed to load posts", error);
      addToast({
        type: "error",
        title: "Could Not Load Discussions",
        message: "Please check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    loadPosts(activeFilter);
  }, [activeFilter, loadPosts]);

  useEffect(() => {
    async function loadContributors() {
      setIsContributorsLoading(true);
      try {
        const top = await getTopContributors(5);
        setContributors(top);
      } catch (error) {
        console.error("Failed to load contributors", error);
      } finally {
        setIsContributorsLoading(false);
      }
    }
    loadContributors();
  }, []);

  function handleNewDiscussion() {
    if (isAuthenticated) {
      setShowPostForm(true);
    } else {
      router.push('/login?redirect=/community');
    }
  }

  async function handlePostDiscussion() {
    if (!isAuthenticated || !user) {
      router.push('/login?redirect=/community');
      return;
    }

    const title = newPostTitle.trim();
    const content = newPostContent.trim();
    if (title.length < 6 || content.length < 20) {
      addToast({
        type: "error",
        title: "Incomplete Discussion",
        message: "Title needs at least 6 characters and content at least 20.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const postId = await createPost(
        user.id,
        user.displayName,
        user.avatarUrl,
        user.isVerified,
        {
          title,
          content,
          type: "discussion",
          category: "General",
          tags: ["General"],
          authorRole: user.role,
        }
      );

      addToast({
        type: "success",
        title: "Discussion Created",
        message: "Your topic is live in CharchaSabha.",
      });
      setNewPostTitle("");
      setNewPostContent("");
      setShowPostForm(false);
      router.push(`/community/${postId}`);
    } catch (error) {
      console.error("Failed to create discussion", error);
      addToast({
        type: "error",
        title: "Could Not Create Discussion",
        message: error instanceof Error ? error.message : "Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFilterChange(filter: FeedFilter) {
    if (filter === 'my_posts' && !isAuthenticated) {
      router.push('/login?redirect=/community');
      return;
    }
    setActiveFilter(filter);
  }

  async function openPinModal() {
    if (!user) {
      router.push('/login?redirect=/community');
      return;
    }
    setShowPinModal(true);
    setIsPinModalLoading(true);
    try {
      const result = await getUserPosts(user.id, 50);
      setPinModalPosts(result.data);
    } catch (error) {
      console.error("Failed to load your posts", error);
      addToast({
        type: "error",
        title: "Could Not Load Posts",
        message: "Please try again.",
      });
    } finally {
      setIsPinModalLoading(false);
    }
  }

  async function handleTogglePin(post: Post) {
    if (!user) return;
    setPinningPostId(post.id);
    try {
      if (post.isPinned) {
        await unpinPost(post.id, user.id);
        addToast({ type: "success", title: "Discussion Unpinned", message: "This post is no longer pinned." });
      } else {
        await pinPost(post.id, user.id);
        addToast({ type: "success", title: "Discussion Pinned", message: "This post will appear at the top of Latest." });
      }
      setPinModalPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? { ...item, isPinned: !post.isPinned, pinnedAt: post.isPinned ? undefined : new Date().toISOString(), pinnedBy: post.isPinned ? undefined : user.id }
            : item
        )
      );
      if (activeFilter === 'latest') {
        await loadPosts('latest');
      }
    } catch (error) {
      console.error("Failed to toggle pin", error);
      addToast({
        type: "error",
        title: "Pin Update Failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPinningPostId(null);
    }
  }

  function handleAnnounceEvent() {
    requestOpenCreateEventModal();
    router.push('/events');
  }

  const currentUserRole = user?.role ?? "user";

  return (
    <>
      {/* Page Header */}
      <div className="bg-surface-container-low border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container py-8 flex flex-col gap-16" style={{ padding: "48px var(--margin-desktop) 32px" }}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-8 text-accent-terracotta" style={{ marginBottom: 12 }}>
                <Icon name="forum" size={28} />
                <span className="text-label-md uppercase tracking-wider">CharchaSabha</span>
              </div>
              <h1 className="text-display-lg text-primary">The Art Community</h1>
              <p className="text-body-lg text-on-surface-variant max-w-2xl" style={{ marginTop: 12, maxWidth: 600 }}>
                Join discussions with artisans, historians, and collectors. Share techniques, ask about provenance, and connect over heritage.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
                <span className="text-caption text-on-surface-variant">Post tags:</span>
                <RoleBadge role="artist" />
                <RoleBadge role="user" />
              </div>
            </div>
            <div>
              <Button variant="primary" size="lg" icon="add" iconPosition="left" onClick={handleNewDiscussion}>
                New Discussion
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Post Creation Form */}
      {showPostForm && (
        <div style={{ backgroundColor: "var(--color-surface-container-low)", borderBottom: "1px solid rgba(196,199,199,0.2)" }}>
          <div className="container" style={{ padding: "32px var(--margin-desktop)" }}>
            <div className="card" style={{ padding: 32, maxWidth: 720 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
                <div>
                  <h2 className="text-headline-md text-primary">Start a Discussion</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <span className="text-caption text-on-surface-variant">Posting as</span>
                    <strong className="text-caption text-primary">{user?.displayName ?? "You"}</strong>
                    <RoleBadge role={currentUserRole} />
                  </div>
                </div>
                <button onClick={() => setShowPostForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <Icon name="close" size={24} />
                </button>
              </div>
              <div className="flex flex-col gap-16">
                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Title</label>
                  <input
                    type="text"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="e.g. Best sources for natural indigo dye?"
                    style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }}
                  />
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Content</label>
                  <textarea
                    rows={5}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Share your thoughts, questions, or insights with the community..."
                    style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14, resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handlePostDiscussion}
                    disabled={isSubmitting || newPostTitle.trim().length < 6 || newPostContent.trim().length < 20}
                  >
                    {isSubmitting ? "Posting..." : "Post Discussion"}
                  </Button>
                  <Button variant="outline" size="md" onClick={() => setShowPostForm(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="container section-gap">
        <div className="split-layout">
          {/* Main Feed */}
          <div className="flex flex-col gap-32">
            {/* Filter Tabs */}
            <div className="flex gap-24 border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)", paddingBottom: 16, flexWrap: "wrap" }}>
              {FILTER_TABS.filter((tab) => !tab.sellerOnly || isArtist()).map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleFilterChange(tab.id)}
                    className={isActive ? "text-label-md text-primary" : "text-label-md text-on-surface-variant"}
                    style={{
                      paddingBottom: 14,
                      borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                      marginBottom: -17,
                      background: "none",
                      borderTop: "none",
                      borderLeft: "none",
                      borderRight: "none",
                      cursor: "pointer",
                    }}
                    suppressHydrationWarning
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Threads */}
            <div className="flex flex-col gap-24">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 100, borderRadius: "var(--radius-lg)" }} />
                ))
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <Link
                    href={`/community/${post.id}`}
                    key={post.id}
                    className={`thread-item ${post.isTrending || post.isPinned ? 'active-thread' : 'inactive-thread'}`}
                    style={{ borderLeftWidth: 3, paddingLeft: 20, marginBottom: 0, display: "block" }}
                  >
                    <div className="flex justify-between items-start">
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-8 mb-2" style={{ marginBottom: 8, flexWrap: "wrap" }}>
                          {post.isPinned && (
                            <span className="text-label-sm uppercase text-accent-gold" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <Icon name="push_pin" size={14} />
                              Pinned
                            </span>
                          )}
                          {post.tags && post.tags.length > 0 && (
                            <span className="text-label-sm uppercase bg-surface-container-high text-on-surface px-2 py-1 rounded" style={{ padding: "2px 8px", borderRadius: 4 }}>
                              {post.tags[0]}
                            </span>
                          )}
                          <RoleBadge role={resolvePostRole(post)} />
                          <span className="text-caption text-on-surface-variant">
                            {post.authorName} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <h3 className="text-title-md text-primary cursor-pointer hover:text-accent-terracotta transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-body-md text-on-surface-variant mt-2 line-clamp-2" style={{ marginTop: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {post.content}
                        </p>
                      </div>
                      <div className="flex flex-col items-end text-on-surface-variant flex-shrink-0" style={{ marginLeft: 16 }}>
                        <div className="flex items-center gap-4 text-body-md">
                          <Icon name="chat_bubble_outline" size={16} />
                          <span>{post.commentCount}</span>
                        </div>
                        <div className="flex items-center gap-4 text-caption mt-1" style={{ marginTop: 4 }}>
                          <Icon name="favorite_border" size={14} />
                          <span>{post.likeCount}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty-state">
                  <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>forum</span>
                  <p className="text-body-lg text-on-surface-variant">
                    {activeFilter === 'my_posts'
                      ? "You haven't posted any discussions yet."
                      : activeFilter === 'trending'
                        ? "No trending discussions right now. Check back soon!"
                        : "No discussions yet. Be the first to post!"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-32">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6" style={{ border: "1px solid rgba(196, 199, 199, 0.2)", borderRadius: "var(--radius-lg)", padding: 24 }}>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Top Contributors</h3>
              {isContributorsLoading ? (
                <div className="flex flex-col gap-16">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 48, borderRadius: "var(--radius-md)" }} />
                  ))}
                </div>
              ) : contributors.length > 0 ? (
                <div className="flex flex-col gap-16">
                  {contributors.map((contributor) => (
                    <Link
                      key={contributor.authorId}
                      href={`/profile/${contributor.authorId}`}
                      className="flex items-center gap-12"
                      style={{ textDecoration: "none" }}
                    >
                      {contributor.authorAvatarUrl ? (
                        <img
                          src={contributor.authorAvatarUrl}
                          alt={contributor.authorName}
                          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: "var(--color-surface-container-high)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--color-primary)",
                          }}
                        >
                          {getContributorInitials(contributor.authorName)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-label-md text-primary flex items-center gap-4" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {contributor.authorName}
                          {contributor.isVerified && (
                            <Icon name="verified" size={14} className="text-accent-emerald" />
                          )}
                        </h4>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                          {contributor.specialty && (
                            <span className="text-caption text-on-surface-variant">{contributor.specialty}</span>
                          )}
                          <RoleBadge role={contributor.authorRole} />
                          <span className="text-caption text-on-surface-variant">
                            {contributor.postCount} post{contributor.postCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-body-md text-on-surface-variant">No contributors yet. Start a discussion to appear here.</p>
              )}
            </div>

            {/* Seller-only: Pin or promote a post */}
            {isArtist() && (
              <div className="card" style={{ padding: 24, backgroundColor: "var(--color-surface-container-lowest)" }}>
                <h3 className="text-headline-sm text-primary" style={{ marginBottom: 12 }}>Seller Tools</h3>
                <div className="flex flex-col gap-12">
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ width: "100%", justifyContent: "flex-start", gap: 8, display: "flex", alignItems: "center" }}
                    onClick={openPinModal}
                  >
                    <Icon name="push_pin" size={18} />
                    Pin a Discussion
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ width: "100%", justifyContent: "flex-start", gap: 8, display: "flex", alignItems: "center" }}
                    onClick={handleAnnounceEvent}
                  >
                    <Icon name="campaign" size={18} />
                    Announce Event
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pin Discussion Modal */}
      {showPinModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowPinModal(false)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto", padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
              <h2 id="pin-modal-title" className="text-headline-md text-primary">Pin a Discussion</h2>
              <button type="button" onClick={() => setShowPinModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <Icon name="close" size={24} />
              </button>
            </div>
            {isPinModalLoading ? (
              <div className="flex flex-col gap-12">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 56, borderRadius: "var(--radius-md)" }} />
                ))}
              </div>
            ) : pinModalPosts.length > 0 ? (
              <div className="flex flex-col gap-12">
                {pinModalPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex justify-between items-center gap-12"
                    style={{ padding: "12px 0", borderBottom: "1px solid rgba(196,199,199,0.2)" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="text-label-md text-primary" style={{ marginBottom: 4 }}>
                        {post.title ?? post.content.slice(0, 60)}
                      </p>
                      <p className="text-caption text-on-surface-variant">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        {post.isPinned ? " • Pinned" : ""}
                      </p>
                    </div>
                    <Button
                      variant={post.isPinned ? "outline" : "primary"}
                      size="sm"
                      onClick={() => handleTogglePin(post)}
                      disabled={pinningPostId === post.id}
                    >
                      {pinningPostId === post.id ? "..." : post.isPinned ? "Unpin" : "Pin"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                You have no discussions yet.{" "}
                <button type="button" className="text-primary" style={{ background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }} onClick={() => { setShowPinModal(false); handleNewDiscussion(); }}>
                  Start one
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
