"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserDeleted = exports.onUserCreated = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
exports.onUserCreated = functions.region('asia-south1').auth.user().onCreate(async (user) => {
    const { uid, email, displayName, photoURL } = user;
    try {
        // Create the user profile in Firestore
        await config_1.db.collection("users").doc(uid).set({
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
        await config_1.db.collection("users").doc(uid).collection("notifications").add({
            userId: uid,
            title: "Welcome to KalaSetu!",
            message: `Hello ${displayName || "Art Lover"}! Welcome to KalaSetu, the social platform celebrating authentic heritage and artisan craftsmanship.`,
            type: "system",
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Successfully created profile for user: ${uid}`);
    }
    catch (error) {
        console.error(`Failed to create profile for user: ${uid}`, error);
    }
});
exports.onUserDeleted = functions.region('asia-south1').auth.user().onDelete(async (user) => {
    const { uid } = user;
    try {
        // Delete user profile
        await config_1.db.collection("users").doc(uid).delete();
        // In a real app, you might also clean up other resources (artworks, bids, etc)
        // or just mark the account as 'deleted' to preserve history
        console.log(`Successfully deleted profile for user: ${uid}`);
    }
    catch (error) {
        console.error(`Failed to delete profile for user: ${uid}`, error);
    }
});
//# sourceMappingURL=auth.js.map