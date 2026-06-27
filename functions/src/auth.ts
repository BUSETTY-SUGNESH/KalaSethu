import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db } from './config';

export const onUserCreated = functions.region('asia-south1').auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;
  
  try {
    // Create the user profile in Firestore
    await db.collection("users").doc(uid).set({
      id: uid,
      email: email || "",
      displayName: displayName || "New User",
      avatarUrl: photoURL || "",
      role: "user",
      bio: "",
      isVerified: false,
      isEmailVerified: false,
      isPhoneVerified: false,
      isBanned: false,
      artworkCount: 0,
      followerCount: 0,
      followingCount: 0,
      salesCount: 0,
      totalRevenue: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Add welcome notification
    await db.collection("users").doc(uid).collection("notifications").add({
      userId: uid,
      title: "Welcome to KalaSetu!",
      message: `Hello ${displayName || "Art Lover"}! Welcome to KalaSetu, the social platform celebrating authentic heritage and artisan craftsmanship.`,
      type: "system",
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Successfully created profile for user: ${uid}`);
  } catch (error) {
    console.error(`Failed to create profile for user: ${uid}`, error);
  }
});

export const onUserDeleted = functions.region('asia-south1').auth.user().onDelete(async (user) => {
  const { uid } = user;
  
  try {
    // Delete user profile
    await db.collection("users").doc(uid).delete();
    // In a real app, you might also clean up other resources (artworks, bids, etc)
    // or just mark the account as 'deleted' to preserve history
    console.log(`Successfully deleted profile for user: ${uid}`);
  } catch (error) {
    console.error(`Failed to delete profile for user: ${uid}`, error);
  }
});
