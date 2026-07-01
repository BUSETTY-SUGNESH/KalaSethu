import * as admin from "firebase-admin";

// Initialize Firebase Admin globally
admin.initializeApp();

// Export modules
export * from "./auth";
export * from "./artwork";
export * from "./auction";
export * from "./events";
export * from "./payment";
export * from "./order";
export * from "./community";
export * from "./messaging";
export * from "./community-provisioning";
export * from "./notification";
export * from "./admin";
