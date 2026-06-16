import * as admin from "firebase-admin";

// Initialize Firebase Admin globally
admin.initializeApp();

// Export modules
export * from "./auth";
export * from "./artwork";
export * from "./auction";
export * from "./payment";
export * from "./order";
export * from "./community";
export * from "./notification";
export * from "./admin";
