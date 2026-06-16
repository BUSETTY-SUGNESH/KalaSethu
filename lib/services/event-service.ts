// ============================================================
// KalaSetu — Event & Workshop Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { eventRepository } from '@/lib/repositories';
import {
  collections,
  subcollections,
  docRef,
  getDoc,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  increment,
} from '@/lib/firebase/firestore';
import type {
  CalendarEvent,
  EventRegistration,
  Workshop,
  WorkshopEnrollment,
  PaginatedResult,
} from '@/app/types';
import type { DocumentSnapshot } from '@/lib/firebase/firestore';

// ── Events ──────────────────────────────────────────────────

export async function createEvent(
  data: Omit<CalendarEvent, 'id' | 'registrationCount' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = new Date().toISOString();
  const event: Omit<CalendarEvent, 'id'> = {
    ...data,
    registrationCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  return eventRepository.create(event);
}

export async function getEvent(eventId: string): Promise<CalendarEvent | null> {
  return eventRepository.findById(eventId);
}

export async function getUpcomingEvents(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<CalendarEvent>> {
  return eventRepository.findUpcoming(pageSize, lastDoc);
}

export async function getEventsByType(
  type: CalendarEvent['type'],
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null // Parameter not directly supported in the new repo method yet, but it returns all
): Promise<CalendarEvent[]> {
  // We can pass count to the repository. For now, defaulting to 20 or pageSize
  return eventRepository.findByType(type, pageSize);
}

export async function registerForEvent(
  eventId: string,
  userId: string,
  userName: string,
  userEmail: string
): Promise<string> {
  const isReg = await eventRepository.isRegistered(eventId, userId);
  if (isReg) {
    throw new Error('Already registered for this event.');
  }

  const registration: Omit<EventRegistration, 'id' | 'eventId' | 'userId' | 'registeredAt'> = {
    userName,
    userEmail,
    status: 'registered',
    ticketNumber: `KS-${Date.now().toString(36).toUpperCase()}`,
  };

  await eventRepository.register(eventId, userId, registration);
  return registration.ticketNumber!;
}

export async function isRegisteredForEvent(
  eventId: string,
  userId: string
): Promise<boolean> {
  return eventRepository.isRegistered(eventId, userId);
}

// ── Workshops ───────────────────────────────────────────────
// (Currently we don't have a workshop repository implemented, so I will 
// leave the workshop logic here as it uses direct firestore calls)

export async function createWorkshop(
  data: Omit<Workshop, 'id' | 'enrolledCount' | 'averageRating' | 'reviewCount' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = new Date().toISOString();
  const workshop = {
    ...data,
    enrolledCount: 0,
    averageRating: 0,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collections.workshops(), workshop);
  return ref.id;
}

export async function getWorkshop(workshopId: string): Promise<Workshop | null> {
  const snap = await getDoc(docRef.workshop(workshopId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Workshop;
}

export async function getUpcomingWorkshops(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<Workshop>> {
  const { query, where, orderBy } = await import('@/lib/firebase/firestore');
  const { paginatedQuery } = await import('@/lib/firebase/firestore');
  return paginatedQuery<Workshop>(
    collections.workshops(),
    [
      where('status', 'in', ['upcoming', 'ongoing']),
      orderBy('startDate', 'asc'),
    ],
    pageSize,
    lastDoc
  );
}

export async function enrollInWorkshop(
  workshopId: string,
  userId: string,
  userName: string,
  userEmail: string
): Promise<void> {
  const workshop = await getWorkshop(workshopId);
  if (!workshop) throw new Error('Workshop not found.');
  if (workshop.enrolledCount >= workshop.maxCapacity) {
    throw new Error('Workshop is full.');
  }

  const enrollRef = doc(subcollections.workshopEnrollments(workshopId), userId);
  const existing = await getDoc(enrollRef);
  if (existing.exists()) {
    throw new Error('Already enrolled in this workshop.');
  }

  const enrollment: Omit<WorkshopEnrollment, 'id'> = {
    workshopId,
    userId,
    userName,
    userEmail,
    status: 'enrolled',
    enrolledAt: new Date().toISOString(),
  };

  await setDoc(enrollRef, enrollment);
  await updateDoc(docRef.workshop(workshopId), {
    enrolledCount: increment(1),
    updatedAt: new Date().toISOString(),
  });
}

export async function isEnrolledInWorkshop(
  workshopId: string,
  userId: string
): Promise<boolean> {
  const enrollRef = doc(subcollections.workshopEnrollments(workshopId), userId);
  const snap = await getDoc(enrollRef);
  return snap.exists();
}
