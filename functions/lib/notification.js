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
exports.cleanupOldNotifications = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const config_1 = require("./config");
// Cleanup old notifications (e.g., older than 30 days) to save space
exports.cleanupOldNotifications = functions.region('asia-south1').pubsub.schedule('every 24 hours').onRun(async (context) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    try {
        let deletedCount = 0;
        let hasMore = true;
        while (hasMore) {
            const oldNotifsSnapshot = await config_1.db.collectionGroup('notifications')
                .where('createdAt', '<', thirtyDaysAgo)
                .limit(500)
                .get();
            if (oldNotifsSnapshot.empty) {
                hasMore = false;
                break;
            }
            const batch = config_1.db.batch();
            oldNotifsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                deletedCount++;
            });
            await batch.commit();
            if (oldNotifsSnapshot.size < 500) {
                hasMore = false;
            }
        }
        console.log(`Successfully cleaned up ${deletedCount} old notifications`);
    }
    catch (error) {
        console.error("Error cleaning up notifications", error);
    }
    return null;
});
//# sourceMappingURL=notification.js.map