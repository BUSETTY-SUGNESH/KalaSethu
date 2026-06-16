// ============================================================
// KalaSetu — Community Service (Posts, Likes, Comments, Follow)
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { communityRepository } from '@/lib/repositories';
import type {
  Post,
  Comment,
  Follow,
  Bookmark,
  PaginatedResult,
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
  }
): Promise<string> {
  const now = new Date().toISOString();
  const post: Omit<Post, 'id'> = {
    authorId,
    authorName,
    authorAvatarUrl,
    authorVerified,
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
    parentCommentId,
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
