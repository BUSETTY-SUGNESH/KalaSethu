// ============================================================
// KalaSetu — Community Repository (Firestore Implementation)
// Handles posts, comments, likes, follows, and bookmarks.
// ============================================================
import {
  collections,
  subcollections,
  docRef,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  db,
  query,
  where,
  orderBy,
  limit,
  increment,
  onSnapshot,
  paginatedQuery,
  type DocumentSnapshot,
  type Unsubscribe,
  type QueryConstraint,
} from '@/lib/firebase/firestore';
import { emptyPaginatedResult, isValidQueryString } from '@/lib/firebase/query-guards';
import { functions } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';
import type { Post, Comment, Follow, Bookmark, PaginatedResult, CommunityContributor, UserRole } from '@/app/types';

export const communityRepository = {
  // ── Posts ──────────────────────────────────────────────────
  // Composite indexes (firestore.indexes.json → collectionGroup: posts):
  //   getFeed / getRecentPosts → createdAt DESC (single-field, automatic)
  //   getTrending              → isTrending ASC + likeCount DESC
  //   getByAuthor              → authorId ASC + createdAt DESC
  //   getByCategory            → category ASC + createdAt DESC

  async findPost(id: string): Promise<Post | null> {
    const snap = await getDoc(docRef.post(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Post;
  },

  async createPost(data: Omit<Post, 'id'>): Promise<string> {
    const ref = await addDoc(collections.posts(), data);
    return ref.id;
  },

  async deletePost(id: string): Promise<void> {
    await deleteDoc(docRef.post(id));
  },

  async updatePost(id: string, data: Partial<Post>): Promise<void> {
    const { id: _id, createdAt: _ca, ...rest } = data;
    await updateDoc(docRef.post(id), {
      ...rest,
      updatedAt: new Date().toISOString(),
    });
  },

  async getFeed(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Post>> {
    return paginatedQuery<Post>(
      collections.posts(),
      [orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  async getTrending(count: number = 10): Promise<Post[]> {
    const q = query(
      collections.posts(),
      where('isTrending', '==', true),
      orderBy('likeCount', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Post);
  },

  async getByAuthor(
    userId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Post>> {
    if (!isValidQueryString(userId)) return emptyPaginatedResult<Post>();
    return paginatedQuery<Post>(
      collections.posts(),
      [where('authorId', '==', userId), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  async getByCategory(
    category: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<Post>> {
    if (!isValidQueryString(category)) return emptyPaginatedResult<Post>();
    return paginatedQuery<Post>(
      collections.posts(),
      [where('category', '==', category), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
  },

  async getRecentPosts(count: number = 100): Promise<Post[]> {
    const q = query(
      collections.posts(),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Post);
  },

  aggregateTopContributors(posts: Post[], limit: number = 5): CommunityContributor[] {
    const stats = new Map<string, {
      authorName: string;
      authorAvatarUrl?: string;
      authorRole?: UserRole;
      authorVerified: boolean;
      postCount: number;
      engagementScore: number;
    }>();

    for (const post of posts) {
      const existing = stats.get(post.authorId);
      const score = 2 + post.commentCount + post.likeCount;
      if (existing) {
        existing.postCount += 1;
        existing.engagementScore += score;
        if (!existing.authorAvatarUrl && post.authorAvatarUrl) {
          existing.authorAvatarUrl = post.authorAvatarUrl;
        }
        if (!existing.authorRole && post.authorRole) {
          existing.authorRole = post.authorRole;
        }
      } else {
        stats.set(post.authorId, {
          authorName: post.authorName,
          authorAvatarUrl: post.authorAvatarUrl,
          authorRole: post.authorRole,
          authorVerified: post.authorVerified,
          postCount: 1,
          engagementScore: score,
        });
      }
    }

    return Array.from(stats.entries())
      .map(([authorId, data]) => ({
        authorId,
        authorName: data.authorName,
        authorAvatarUrl: data.authorAvatarUrl,
        authorRole: data.authorRole ?? (data.authorVerified ? 'verified_artist' : 'user'),
        isVerified: data.authorVerified || data.authorRole === 'verified_artist',
        postCount: data.postCount,
        engagementScore: data.engagementScore,
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limit);
  },

  // ── Likes ──────────────────────────────────────────────────

  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const ref = doc(subcollections.postLikes(postId), userId);
    const snap = await getDoc(ref);
    return snap.exists();
  },

  async toggleLike(
    postId: string,
    userId: string,
    userName: string
  ): Promise<boolean> {
    const likeRef = doc(subcollections.postLikes(postId), userId);
    const snap = await getDoc(likeRef);
    if (snap.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(docRef.post(postId), { likeCount: increment(-1) });
      return false;
    } else {
      await setDoc(likeRef, { userId, userName, createdAt: new Date().toISOString() });
      await updateDoc(docRef.post(postId), { likeCount: increment(1) });
      return true;
    }
  },

  // ── Comments ───────────────────────────────────────────────

  async getComments(postId: string, pageSize: number = 50): Promise<Comment[]> {
    const q = query(
      subcollections.postComments(postId),
      where('parentCommentId', '==', null),
      orderBy('createdAt', 'asc'),
      limit(pageSize)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Comment);
  },

  async getReplies(
    postId: string,
    commentId: string,
    pageSize: number = 20
  ): Promise<Comment[]> {
    const q = query(
      subcollections.postComments(postId),
      where('parentCommentId', '==', commentId),
      orderBy('createdAt', 'asc'),
      limit(pageSize)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Comment);
  },

  async addComment(
    postId: string,
    data: Omit<Comment, 'id'>
  ): Promise<string> {
    const ref = await addDoc(subcollections.postComments(postId), data);
    if (data.parentCommentId) {
      const parentRef = doc(subcollections.postComments(postId), data.parentCommentId);
      await updateDoc(parentRef, { replyCount: increment(1) });
    }
    return ref.id;
  },

  // ── Follows ────────────────────────────────────────────────

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const snap = await getDoc(doc(subcollections.userFollowing(followerId), followingId));
    return snap.exists();
  },

  async follow(
    followerId: string,
    followerName: string,
    followingId: string,
    followingName: string
  ): Promise<void> {
    const followFn = httpsCallable(functions, 'followUser');
    await followFn({ followerName, followingId, followingName });
  },

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const unfollowFn = httpsCallable(functions, 'unfollowUser');
    await unfollowFn({ followingId });
  },

  async getFollowers(userId: string, max: number = 50): Promise<Follow[]> {
    if (!isValidQueryString(userId)) return [];
    const q = query(
      subcollections.userFollowers(userId),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Follow);
  },

  async getFollowing(userId: string, max: number = 50): Promise<Follow[]> {
    if (!isValidQueryString(userId)) return [];
    const q = query(
      subcollections.userFollowing(userId),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Follow);
  },

  // ── Bookmarks ──────────────────────────────────────────────

  async toggleBookmark(
    userId: string,
    targetId: string,
    targetType: Bookmark['targetType']
  ): Promise<boolean> {
    if (!isValidQueryString(userId) || !isValidQueryString(targetId)) {
      throw new Error('Invalid bookmark parameters');
    }
    const q = query(
      collections.favorites(),
      where('userId', '==', userId),
      where('targetId', '==', targetId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      await deleteDoc(snap.docs[0].ref);
      return false;
    }
    await addDoc(collections.favorites(), {
      userId,
      targetId,
      targetType,
      createdAt: new Date().toISOString(),
    });
    return true;
  },

  async getUserBookmarks(
    userId: string,
    targetType?: Bookmark['targetType']
  ): Promise<Bookmark[]> {
    if (!isValidQueryString(userId)) return [];
    const constraints: QueryConstraint[] = [where('userId', '==', userId)];
    if (targetType) constraints.push(where('targetType', '==', targetType));
    constraints.push(orderBy('createdAt', 'desc'));
    const q = query(collections.favorites(), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Bookmark);
  },
};
