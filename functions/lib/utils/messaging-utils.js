"use strict";
/** Shared helpers for DM and channel messaging Cloud Functions */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMentionUserIds = parseMentionUserIds;
exports.buildContentLower = buildContentLower;
exports.truncatePreview = truncatePreview;
exports.lastMessagePreview = lastMessagePreview;
exports.resolveUserDisplayName = resolveUserDisplayName;
exports.shouldNotifyUser = shouldNotifyUser;
function parseMentionUserIds(content) {
    const matches = content.match(/@([a-zA-Z0-9_-]{1,64})/g) || [];
    return [...new Set(matches.map((m) => m.slice(1)))];
}
function buildContentLower(content) {
    return content.toLowerCase().slice(0, 500);
}
function truncatePreview(content, max = 200) {
    const plain = content.replace(/[*_~`>#]/g, '').trim();
    return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}
function lastMessagePreview(messageType, content) {
    if (messageType === 'image')
        return 'Photo';
    if (messageType === 'artwork')
        return 'Shared an artwork';
    if (messageType === 'system')
        return content.substring(0, 100);
    return truncatePreview(content, 200);
}
async function resolveUserDisplayName(db, uid, fallback) {
    const fromClient = typeof fallback === 'string' ? fallback.trim() : '';
    if (fromClient)
        return fromClient;
    const snap = await db.collection('users').doc(uid).get();
    const data = snap.data();
    const fromDoc = typeof data?.displayName === 'string' ? data.displayName.trim() : '';
    if (fromDoc)
        return fromDoc;
    const email = typeof data?.email === 'string' ? data.email.split('@')[0]?.trim() : '';
    return email || 'User';
}
async function shouldNotifyUser(db, userId, notifKey) {
    try {
        const userSnap = await db.collection('users').doc(userId).get();
        const prefs = userSnap.data()?.preferences?.notifications;
        if (prefs && typeof prefs === 'object' && notifKey in prefs) {
            return prefs[notifKey] !== false;
        }
    }
    catch {
        // default to notify
    }
    return true;
}
//# sourceMappingURL=messaging-utils.js.map