'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Icon from '@/app/components/ui/Icon';
import Button from '@/app/components/ui/Button';
import EventForm, { buildEventPayload, type EventFormSubmitStatus, type EventFormValues } from '@/app/components/events/EventForm';
import { getEvent, updateEvent } from '@/lib/services/event-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import type { CalendarEvent } from '@/app/types';

export default function EventEditPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId || !user) return;

    async function loadEvent() {
      setIsLoading(true);
      try {
        const data = await getEvent(eventId);
        if (!data) {
          addToast({ type: 'error', title: 'Event Not Found', message: 'This event does not exist.' });
          router.push('/events');
          return;
        }
        if (data.organizerId !== user!.id) {
          addToast({ type: 'error', title: 'Access Denied', message: 'You can only manage your own events.' });
          router.push(`/events/${eventId}`);
          return;
        }
        setEvent(data);
      } catch (error) {
        console.error('Failed to load event', error);
        addToast({ type: 'error', title: 'Load Failed', message: 'Could not load event details.' });
        router.push('/events');
      } finally {
        setIsLoading(false);
      }
    }

    loadEvent();
  }, [eventId, user, router, addToast]);

  async function handleUpdate(values: EventFormValues, status: EventFormSubmitStatus) {
    if (!user || !event) return;

    setIsSubmitting(true);
    try {
      const payload = buildEventPayload(values, status, user.id, user.displayName);
      await updateEvent(eventId, payload);

      addToast({
        type: 'success',
        title: status === 'upcoming' && event.status === 'draft' ? 'Event Published' : 'Changes Saved',
        message:
          status === 'upcoming' && event.status === 'draft'
            ? 'Your event is now live on Kalent Hub.'
            : 'Event details have been updated.',
      });

      router.push(status === 'upcoming' && event.status === 'draft' ? `/events/${eventId}` : '/events');
    } catch (error) {
      console.error('Failed to update event', error);
      addToast({
        type: 'error',
        title: 'Could Not Save Event',
        message: 'Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container section-gap flex justify-center py-64">
        <div className="skeleton" style={{ width: '100%', maxWidth: 800, height: 500, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 16 }}>
        <div className="breadcrumb">
          <Link href="/events">Events</Link>
          <Icon name="chevron_right" size={16} />
          <Link href={`/events/${eventId}`}>{event.title}</Link>
          <Icon name="chevron_right" size={16} />
          <span className="current">Manage</span>
        </div>
      </div>

      <section className="container section-gap" style={{ paddingBottom: 64 }}>
        <div className="card" style={{ padding: 32, maxWidth: 800 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 className="text-headline-md text-primary">Manage Event</h1>
            <p className="text-body-md text-on-surface-variant" style={{ marginTop: 4 }}>
              {event.status === 'draft' ? 'This event is saved as a draft.' : 'Update your event details below.'}
            </p>
          </div>

          <EventForm
            mode="edit"
            initialValues={event}
            isSubmitting={isSubmitting}
            onSubmit={handleUpdate}
            onCancel={() => router.push('/events')}
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <Link href={`/events/${eventId}`}>
            <Button variant="outline" size="md">
              View Public Page
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
