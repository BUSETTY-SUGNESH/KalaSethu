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

export default function CommunityPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      router.push('/dashboard/community/new');
    } else {
      router.push('/login?redirect=/dashboard/community/new');
    }
  }

  return (
    <>
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
            </div>
            <div>
              <Button variant="primary" size="lg" icon="add" iconPosition="left" onClick={handleNewDiscussion}>
                New Discussion
              </Button>
            </div>
          </div>
        </div>
      </div>

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
                      <div>
                        <div className="flex items-center gap-8 mb-2" style={{ marginBottom: 8 }}>
                          {post.tags && post.tags.length > 0 && (
                            <span className="text-label-sm uppercase bg-surface-container-high text-on-surface px-2 py-1 rounded" style={{ padding: "2px 8px", borderRadius: 4 }}>
                              {post.tags[0]}
                            </span>
                          )}
                          <span className="text-caption text-on-surface-variant">
                            Posted by {post.authorName} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
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
                  { name: "Prof. K. Iyer", role: "Historian", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwJlulKZjpPmd-6a2h5G6AbOOFyYz7zE9LlAwyGcRChBYoAPL9R9mjt-C0525alfJk4yEXwpUhhR_IpWw7z95hBGpGXn7oQ5ai1oIHCBJvoHQS5txRfWMGGRpf0ZTowVPizUw8d6mZ0mRC6L5LBfdUgGtILI4HYDrj8NeB1NRMG30hgZc2VL1z7YW0t2AIm_xiiGp4geGfeyayLm7fkhLan2roWFJdI1Z2o3_yXgbwrqWQSOpuUEJOTxgMpHqU8N5jHG6OUQkjbku_" },
                  { name: "Arun Sharma", role: "Master Artisan", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9Nl4KAeLTkOxgSkftwoUkycNLcgMiXyRcyOC7cDH0unfRLptrT3zB7nQtdTQy8EUNLcJ5LX-HtWx3-P4QSMgZ_N0CXsbyNRvlmIjh6bTlCImv5GfUQBJi9TXzpJIx0LRPBaMbE9ufV26-po5glJ1KCm8L0L7_b2AGG_hRJYLnkKbSumOD8uv36xjarsOb3UVUO2_Wa9wsb0yQeg4aogK8cupTL7ZVZN8JcZRY_vxKJrfxrt7riLYWOgVYmSXFi3j3Fa2XolbH9bFm" }
                ].map((user) => (
                  <div key={user.name} className="flex items-center gap-12">
                    <img src={user.img} alt={user.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                    <div>
                      <h4 className="text-label-md text-primary flex items-center gap-4">
                        {user.name} <Icon name="verified" size={14} className="text-accent-emerald" />
                      </h4>
                      <p className="text-caption text-on-surface-variant">{user.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
