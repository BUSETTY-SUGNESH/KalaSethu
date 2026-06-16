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
import type { Post, Comment, Follow, Bookmark, PaginatedResult } from '@/app/types';

export const communityRepository = {
  // ── Posts ──────────────────────────────────────────────────

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
    return paginatedQuery<Post>(
      collections.posts(),
      [where('authorId', '==', userId), orderBy('createdAt', 'desc')],
      pageSize,
      lastDoc
    );
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
      where('parentCommentId', '==', undefined),
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
    await updateDoc(docRef.post(postId), { commentCount: increment(1) });
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
    const now = new Date().toISOString();
    await setDoc(
      doc(subcollections.userFollowing(followerId), followingId),
      { userId: followingId, userName: followingName, createdAt: now }
    );
    await setDoc(
      doc(subcollections.userFollowers(followingId), followerId),
      { userId: followerId, userName: followerName, createdAt: now }
    );
    await updateDoc(docRef.user(followerId), { followingCount: increment(1) });
    await updateDoc(docRef.user(followingId), { followerCount: increment(1) });
  },

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await deleteDoc(doc(subcollections.userFollowing(followerId), followingId));
    await deleteDoc(doc(subcollections.userFollowers(followingId), followerId));
    await updateDoc(docRef.user(followerId), { followingCount: increment(-1) });
    await updateDoc(docRef.user(followingId), { followerCount: increment(-1) });
  },

  async getFollowers(userId: string, max: number = 50): Promise<Follow[]> {
    const q = query(
      subcollections.userFollowers(userId),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Follow);
  },

  async getFollowing(userId: string, max: number = 50): Promise<Follow[]> {
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
    const constraints: QueryConstraint[] = [where('userId', '==', userId)];
    if (targetType) constraints.push(where('targetType', '==', targetType));
    constraints.push(orderBy('createdAt', 'desc'));
    const q = query(collections.favorites(), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Bookmark);
  },
};
