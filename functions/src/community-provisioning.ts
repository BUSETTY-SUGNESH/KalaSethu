import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { db } from './config';
import { assertAppCheck } from './utils/app-check';
import { assertRateLimit } from './utils/rate-limit';

const REGION = 'asia-south1';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'community';
}

/** Idempotent — creates artist community with default channels */
export async function provisionArtistCommunity(
  ownerId: string,
  displayName: string,
  avatarUrl?: string
): Promise<string> {
  const existing = await db
    .collection('communities')
    .where('ownerId', '==', ownerId)
    .limit(1)
    .get();
  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const now = new Date().toISOString();
  const name = `${displayName}'s Studio`;
  const communityRef = db.collection('communities').doc();

  const batch = db.batch();
  batch.set(communityRef, {
    ownerId,
    name,
    slug: slugify(name),
    avatarUrl: avatarUrl || null,
    description: `Welcome to ${displayName}'s artisan community.`,
    followerCount: 0,
    memberCount: 1,
    isAutoProvisioned: true,
    settings: { announcementsReadOnly: true },
    createdAt: now,
    updatedAt: now,
  });

  batch.set(communityRef.collection('members').doc(ownerId), {
    userId: ownerId,
    communityId: communityRef.id,
    role: 'owner',
    displayName,
    avatarUrl: avatarUrl || null,
    isBanned: false,
    joinedAt: now,
  });

  const generalRef = communityRef.collection('channels').doc();
  batch.set(generalRef, {
    communityId: communityRef.id,
    name: 'general',
    type: 'text',
    topic: 'General discussion',
    position: 0,
    isDefault: true,
    isAnnouncements: false,
    unreadCount: {},
    createdAt: now,
    updatedAt: now,
  });

  const announcementsRef = communityRef.collection('channels').doc();
  batch.set(announcementsRef, {
    communityId: communityRef.id,
    name: 'announcements',
    type: 'text',
    topic: 'Updates from the artist',
    position: 1,
    isDefault: false,
    isAnnouncements: true,
    unreadCount: {},
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();
  return communityRef.id;
}

export async function joinCommunityMember(
  communityId: string,
  userId: string,
  displayName: string,
  avatarUrl?: string
): Promise<void> {
  const memberRef = db
    .collection('communities')
    .doc(communityId)
    .collection('members')
    .doc(userId);
  const existing = await memberRef.get();
  if (existing.exists && !existing.data()?.isBanned) return;

  const now = new Date().toISOString();
  await memberRef.set({
    userId,
    communityId,
    role: 'member',
    displayName,
    avatarUrl: avatarUrl || null,
    isBanned: false,
    joinedAt: now,
  }, { merge: true });

  await db.collection('communities').doc(communityId).update({
    memberCount: admin.firestore.FieldValue.increment(1),
    updatedAt: now,
  });
}

export const joinCommunity = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);

  const userId = context.auth.uid;
  const { communityId, displayName, avatarUrl } = data;
  if (!communityId) {
    throw new functions.https.HttpsError('invalid-argument', 'communityId required');
  }

  const communitySnap = await db.collection('communities').doc(communityId).get();
  if (!communitySnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Community not found');
  }

  await joinCommunityMember(communityId, userId, displayName || 'User', avatarUrl);
  return { success: true };
});

export const leaveCommunity = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);

  const userId = context.auth.uid;
  const { communityId } = data;
  const memberRef = db
    .collection('communities')
    .doc(communityId)
    .collection('members')
    .doc(userId);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    return { success: true };
  }
  if (memberSnap.data()?.role === 'owner') {
    throw new functions.https.HttpsError('failed-precondition', 'Owner cannot leave');
  }

  await memberRef.delete();
  await db.collection('communities').doc(communityId).update({
    memberCount: admin.firestore.FieldValue.increment(-1),
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
});

export const updateCommunity = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);

  const userId = context.auth.uid;
  const { communityId, name, description, avatarUrl, bannerUrl } = data;
  const memberSnap = await db
    .collection('communities')
    .doc(communityId)
    .collection('members')
    .doc(userId)
    .get();
  const role = memberSnap.data()?.role;
  if (!role || (role !== 'owner' && role !== 'admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (name) {
    updates.name = name;
    updates.slug = slugify(name);
  }
  if (description !== undefined) updates.description = description;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;

  await db.collection('communities').doc(communityId).update(updates);
  return { success: true };
});

export const createChannel = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);
  await assertRateLimit(context.auth.uid, 'createChannel');

  const userId = context.auth.uid;
  const { communityId, name, topic, isAnnouncements } = data;
  const memberSnap = await db
    .collection('communities')
    .doc(communityId)
    .collection('members')
    .doc(userId)
    .get();
  const role = memberSnap.data()?.role;
  if (!role || (role !== 'owner' && role !== 'admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
  }

  const channelsSnap = await db
    .collection('communities')
    .doc(communityId)
    .collection('channels')
    .orderBy('position', 'desc')
    .limit(1)
    .get();
  const position = channelsSnap.empty ? 0 : (channelsSnap.docs[0].data().position || 0) + 1;
  const now = new Date().toISOString();

  const ref = await db
    .collection('communities')
    .doc(communityId)
    .collection('channels')
    .add({
      communityId,
      name: name || 'new-channel',
      type: 'text',
      topic: topic || '',
      position,
      isDefault: false,
      isAnnouncements: !!isAnnouncements,
      unreadCount: {},
      createdAt: now,
      updatedAt: now,
    });

  return { success: true, channelId: ref.id };
});

export const updateChannel = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  assertAppCheck(context);

  const userId = context.auth.uid;
  const { communityId, channelId, name, topic } = data;
  const memberSnap = await db
    .collection('communities')
    .doc(communityId)
    .collection('members')
    .doc(userId)
    .get();
  const role = memberSnap.data()?.role;
  if (!role || (role !== 'owner' && role !== 'admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (name) updates.name = name;
  if (topic !== undefined) updates.topic = topic;

  await db
    .collection('communities')
    .doc(communityId)
    .collection('channels')
    .doc(channelId)
    .update(updates);
  return { success: true };
});

export const getCommunityByOwner = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  const { ownerId } = data;
  const snap = await db
    .collection('communities')
    .where('ownerId', '==', ownerId)
    .limit(1)
    .get();
  if (snap.empty) return { community: null };
  const doc = snap.docs[0];
  return { community: { id: doc.id, ...doc.data() } };
});
