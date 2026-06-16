import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Aggregation for comments count on posts
export const onCommentAdded = functions.firestore
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

export const onCommentRemoved = functions.firestore
  .document('posts/{postId}/comments/{commentId}')
  .onDelete(async (snap, context) => {
    const postId = context.params.postId;
    
    try {
      await db.collection("posts").doc(postId).update({
        commentCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Failed to decrement comment count for post ${postId}`, error);
    }
  });
