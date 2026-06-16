'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { getEvent, registerForEvent, isRegisteredForEvent } from "@/lib/services/event-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import type { CalendarEvent } from "@/app/types";
import { format } from "date-fns";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    async function loadEvent() {
      try {
        const data = await getEvent(eventId);
        setEvent(data);

        // Check registration status if logged in
        if (user && data) {
          const registered = await isRegisteredForEvent(eventId, user.id);
          setIsRegistered(registered);
        }
      } catch (error) {
        console.error("Failed to load event", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadEvent();
  }, [eventId, user]);

  async function handleRegister() {
    if (!isAuthenticated || !user) {
      router.push(`/login?redirect=/events/${eventId}`);
      return;
    }
    
    if (isRegistering || !event) return;
    
    setIsRegistering(true);
    try {
      await registerForEvent(event.id, user.id, user.displayName, user.email);
      setIsRegistered(true);
      
      addToast({ 
        type: 'success', 
        title: 'Registration Successful', 
        message: 'You have been successfully registered for this event.' 
      });
    } catch (error: any) {
      console.error(error);
      addToast({ 
        type: 'error', 
        title: 'Registration Failed', 
        message: error.message || 'Could not register for this event.' 
      });
    } finally {
      setIsRegistering(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container section-gap flex justify-center py-64">
        <div className="skeleton" style={{ width: "100%", height: 400, borderRadius: "var(--radius-lg)" }} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container section-gap empty-state py-64">
        <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>event_busy</span>
        <h1 className="text-display-sm text-primary">Event Not Found</h1>
        <p className="text-body-lg text-on-surface-variant">The event you are looking for does not exist or has been cancelled.</p>
        <Link href="/events">
          <Button variant="primary" style={{ marginTop: 24 }}>Back to Events</Button>
        </Link>
      </div>
    );
  }

  const isFull = event.maxCapacity ? event.registrationCount >= event.maxCapacity : false;

  return (
    <>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="breadcrumb">
          <Link href="/events">Events</Link>
          <Icon name="chevron_right" size={16} />
          <span className="current">{event.title}</span>
        </div>
      </div>

      <section className="container section-gap">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 64 }}>
          {/* Main Content */}
          <div className="flex flex-col gap-32">
            <div>
              <div className="flex items-center gap-8 mb-16">
                <span className="text-caption uppercase bg-surface-container-high text-on-surface px-2 py-1 rounded" style={{ padding: "4px 12px", borderRadius: 16 }}>
                  {event.type.replace('_', ' ')}
                </span>
                <span className="text-caption text-on-surface-variant">
                  {event.mode === 'online' ? '🌐 Online' : event.mode === 'hybrid' ? '🔀 Hybrid' : '📍 In Person'}
                </span>
                <span className="text-caption text-on-surface-variant">
                  By {event.organizerName}
                </span>
              </div>
              
              <h1 className="text-display-md text-primary" style={{ marginBottom: 24 }}>{event.title}</h1>
              
              {event.imageUrl && (
                <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 32, border: "1px solid rgba(196, 199, 199, 0.2)" }}>
                  <img src={event.imageUrl} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>About this event</h3>
              <p className="text-body-lg text-on-surface" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 32 }}>
                {event.description}
              </p>
            </div>
          </div>

          {/* Sidebar / Registration */}
          <div className="flex flex-col gap-32">
            <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)", position: "sticky", top: 120 }}>
              <ul className="flex flex-col gap-24 mb-32 border-b border-outline-variant pb-32">
                <li className="flex gap-16">
                  <Icon name="calendar_month" className="text-primary" size={24} />
                  <div>
                    <span className="text-label-md text-primary block">Date and Time</span>
                    <span className="text-body-md text-on-surface-variant">
                      {format(new Date(event.startDate), "MMMM d, yyyy")}
                      <br />
                      {format(new Date(event.startDate), "h:mm a")} – {format(new Date(event.endDate), "h:mm a")}
                    </span>
                  </div>
                </li>
                <li className="flex gap-16">
                  <Icon name="location_on" className="text-primary" size={24} />
                  <div>
                    <span className="text-label-md text-primary block">Location</span>
                    <span className="text-body-md text-on-surface-variant">
                      {event.mode === 'online'
                        ? 'Virtual Event — link provided upon registration'
                        : [event.venue, event.address, event.city].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </li>
                {!event.isFree && event.price && (
                  <li className="flex gap-16">
                    <Icon name="payments" className="text-primary" size={24} />
                    <div>
                      <span className="text-label-md text-primary block">Price</span>
                      <span className="text-body-md text-on-surface-variant">
                        ₹{event.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </li>
                )}
                {event.isFree && (
                  <li className="flex gap-16">
                    <Icon name="volunteer_activism" className="text-accent-emerald" size={24} />
                    <div>
                      <span className="text-label-md text-primary block">Admission</span>
                      <span className="text-body-md text-accent-emerald font-semibold">Free</span>
                    </div>
                  </li>
                )}
              </ul>

              <div className="flex flex-col gap-16 text-center">
                <Button 
                  variant={isRegistered ? "outline" : "primary"} 
                  size="lg" 
                  fullWidth 
                  onClick={handleRegister}
                  disabled={isRegistering || (isFull && !isRegistered)}
                >
                  {isRegistering ? "Processing..." : 
                   isRegistered ? "✓ You're Registered" : 
                   isFull ? "Event Full" : "Register Now"}
                </Button>
                
                {event.maxCapacity && (
                  <span className="text-caption text-on-surface-variant">
                    {Math.max(0, event.maxCapacity - event.registrationCount)} spots remaining
                  </span>
                )}
              </div>
            </div>
            
            <div className="bg-surface-container-low" style={{ padding: 24, borderRadius: "var(--radius-lg)" }}>
              <h3 className="text-label-lg text-primary mb-16">Organized by</h3>
              <div className="flex items-center gap-12">
                <div className="avatar avatar-md" style={{ backgroundColor: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                  {event.organizerName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-label-md text-primary">{event.organizerName}</h4>
                  <Link href={`/profile/${event.organizerId}`} className="text-caption text-on-surface-variant hover:underline">
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
