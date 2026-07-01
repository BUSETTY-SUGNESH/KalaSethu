'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/app/components/ui/Icon';
import Button from '@/app/components/ui/Button';
import CreateEventModal, {
  OPEN_CREATE_EVENT_KEY,
  requestOpenCreateEventModal,
} from '@/app/(public)/events/CreateEventModal';
import type { EventFormSubmitStatus } from '@/app/components/events/EventForm';
import EventsCalendar from '@/app/components/events/EventsCalendar';
import { getUpcomingEvents, getEventsByOrganizer } from '@/lib/services/event-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { CalendarEvent } from '@/app/types';
import { format } from 'date-fns';

function mergeEvents(publicEvents: CalendarEvent[], organizerEvents: CalendarEvent[]): CalendarEvent[] {
  const byId = new Map<string, CalendarEvent>();
  for (const event of publicEvents) {
    byId.set(event.id, event);
  }
  for (const event of organizerEvents) {
    byId.set(event.id, event);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}

function computeSellerStats(organizerEvents: CalendarEvent[]) {
  const now = Date.now();
  const upcomingCount = organizerEvents.filter(
    (e) => e.status === 'upcoming' && new Date(e.startDate).getTime() > now
  ).length;
  const totalRegistrations = organizerEvents.reduce((sum, e) => sum + (e.registrationCount ?? 0), 0);
  const revenue = organizerEvents.reduce((sum, e) => {
    if (e.isFree) return sum;
    return sum + (e.price ?? 0) * (e.registrationCount ?? 0);
  }, 0);

  return {
    myEvents: organizerEvents.length,
    totalRegistrations,
    upcomingCount,
    revenue,
  };
}

function EventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [publicEvents, setPublicEvents] = useState<CalendarEvent[]>([]);
  const [organizerEvents, setOrganizerEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

  const { isArtist, user, isAuthenticated } = useAuthStore();
  const seller = isArtist();

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const [upcomingResult, myEvents] = await Promise.all([
        getUpcomingEvents(20),
        seller && user ? getEventsByOrganizer(user.id) : Promise.resolve([]),
      ]);
      setPublicEvents(upcomingResult.data);
      setOrganizerEvents(myEvents);
    } catch (error) {
      console.error('Failed to load events', error);
    } finally {
      setIsLoading(false);
    }
  }, [seller, user]);

  const dismissCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const openCreateModal = useCallback(() => {
    if (!isAuthenticated || !user) {
      requestOpenCreateEventModal();
      router.push('/login?redirect=/events');
      return;
    }
    setShowCreateModal(true);
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!seller) return;

    const fromStorage =
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(OPEN_CREATE_EVENT_KEY) === '1';
    const fromLegacyQuery = searchParams.get('create') === '1';

    if (fromStorage || fromLegacyQuery) {
      sessionStorage.removeItem(OPEN_CREATE_EVENT_KEY);
      setShowCreateModal(true);
      if (fromLegacyQuery) {
        router.replace('/events', { scroll: false });
      }
    }
  }, [seller, searchParams, router]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const displayEvents = useMemo(() => {
    if (seller && organizerEvents.length > 0) {
      return mergeEvents(publicEvents, organizerEvents);
    }
    return publicEvents;
  }, [seller, publicEvents, organizerEvents]);

  const sellerStats = useMemo(() => computeSellerStats(organizerEvents), [organizerEvents]);

  async function handleCreateSuccess(eventId: string, status: EventFormSubmitStatus) {
    await loadEvents();
    if (status === 'upcoming') {
      router.push(`/events/${eventId}`);
    }
  }

  const statItems = [
    { label: 'My Events', value: String(sellerStats.myEvents), icon: 'event', color: 'var(--color-accent-emerald)' },
    { label: 'Total Registrations', value: String(sellerStats.totalRegistrations), icon: 'group', color: 'var(--color-primary)' },
    { label: 'Upcoming Events', value: String(sellerStats.upcomingCount), icon: 'upcoming', color: 'var(--color-accent-gold)' },
    {
      label: 'Revenue from Events',
      value: `₹${sellerStats.revenue.toLocaleString('en-IN')}`,
      icon: 'payments',
      color: 'var(--color-accent-terracotta)',
    },
  ];

  return (
    <>
      <CreateEventModal
        open={showCreateModal}
        onClose={dismissCreateModal}
        onSuccess={handleCreateSuccess}
      />

      {/* Header */}
      <div className="bg-surface-container-highest border-b border-outline-variant" style={{ borderBottom: '1px solid rgba(196, 199, 199, 0.2)' }}>
        <div className="container py-8 flex flex-col gap-16" style={{ padding: '48px var(--margin-desktop) 32px' }}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-8 text-accent-emerald" style={{ marginBottom: 12 }}>
                <Icon name="event" size={28} />
                <span className="text-label-md uppercase tracking-wider">Kalent Hub</span>
              </div>
              <h1 className="text-display-lg text-primary">Workshops & Exhibitions</h1>
              <p className="text-body-lg text-on-surface-variant max-w-2xl" style={{ marginTop: 12, maxWidth: 600 }}>
                {seller
                  ? 'Create and manage your workshops, exhibitions, and art fairs. Reach your audience directly.'
                  : 'Masterclasses, gallery openings, and important deadlines for the Indian artisan community.'}
              </p>
            </div>
            <div className="flex gap-12">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setViewMode((m) => (m === 'grid' ? 'calendar' : 'grid'))}
              >
                <Icon name={viewMode === 'grid' ? 'calendar_month' : 'view_list'} size={18} />
                {viewMode === 'grid' ? 'View Calendar' : 'View List'}
              </button>
              {seller && (
                <Button variant="primary" size="md" icon="add" iconPosition="left" onClick={openCreateModal}>
                  Create Event
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seller My Events Summary */}
      {seller && (
        <section className="container" style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 40 }}>
            {isLoading
              ? Array(4)
                  .fill(0)
                  .map((_, i) => <div key={i} className="card skeleton" style={{ height: 100 }} />)
              : statItems.map((stat) => (
                  <div key={stat.label} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: stat.color }}>
                      {stat.icon}
                    </span>
                    <span className="text-headline-md text-primary" style={{ fontWeight: 700 }}>
                      {stat.value}
                    </span>
                    <span className="text-caption text-on-surface-variant uppercase">{stat.label}</span>
                  </div>
                ))}
          </div>
        </section>
      )}

      {/* Events Grid or Calendar */}
      <section className="container section-gap">
        {viewMode === 'calendar' ? (
          isLoading ? (
            <div className="card skeleton" style={{ height: 500 }} />
          ) : (
            <EventsCalendar events={displayEvents} />
          )
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 32 }}>
            {isLoading ? (
              Array(3)
                .fill(0)
                .map((_, i) => <div key={i} className="card skeleton" style={{ height: 180 }} />)
            ) : displayEvents.length > 0 ? (
              displayEvents.map((event) => {
                const date = new Date(event.startDate);
                const isUrgent = date.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                const isMyEvent = seller && event.organizerId === user?.id;
                const isDraft = event.status === 'draft';

                return (
                  <div key={event.id} className="card" style={{ padding: 0, position: 'relative' }}>
                    {(isMyEvent || isDraft) && (
                      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, display: 'flex', gap: 6 }}>
                        {isDraft && (
                          <div
                            style={{
                              background: 'var(--color-on-surface-variant)',
                              color: 'white',
                              padding: '2px 10px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                            }}
                          >
                            DRAFT
                          </div>
                        )}
                        {isMyEvent && !isDraft && (
                          <div
                            style={{
                              background: 'var(--color-accent-emerald)',
                              color: 'white',
                              padding: '2px 10px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                            }}
                          >
                            YOUR EVENT
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-stretch" style={{ height: '100%' }}>
                      <div
                        className="flex flex-col items-center justify-center p-4 bg-surface-container-low border-r border-outline-variant"
                        style={{ width: 100, borderRight: '1px solid rgba(196, 199, 199, 0.2)', flexShrink: 0 }}
                      >
                        <span className={`text-label-md ${isUrgent ? 'text-status-urgency' : 'text-accent-emerald'}`}>
                          {format(date, 'MMM')}
                        </span>
                        <span className="text-display-lg text-primary" style={{ fontSize: 40 }}>
                          {format(date, 'dd')}
                        </span>
                      </div>
                      <div className="p-6 flex flex-col justify-center" style={{ padding: 24, flex: 1 }}>
                        <span className="text-caption uppercase text-on-surface-variant mb-2" style={{ marginBottom: 8, display: 'block' }}>
                          {event.type.replace('_', ' ')}{' '}
                          {event.city ? `• ${event.city}` : event.mode === 'online' ? '• Online' : ''}
                        </span>
                        <h3 className="text-headline-sm text-primary mb-2" style={{ marginBottom: 8 }}>
                          {event.title}
                        </h3>
                        <p className="text-body-md text-on-surface-variant line-clamp-2">{event.description}</p>
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
                          <Link
                            href={`/events/${event.id}`}
                            className="text-label-sm text-primary hover:text-accent-emerald uppercase"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, letterSpacing: '0.05em' }}
                          >
                            View Details <Icon name="arrow_forward" size={16} />
                          </Link>
                          {isMyEvent && (
                            <Link
                              href={`/events/${event.id}/edit`}
                              className="btn btn-outline"
                              style={{ fontSize: 12, padding: '4px 12px', marginLeft: 'auto' }}
                            >
                              Manage
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state col-span-full">
                <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>
                  event_busy
                </span>
                <p className="text-body-lg text-on-surface-variant">
                  {seller ? "You haven't created any events yet." : 'No upcoming events found.'}
                </p>
                {seller && (
                  <Button
                    variant="primary"
                    size="md"
                    icon="add"
                    iconPosition="left"
                    onClick={openCreateModal}
                    style={{ marginTop: 16 }}
                  >
                    Create Your First Event
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="container section-gap">
          <div className="card skeleton" style={{ height: 200, marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 32 }}>
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="card skeleton" style={{ height: 180 }} />
              ))}
          </div>
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  );
}
