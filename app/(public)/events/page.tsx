'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { getUpcomingEvents } from "@/lib/services/event-service";
import type { CalendarEvent } from "@/app/types";
import { format } from "date-fns";

export default function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const result = await getUpcomingEvents(20);
        setEvents(result.data);
      } catch (error) {
        console.error("Failed to load events", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadEvents();
  }, []);

  return (
    <>
      <div className="bg-surface-container-highest border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container py-8 flex flex-col gap-16" style={{ padding: "48px var(--margin-desktop) 32px" }}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-8 text-accent-emerald" style={{ marginBottom: 12 }}>
                <Icon name="event" size={28} />
                <span className="text-label-md uppercase tracking-wider">Kalent Hub</span>
              </div>
              <h1 className="text-display-lg text-primary">Workshops & Exhibitions</h1>
              <p className="text-body-lg text-on-surface-variant max-w-2xl" style={{ marginTop: 12, maxWidth: 600 }}>
                Masterclasses, gallery openings, and important deadlines for the Indian artisan community.
              </p>
            </div>
            <div className="flex gap-12">
              <button className="btn btn-outline">
                <Icon name="calendar_month" size={18} />
                View Calendar
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="container section-gap">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 32 }}>
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="card skeleton" style={{ height: 180 }} />
            ))
          ) : events.length > 0 ? (
            events.map((event) => {
              const date = new Date(event.startDate);
              const isUrgent = date.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000; // Less than 3 days
              
              return (
                <div key={event.id} className="card" style={{ padding: 0 }}>
                  <div className="flex items-stretch" style={{ height: "100%" }}>
                    {/* Date Box */}
                    <div className="flex flex-col items-center justify-center p-4 bg-surface-container-low border-r border-outline-variant" style={{ width: 100, borderRight: "1px solid rgba(196, 199, 199, 0.2)", flexShrink: 0 }}>
                      <span className={`text-label-md ${isUrgent ? 'text-status-urgency' : 'text-accent-emerald'}`}>
                        {format(date, "MMM")}
                      </span>
                      <span className="text-display-lg text-primary" style={{ fontSize: 40 }}>
                        {format(date, "dd")}
                      </span>
                    </div>
                    {/* Content */}
                    <div className="p-6 flex flex-col justify-center" style={{ padding: 24, flex: 1 }}>
                      <span className="text-caption uppercase text-on-surface-variant mb-2" style={{ marginBottom: 8, display: "block" }}>
                        {event.type.replace('_', ' ')} {event.city ? `• ${event.city}` : (event.mode === 'online' ? '• Online' : '')}
                      </span>
                      <h3 className="text-headline-sm text-primary mb-2" style={{ marginBottom: 8 }}>{event.title}</h3>
                      <p className="text-body-md text-on-surface-variant line-clamp-2">
                        {event.description}
                      </p>
                      <Link href={`/events/${event.id}`} className="text-label-sm text-primary hover:text-accent-emerald uppercase mt-4" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 4, letterSpacing: "0.05em" }}>
                        View Details <Icon name="arrow_forward" size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state col-span-full">
              <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>event_busy</span>
              <p className="text-body-lg text-on-surface-variant">No upcoming events found.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
