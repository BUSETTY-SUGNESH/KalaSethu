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
exports.assertFeatureEnabled = assertFeatureEnabled;
exports.assertNotInMaintenance = assertNotInMaintenance;
const functions = __importStar(require("firebase-functions/v1"));
const config_1 = require("../config");
const DEFAULT_FLAGS = {
    maintenance_mode: false,
    enable_auctions: true,
    enable_social_feed: true,
    enable_artwork_uploads: true,
};
let cache = null;
const CACHE_TTL_MS = 30_000;
async function loadFeatureFlags() {
    const now = Date.now();
    if (cache && cache.expiresAt > now) {
        return cache.flags;
    }
    const flags = { ...DEFAULT_FLAGS };
    const snap = await config_1.db.collection('featureFlags').get();
    for (const doc of snap.docs) {
        if (doc.id in flags) {
            flags[doc.id] = doc.data().enabled === true;
        }
    }
    cache = { flags, expiresAt: now + CACHE_TTL_MS };
    return flags;
}
async function assertFeatureEnabled(flagId, disabledMessage) {
    const flags = await loadFeatureFlags();
    const enabled = flags[flagId] ?? DEFAULT_FLAGS[flagId] ?? true;
    if (!enabled) {
        throw new functions.https.HttpsError('failed-precondition', disabledMessage || `Feature "${flagId}" is currently disabled.`);
    }
}
async function assertNotInMaintenance(uid) {
    const flags = await loadFeatureFlags();
    if (!flags.maintenance_mode) {
        return;
    }
    if (uid) {
        const snap = await config_1.db.collection('users').doc(uid).get();
        const role = snap.data()?.role;
        if (role === 'admin') {
            return;
        }
    }
    throw new functions.https.HttpsError('failed-precondition', 'The platform is in maintenance mode. Please try again later.');
}
//# sourceMappingURL=feature-flags.js.map