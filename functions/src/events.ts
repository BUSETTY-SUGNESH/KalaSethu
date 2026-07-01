import * as functions from 'firebase-functions/v1';

import { db } from './config';
import { FIRESTORE_TRIGGER_REGION } from './constants/regions';
import { postArtistCommunityAnnouncement } from './utils/community-announcements';

export const onEventCreated = functions.region(FIRESTORE_TRIGGER_REGION).firestore
  .document('events/{eventId}')
  .onCreate(async (snap, context) => {
    const eventId = context.params.eventId as string;
    const data = snap.data();
    if (!data) return;

    const organizerId = data.organizerId as string | undefined;
    if (!organizerId) return;

    const title = (data.title as string) || 'New event';
    const organizerName = (data.organizerName as string) || 'An organizer';

    try {
      await postArtistCommunityAnnouncement(db, organizerId, {
        event: 'event_created',
        title,
        body: `${organizerName} created a new event: "${title}"`,
        actionUrl: `/events/${eventId}`,
        eventId,
      });
    } catch (error) {
      console.error('Error posting community event announcement', error);
    }
  });
