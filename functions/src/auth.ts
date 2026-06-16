import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;
  
  try {
    // Create the user profile in Firestore
    await db.collection("users").doc(uid).set({
      id: uid,
      email: email || "",
      displayName: displayName || "New User",
      avatarUrl: photoURL || "",
      role: "collector",
      bio: "",
      isVerified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      followerCount: 0,
      followingCount: 0
    });
    
    console.log(`Successfully created profile for user: ${uid}`);
  } catch (error) {
    console.error(`Failed to create profile for user: ${uid}`, error);
  }
});

export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
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
