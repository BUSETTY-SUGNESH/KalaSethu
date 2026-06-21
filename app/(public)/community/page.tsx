'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getFeedPosts } from "@/lib/services/community-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Post } from "@/app/types";
import { formatDistanceToNow } from "date-fns";

// Role badge shown on every post author line
function RoleBadge({ role }: { role: string }) {
  const isArtistRole = role === "artist" || role === "verified_artist";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        backgroundColor: isArtistRole
          ? "rgba(var(--color-accent-gold-rgb, 201,160,80), 0.15)"
          : "rgba(var(--color-primary-rgb, 82,67,54), 0.1)",
        color: isArtistRole ? "var(--color-accent-gold)" : "var(--color-primary)",
        border: `1px solid ${isArtistRole ? "var(--color-accent-gold)" : "var(--color-primary)"}`,
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 11 }}
      >
        {isArtistRole ? "palette" : "person"}
      </span>
      {isArtistRole ? "Seller" : "Buyer"}
    </span>
  );
}

export default function CommunityPage() {
  const router = useRouter();
  const { isAuthenticated, isArtist, user } = useAuthStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");

  useEffect(() => {
    async function loadPosts() {
      try {
        const result = await getFeedPosts(20);
        setPosts(result.data);
      } catch (error) {
        console.error("Failed to load posts", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPosts();
  }, []);

  function handleNewDiscussion() {
    if (isAuthenticated) {
      setShowPostForm(true);
    } else {
      router.push('/login?redirect=/community');
    }
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
              {/* Role Legend */}
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
                  <Button variant="primary" size="md">Post Discussion</Button>
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
            <div className="flex gap-24 border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)", paddingBottom: 16 }}>
              <button className="text-label-md text-primary" style={{ paddingBottom: 14, borderBottom: "2px solid var(--color-primary)", marginBottom: -17 }} suppressHydrationWarning>Latest</button>
              <button className="text-label-md text-on-surface-variant" suppressHydrationWarning>Trending</button>
              <button className="text-label-md text-on-surface-variant" suppressHydrationWarning>Techniques</button>
              <button className="text-label-md text-on-surface-variant" suppressHydrationWarning>Provenance</button>
              {/* Seller-only filter tab */}
              {isArtist() && (
                <button className="text-label-md text-on-surface-variant" suppressHydrationWarning>My Posts</button>
              )}
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
                    className={`thread-item ${post.isTrending ? 'active-thread' : 'inactive-thread'}`}
                    style={{ borderLeftWidth: 3, paddingLeft: 20, marginBottom: 0, display: "block" }}
                  >
                    <div className="flex justify-between items-start">
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-8 mb-2" style={{ marginBottom: 8, flexWrap: "wrap" }}>
                          {post.tags && post.tags.length > 0 && (
                            <span className="text-label-sm uppercase bg-surface-container-high text-on-surface px-2 py-1 rounded" style={{ padding: "2px 8px", borderRadius: 4 }}>
                              {post.tags[0]}
                            </span>
                          )}
                          {/* Role Badge on each post */}
                          <RoleBadge role={post.authorVerified ? "verified_artist" : "user"} />
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
                  <p className="text-body-lg text-on-surface-variant">No discussions yet. Be the first to post!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-32">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6" style={{ border: "1px solid rgba(196, 199, 199, 0.2)", borderRadius: "var(--radius-lg)", padding: 24 }}>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Top Contributors</h3>
              <div className="flex flex-col gap-16">
                {[
                  { name: "Prof. K. Iyer", role: "Historian", userRole: "user", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwJlulKZjpPmd-6a2h5G6AbOOFyYz7zE9LlAwyGcRChBYoAPL9R9mjt-C0525alfJk4yEXwpUhhR_IpWw7z95hBGpGXn7oQ5ai1oIHCBJvoHQS5txRfWMGGRpf0ZTowVPizUw8d6mZ0mRC6L5LBfdUgGtILI4HYDrj8NeB1NRMG30hgZc2VL1z7YW0t2AIm_xiiGp4geGfeyayLm7fkhLan2roWFJdI1Z2o3_yXgbwrqWQSOpuUEJOTxgMpHqU8N5jHG6OUQkjbku_" },
                  { name: "Arun Sharma", role: "Master Artisan", userRole: "verified_artist", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9Nl4KAeLTkOxgSkftwoUkycNLcgMiXyRcyOC7cDH0unfRLptrT3zB7nQtdTQy8EUNLcJ5LX-HtWb3-P4QSMgZ_N0CXsbyNRvlmIjh6bTlCImv5GfUQBJi9TXzpJIx0LRPBaMbE9ufV26-po5glJ1KCm8L0L7_b2AGG_hRJYLnkKbSumOD8uv36xjarsOb3UVUO2_Wa9wsb0yQeg4aogK8cupTL7ZVZN8JcZRY_vxKJrfxrt7riLYWOgVYmSXFi3j3Fa2XolbH9bFm" },
                ].map((u) => (
                  <div key={u.name} className="flex items-center gap-12">
                    <img src={u.img} alt={u.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                    <div>
                      <h4 className="text-label-md text-primary flex items-center gap-4" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {u.name}
                        <Icon name="verified" size={14} className="text-accent-emerald" />
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <span className="text-caption text-on-surface-variant">{u.role}</span>
                        <RoleBadge role={u.userRole} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seller-only: Pin or promote a post */}
            {isArtist() && (
              <div className="card" style={{ padding: 24, backgroundColor: "var(--color-surface-container-lowest)" }}>
                <h3 className="text-headline-sm text-primary" style={{ marginBottom: 12 }}>Seller Tools</h3>
                <div className="flex flex-col gap-12">
                  <button className="btn btn-outline" style={{ width: "100%", justifyContent: "flex-start", gap: 8, display: "flex", alignItems: "center" }}>
                    <Icon name="push_pin" size={18} />
                    Pin a Discussion
                  </button>
                  <button className="btn btn-outline" style={{ width: "100%", justifyContent: "flex-start", gap: 8, display: "flex", alignItems: "center" }}>
                    <Icon name="campaign" size={18} />
                    Announce Event
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
