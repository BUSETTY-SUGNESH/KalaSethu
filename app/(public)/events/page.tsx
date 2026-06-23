'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getUpcomingEvents } from "@/lib/services/event-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { CalendarEvent } from "@/app/types";
import { format } from "date-fns";

export default function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { isArtist, user } = useAuthStore();
  const seller = isArtist();

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
      {/* Header */}
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
                {seller
                  ? "Create and manage your workshops, exhibitions, and art fairs. Reach your audience directly."
                  : "Masterclasses, gallery openings, and important deadlines for the Indian artisan community."}
              </p>
            </div>
            <div className="flex gap-12">
              <button className="btn btn-outline">
                <Icon name="calendar_month" size={18} />
                View Calendar
              </button>
              {/* Only sellers see "Create Event" */}
              {seller && (
                <Button variant="primary" size="md" icon="add" iconPosition="left" onClick={() => setShowCreateForm(true)}>
                  Create Event
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Form — Seller Only */}
      {seller && showCreateForm && (
        <div style={{ backgroundColor: "var(--color-surface-container-low)", borderBottom: "1px solid rgba(196,199,199,0.2)" }}>
          <div className="container" style={{ padding: "32px var(--margin-desktop)" }}>
            <div className="card" style={{ padding: 32, maxWidth: 800 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
                <div>
                  <h2 className="text-headline-md text-primary">Create New Event</h2>
                  <p className="text-body-md text-on-surface-variant" style={{ marginTop: 4 }}>
                    Organiser: <strong>{user?.displayName}</strong>
                  </p>
                </div>
                <button onClick={() => setShowCreateForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <Icon name="close" size={24} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="flex flex-col gap-8" style={{ gridColumn: "1 / -1" }}>
                  <label className="text-label-sm text-on-surface-variant uppercase">Event Title</label>
                  <input type="text" placeholder="e.g. Masterclass: Tanjore Gold Leafing" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>

                <div className="flex flex-col gap-8" style={{ gridColumn: "1 / -1" }}>
                  <label className="text-label-sm text-on-surface-variant uppercase">Description</label>
                  <textarea rows={3} placeholder="Describe your event..." style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14, resize: "vertical" }} />
                </div>

                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Event Type</label>
                  <select style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }}>
                    <option value="workshop">Workshop</option>
                    <option value="exhibition">Exhibition</option>
                    <option value="art_fair">Art Fair</option>
                    <option value="webinar">Webinar</option>
                    <option value="meetup">Meetup</option>
                  </select>
                </div>

                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Mode</label>
                  <select style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }}>
                    <option value="online">Online</option>
                    <option value="offline">In-Person</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Start Date & Time</label>
                  <input type="datetime-local" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>

                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">End Date & Time</label>
                  <input type="datetime-local" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>

                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Venue / Location</label>
                  <input type="text" placeholder="e.g. Delhi Art Gallery, or Zoom link" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>

                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">City</label>
                  <input type="text" placeholder="e.g. Mumbai" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>

                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Max Capacity</label>
                  <input type="number" placeholder="e.g. 30" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>

                <div className="flex flex-col gap-8">
                  <label className="text-label-sm text-on-surface-variant uppercase">Price (₹) — Leave 0 for Free</label>
                  <input type="number" placeholder="0" style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(196,199,199,0.3)", background: "var(--color-surface-container)", color: "var(--color-on-surface)", fontSize: 14 }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <Button variant="primary" size="md">Publish Event</Button>
                <Button variant="outline" size="md">Save as Draft</Button>
                <Button variant="outline" size="md" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seller My Events Summary */}
      {seller && (
        <section className="container" style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
            {[
              { label: "My Events", value: "4", icon: "event", color: "var(--color-accent-emerald)" },
              { label: "Total Registrations", value: "87", icon: "group", color: "var(--color-primary)" },
              { label: "Upcoming Events", value: "2", icon: "upcoming", color: "var(--color-accent-gold)" },
              { label: "Revenue from Events", value: "₹24,000", icon: "payments", color: "var(--color-accent-terracotta)" },
            ].map((stat) => (
              <div key={stat.label} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: stat.color }}>{stat.icon}</span>
                <span className="text-headline-md text-primary" style={{ fontWeight: 700 }}>{stat.value}</span>
                <span className="text-caption text-on-surface-variant uppercase">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Events Grid */}
      <section className="container section-gap">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 32 }}>
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="card skeleton" style={{ height: 180 }} />
            ))
          ) : events.length > 0 ? (
            events.map((event) => {
              const date = new Date(event.startDate);
              const isUrgent = date.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
              const isMyEvent = seller && event.organizerId === user?.id;

              return (
                <div key={event.id} className="card" style={{ padding: 0, position: "relative" }}>
                  {/* "My Event" badge for sellers */}
                  {isMyEvent && (
                    <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, background: "var(--color-accent-emerald)", color: "white", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>
                      YOUR EVENT
                    </div>
                  )}
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
                      <p className="text-body-md text-on-surface-variant line-clamp-2">{event.description}</p>
                      <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
                        <Link href={`/events/${event.id}`} className="text-label-sm text-primary hover:text-accent-emerald uppercase" style={{ display: "inline-flex", alignItems: "center", gap: 4, letterSpacing: "0.05em" }}>
                          View Details <Icon name="arrow_forward" size={16} />
                        </Link>
                        {/* Edit / Manage for seller's own events */}
                        {isMyEvent && (
                          <button className="btn btn-outline" style={{ fontSize: 12, padding: "4px 12px", marginLeft: "auto" }}>
                            Manage
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state col-span-full">
              <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>event_busy</span>
              <p className="text-body-lg text-on-surface-variant">
                {seller ? "You haven't created any events yet." : "No upcoming events found."}
              </p>
              {seller && (
                <Button variant="primary" size="md" icon="add" iconPosition="left" onClick={() => setShowCreateForm(true)} style={{ marginTop: 16 }}>
                  Create Your First Event
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
