'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getPost, getComments, addComment, toggleLikePost, hasUserLikedPost } from "@/lib/services/community-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import type { Post, Comment } from "@/app/types";
import { formatDistanceToNow, format } from "date-fns";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    if (!postId) return;

    async function loadData() {
      try {
        const [postData, commentsData] = await Promise.all([
          getPost(postId),
          getComments(postId)
        ]);
        
        if (postData) setPost(postData);
        setComments(commentsData);
        if (postData && user) {
          setHasLiked(await hasUserLikedPost(postData.id, user.id));
        }
      } catch (error) {
        console.error("Failed to load post data", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [postId, user]);

  async function handleLike() {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    if (isLiking || !post) return;
    
    setIsLiking(true);
    try {
      const liked = await toggleLikePost(post.id, user.id, user.displayName);
      setHasLiked(liked);
      setPost(prev => prev ? { ...prev, likeCount: Math.max(0, prev.likeCount + (liked ? 1 : -1)) } : prev);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLiking(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    
    if (!newComment.trim() || !post) return;
    
    setIsSubmitting(true);
    try {
      const commentId = await addComment(post.id, user.id, user.displayName, user.avatarUrl, newComment.trim());
      const newCommentObj: Comment = {
        id: commentId,
        postId: post.id,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatarUrl: user.avatarUrl,
        content: newComment.trim(),
        likeCount: 0,
        replyCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setComments(prev => [newCommentObj, ...prev]);
      setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
      setNewComment("");
      addToast({ type: 'success', title: 'Reply posted', message: 'Your reply has been added to the discussion.' });
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Failed to post', message: 'Could not add your reply at this time.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container section-gap flex justify-center py-64">
        <div className="skeleton" style={{ width: "100%", height: 400, borderRadius: "var(--radius-lg)" }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container section-gap empty-state">
        <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>forum</span>
        <h1 className="text-display-sm text-primary">Discussion Not Found</h1>
        <p className="text-body-lg text-on-surface-variant">This post may have been removed.</p>
        <Link href="/community">
          <Button variant="primary" style={{ marginTop: 24 }}>Back to CharchaSabha</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="breadcrumb">
          <Link href="/community">CharchaSabha</Link>
          <Icon name="chevron_right" size={16} />
          <span className="current">Discussion</span>
        </div>
      </div>

      <section className="container section-gap">
        <div className="split-layout">
          {/* Main Content */}
          <div className="flex flex-col gap-32">
            {/* Original Post */}
            <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
              <div className="flex items-center gap-16" style={{ marginBottom: 24 }}>
                <Link href={`/profile/${post.authorId}`} className="avatar avatar-lg" style={{ backgroundColor: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: "bold", textDecoration: "none" }}>
                  {post.authorName.charAt(0)}
                </Link>
                <div>
                  <Link href={`/profile/${post.authorId}`} className="text-label-lg text-primary hover:underline block">
                    {post.authorName}
                  </Link>
                  <span className="text-caption text-on-surface-variant block mt-4">
                    {format(new Date(post.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>

              <h1 className="text-headline-lg text-primary" style={{ marginBottom: 16 }}>{post.title}</h1>
              
              <div className="text-body-lg text-on-surface" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 24 }}>
                {post.content}
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex gap-8" style={{ marginBottom: 24 }}>
                  {post.tags.map(tag => (
                    <span key={tag} className="text-caption uppercase bg-surface-container-high text-on-surface px-2 py-1 rounded" style={{ padding: "4px 12px", borderRadius: 16 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-24 pt-16 border-t border-outline-variant" style={{ borderTop: "1px solid rgba(196, 199, 199, 0.2)", paddingTop: 16 }}>
                <button 
                  onClick={handleLike}
                  disabled={isLiking}
                  className="flex items-center gap-8 text-on-surface-variant hover:text-accent-terracotta transition-colors"
                >
                  <Icon name={hasLiked ? "favorite" : "favorite_border"} />
                  <span className="text-label-md">{post.likeCount} Likes</span>
                </button>
                <div className="flex items-center gap-8 text-on-surface-variant">
                  <Icon name="chat_bubble_outline" />
                  <span className="text-label-md">{post.commentCount} Replies</span>
                </div>
                <button className="flex items-center gap-8 text-on-surface-variant hover:text-primary transition-colors ml-auto">
                  <Icon name="share" />
                  <span className="text-label-md">Share</span>
                </button>
              </div>
            </div>

            {/* Replies Section */}
            <div>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Replies ({comments.length})</h3>
              
              {/* Add Comment Form */}
              <div className="bg-surface-container-lowest" style={{ padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)", marginBottom: 32 }}>
                {isAuthenticated ? (
                  <form onSubmit={handleAddComment}>
                    <textarea 
                      className="form-textarea" 
                      placeholder="Add your thoughts to the discussion..." 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      style={{ minHeight: 120, marginBottom: 16 }}
                      required
                    />
                    <div className="flex justify-end">
                      <Button variant="primary" type="submit" disabled={isSubmitting || !newComment.trim()}>
                        {isSubmitting ? "Posting..." : "Post Reply"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-16">
                    <p className="text-body-md text-on-surface-variant" style={{ marginBottom: 16 }}>
                      You must be logged in to participate in the discussion.
                    </p>
                    <Link href={`/login?redirect=/community/${postId}`}>
                      <Button variant="outline">Log In to Reply</Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Comments List */}
              <div className="flex flex-col gap-16">
                {comments.length > 0 ? (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-surface-container-low" style={{ padding: 24, borderRadius: "var(--radius-lg)" }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                        <div className="flex items-center gap-12">
                          <div className="avatar avatar-sm" style={{ backgroundColor: "var(--color-surface-container-high)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: "bold" }}>
                            {comment.authorName.charAt(0)}
                          </div>
                          <div>
                            <span className="text-label-md text-primary">{comment.authorName}</span>
                            <span className="text-caption text-on-surface-variant block mt-2">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-body-md text-on-surface" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                        {comment.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-32 text-on-surface-variant">
                    No replies yet. Start the conversation!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-32">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6" style={{ border: "1px solid rgba(196, 199, 199, 0.2)", borderRadius: "var(--radius-lg)", padding: 24 }}>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>About the Author</h3>
              <div className="text-center">
                <div className="avatar avatar-xl mx-auto" style={{ backgroundColor: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: "bold", margin: "0 auto 16px" }}>
                  {post.authorName.charAt(0)}
                </div>
                <h4 className="text-title-md text-primary">{post.authorName}</h4>
                <p className="text-body-sm text-on-surface-variant mt-8">Member since {format(new Date(post.createdAt), "yyyy")}</p>
                <Link href={`/profile/${post.authorId}`}>
                  <Button variant="outline" size="sm" fullWidth style={{ marginTop: 16 }}>View Profile</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
