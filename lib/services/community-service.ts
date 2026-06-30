// ============================================================
// KalaSetu — Community Service (Posts, Likes, Comments, Follow)
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { communityRepository, userRepository } from '@/lib/repositories';
import type {
  Post,
  Comment,
  Follow,
  Bookmark,
  PaginatedResult,
  CommunityContributor,
  UserRole,
} from '@/app/types';
import type { DocumentSnapshot } from '@/lib/firebase/firestore';

// ── Posts ────────────────────────────────────────────────────

export async function createPost(
  authorId: string,
  authorName: string,
  authorAvatarUrl: string | undefined,
  authorVerified: boolean,
  data: {
    title?: string;
    content: string;
    type: Post['type'];
    mediaUrls?: string[];
    category?: string;
    tags?: string[];
    artworkId?: string;
    artworkTitle?: string;
    artworkImageUrl?: string;
    authorRole?: UserRole;
  }
): Promise<string> {
  const now = new Date().toISOString();
  const post: Omit<Post, 'id'> = {
    authorId,
    authorName,
    authorAvatarUrl,
    authorVerified,
    authorRole: data.authorRole,
    type: data.type,
    title: data.title,
    content: data.content,
    mediaUrls: data.mediaUrls || [],
    artworkId: data.artworkId,
    artworkTitle: data.artworkTitle,
    artworkImageUrl: data.artworkImageUrl,
    category: data.category,
    tags: data.tags || [],
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    viewCount: 0,
    isTrending: false,
    createdAt: now,
    updatedAt: now,
  };

  return communityRepository.createPost(post);
}

export async function getPost(postId: string): Promise<Post | null> {
  return communityRepository.findPost(postId);
}

export async function getFeedPosts(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Post>> {
  return communityRepository.getFeed(pageSize, lastDoc);
}

export async function getTrendingPosts(count: number = 10): Promise<Post[]> {
  return communityRepository.getTrending(count);
}

export async function getUserPosts(
  userId: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Post>> {
  return communityRepository.getByAuthor(userId, pageSize, lastDoc);
}

export async function getPostsByCategory(
  category: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Post>> {
  return communityRepository.getByCategory(category, pageSize, lastDoc);
}

export async function pinPost(postId: string, userId: string): Promise<void> {
  const post = await communityRepository.findPost(postId);
  if (!post) throw new Error('Post not found');
  if (post.authorId !== userId) throw new Error('Only the author can pin this discussion');
  const now = new Date().toISOString();
  await communityRepository.updatePost(postId, {
    isPinned: true,
    pinnedAt: now,
    pinnedBy: userId,
  });
}

export async function unpinPost(postId: string, userId: string): Promise<void> {
  const post = await communityRepository.findPost(postId);
  if (!post) throw new Error('Post not found');
  if (post.authorId !== userId) throw new Error('Only the author can unpin this discussion');
  await communityRepository.updatePost(postId, { isPinned: false });
}

export async function getTopContributors(limit: number = 5): Promise<CommunityContributor[]> {
  const posts = await communityRepository.getRecentPosts(100);
  const contributors = communityRepository.aggregateTopContributors(posts, limit);

  const enriched = await Promise.all(
    contributors.map(async (contributor) => {
      try {
        const profile = await userRepository.findById(contributor.authorId);
        if (!profile) return contributor;
        return {
          ...contributor,
          specialty: profile.specialty ?? contributor.specialty,
          authorAvatarUrl: contributor.authorAvatarUrl ?? profile.avatarUrl,
          authorRole: contributor.authorRole ?? profile.role,
          isVerified: profile.isVerified || profile.role === 'verified_artist',
        };
      } catch {
        return contributor;
      }
    })
  );

  return enriched;
}

export async function deletePost(postId: string): Promise<void> {
  return communityRepository.deletePost(postId);
}

// ── Likes ───────────────────────────────────────────────────

export async function toggleLikePost(
  postId: string,
  userId: string,
  userName: string
): Promise<boolean> {
  return communityRepository.toggleLike(postId, userId, userName);
}

export async function hasUserLikedPost(
  postId: string,
  userId: string
): Promise<boolean> {
  return communityRepository.hasLiked(postId, userId);
}

// ── Comments ────────────────────────────────────────────────

export async function addComment(
  postId: string,
  authorId: string,
  authorName: string,
  authorAvatarUrl: string | undefined,
  content: string,
  parentCommentId?: string
): Promise<string> {
  const comment: Omit<Comment, 'id'> = {
    postId,
    authorId,
    authorName,
    authorAvatarUrl,
    content,
    likeCount: 0,
    parentCommentId: parentCommentId ?? null,
    replyCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return communityRepository.addComment(postId, comment);
}

export async function getComments(
  postId: string,
  pageSize: number = 50
): Promise<Comment[]> {
  return communityRepository.getComments(postId, pageSize);
}

export async function getCommentReplies(
  postId: string,
  commentId: string,
  pageSize: number = 20
): Promise<Comment[]> {
  return communityRepository.getReplies(postId, commentId, pageSize);
}

// ── Follow System ───────────────────────────────────────────

export async function followUser(
  followerId: string,
  followerName: string,
  followingId: string,
  followingName: string
): Promise<void> {
  return communityRepository.follow(followerId, followerName, followingId, followingName);
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<void> {
  return communityRepository.unfollow(followerId, followingId);
}

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  return communityRepository.isFollowing(followerId, followingId);
}

export async function getFollowers(
  userId: string,
  pageSize: number = 50
): Promise<Follow[]> {
  return communityRepository.getFollowers(userId, pageSize);
}

export async function getFollowing(
  userId: string,
  pageSize: number = 50
): Promise<Follow[]> {
  return communityRepository.getFollowing(userId, pageSize);
}

// ── Bookmarks ───────────────────────────────────────────────

export async function toggleBookmark(
  userId: string,
  targetId: string,
  targetType: Bookmark['targetType']
): Promise<boolean> {
  return communityRepository.toggleBookmark(userId, targetId, targetType);
}

export async function getUserBookmarks(
  userId: string,
  targetType?: Bookmark['targetType']
): Promise<Bookmark[]> {
  return communityRepository.getUserBookmarks(userId, targetType);
}
