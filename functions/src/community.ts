import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db } from './config';
import { assertAppCheck } from './utils/app-check';
import { assertRateLimit } from './utils/rate-limit';
import { validateFollowPayload, validateChatMessagePayload } from './utils/schema-validation';

// Aggregation for comments count on posts
export const onCommentAdded = functions.region('asia-south1').firestore
  .document('posts/{postId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const postId = context.params.postId;
    
    try {
      await db.collection("posts").doc(postId).update({
        commentCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Failed to update comment count for post ${postId}`, error);
    }
  });

export const onCommentRemoved = functions.region('asia-south1').firestore
  .document('posts/{postId}/comments/{commentId}')
  .onDelete(async (snap, context) => {
    const postId = context.params.postId;
    
    try {
      const postRef = db.collection("posts").doc(postId);
      await db.runTransaction(async (transaction) => {
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists) return;
        const currentCount = (postSnap.data()?.commentCount as number) ?? 0;
        if (currentCount <= 0) return;
        transaction.update(postRef, {
          commentCount: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
    } catch (error) {
      console.error(`Failed to decrement comment count for post ${postId}`, error);
    }
  });

export const onFollowerAdded = functions.region('asia-south1').firestore
  .document('users/{userId}/followers/{followerId}')
  .onCreate(async (_snap, context) => {
    const userId = context.params.userId;
    try {
      await db.collection('users').doc(userId).update({
        followerCount: admin.firestore.FieldValue.increment(1),
      });
    } catch (error) {
      console.error(`Failed to increment followerCount for user ${userId}`, error);
    }
  });

export const onFollowerRemoved = functions.region('asia-south1').firestore
  .document('users/{userId}/followers/{followerId}')
  .onDelete(async (_snap, context) => {
    const userId = context.params.userId;
    try {
      const userRef = db.collection('users').doc(userId);
      await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) return;
        const currentCount = (userSnap.data()?.followerCount as number) ?? 0;
        if (currentCount <= 0) return;
        transaction.update(userRef, {
          followerCount: admin.firestore.FieldValue.increment(-1),
        });
      });
    } catch (error) {
      console.error(`Failed to decrement followerCount for user ${userId}`, error);
    }
  });

export const onFollowingAdded = functions.region('asia-south1').firestore
  .document('users/{userId}/following/{targetId}')
  .onCreate(async (_snap, context) => {
    const userId = context.params.userId;
    try {
      await db.collection('users').doc(userId).update({
        followingCount: admin.firestore.FieldValue.increment(1),
      });
    } catch (error) {
      console.error(`Failed to increment followingCount for user ${userId}`, error);
    }
  });

export const onFollowingRemoved = functions.region('asia-south1').firestore
  .document('users/{userId}/following/{targetId}')
  .onDelete(async (_snap, context) => {
    const userId = context.params.userId;
    try {
      const userRef = db.collection('users').doc(userId);
      await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) return;
        const currentCount = (userSnap.data()?.followingCount as number) ?? 0;
        if (currentCount <= 0) return;
        transaction.update(userRef, {
          followingCount: admin.firestore.FieldValue.increment(-1),
        });
      });
    } catch (error) {
      console.error(`Failed to decrement followingCount for user ${userId}`, error);
    }
  });

export const followUser = functions.region('asia-south1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'followUser');

  const followerId = context.auth.uid;
  const followerName = typeof data.followerName === 'string' ? data.followerName : 'User';
  validateFollowPayload({
    followingId: data.followingId,
    followingName: data.followingName,
  });

  if (followerId === data.followingId) {
    throw new functions.https.HttpsError('invalid-argument', 'Cannot follow yourself');
  }

  const now = new Date().toISOString();
  const batch = db.batch();
  batch.set(
    db.collection('users').doc(followerId).collection('following').doc(data.followingId),
    { userId: data.followingId, userName: data.followingName, createdAt: now }
  );
  batch.set(
    db.collection('users').doc(data.followingId).collection('followers').doc(followerId),
    { userId: followerId, userName: followerName, createdAt: now }
  );
  await batch.commit();

  return { success: true };
});

export const unfollowUser = functions.region('asia-south1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'unfollowUser');

  const followerId = context.auth.uid;
  const { followingId } = data;
  if (!followingId || typeof followingId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid followingId');
  }

  const batch = db.batch();
  batch.delete(db.collection('users').doc(followerId).collection('following').doc(followingId));
  batch.delete(db.collection('users').doc(followingId).collection('followers').doc(followerId));
  await batch.commit();

  return { success: true };
});

export const sendChatMessage = functions.region('asia-south1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'sendChatMessage');

  const senderId = context.auth.uid;
  validateChatMessagePayload({
    chatRoomId: data.chatRoomId,
    senderId,
    senderName: data.senderName,
    type: data.type || 'text',
    content: data.content,
    mediaUrl: data.mediaUrl,
    artworkId: data.artworkId,
  });

  if (data.senderId && data.senderId !== senderId) {
    throw new functions.https.HttpsError('permission-denied', 'Sender mismatch');
  }

  const roomSnap = await db.collection('chatRooms').doc(data.chatRoomId).get();
  if (!roomSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Chat room not found');
  }

  const participants: string[] = roomSnap.data()?.participants || [];
  if (!participants.includes(senderId)) {
    throw new functions.https.HttpsError('permission-denied', 'Not a room participant');
  }

  const now = new Date().toISOString();
  const messageRef = db.collection('chatRooms').doc(data.chatRoomId).collection('messages').doc();
  await messageRef.set({
    chatRoomId: data.chatRoomId,
    senderId,
    senderName: data.senderName,
    type: data.type || 'text',
    content: data.content,
    mediaUrl: data.mediaUrl || null,
    artworkId: data.artworkId || null,
    readBy: [senderId],
    createdAt: now,
    isDeleted: false,
  });

  await db.collection('chatRooms').doc(data.chatRoomId).update({
    lastMessage: data.content,
    lastMessageAt: now,
    lastMessageBy: senderId,
    updatedAt: now,
  });

  return { success: true, messageId: messageRef.id };
});
