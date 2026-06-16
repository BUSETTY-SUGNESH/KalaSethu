// ============================================================
// KalaSetu — Event Repository (Firestore Implementation)
// ============================================================
import {
  collections,
  subcollections,
  docRef,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  increment,
  paginatedQuery,
  type DocumentSnapshot,
} from '@/lib/firebase/firestore';
import type { CalendarEvent, EventRegistration, PaginatedResult } from '@/app/types';

export const eventRepository = {
  async findById(id: string): Promise<CalendarEvent | null> {
    const snap = await getDoc(docRef.event(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as CalendarEvent;
  },

  async create(data: Omit<CalendarEvent, 'id'>): Promise<string> {
    const ref = await addDoc(collections.events(), data);
    return ref.id;
  },

  async update(id: string, data: Partial<CalendarEvent>): Promise<void> {
    await updateDoc(docRef.event(id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(docRef.event(id));
  },

  async findUpcoming(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot | null
  ): Promise<PaginatedResult<CalendarEvent>> {
    return paginatedQuery<CalendarEvent>(
      collections.events(),
      [where('status', '==', 'upcoming'), orderBy('startDate', 'asc')],
      pageSize,
      lastDoc
    );
  },

  async findByType(
    type: CalendarEvent['type'],
    count: number = 20
  ): Promise<CalendarEvent[]> {
    const q = query(
      collections.events(),
      where('type', '==', type),
      where('status', '==', 'upcoming'),
      orderBy('startDate', 'asc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as CalendarEvent);
  },

  async findByOrganizer(organizerId: string): Promise<CalendarEvent[]> {
    const q = query(
      collections.events(),
      where('organizerId', '==', organizerId),
      orderBy('startDate', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as CalendarEvent);
  },

  // ── Registrations ─────────────────────────────────────────

  async isRegistered(eventId: string, userId: string): Promise<boolean> {
    const regRef = doc(subcollections.eventRegistrations(eventId), userId);
    const snap = await getDoc(regRef);
    return snap.exists();
  },

  async register(
    eventId: string,
    userId: string,
    data: Omit<EventRegistration, 'id' | 'eventId' | 'userId' | 'registeredAt'>
  ): Promise<void> {
    const regRef = doc(subcollections.eventRegistrations(eventId), userId);
    await setDoc(regRef, {
      eventId,
      userId,
      ...data,
      registeredAt: new Date().toISOString(),
    });
    await updateDoc(docRef.event(eventId), {
      registrationCount: increment(1),
    });
  },

  async getRegistrations(eventId: string): Promise<EventRegistration[]> {
    const snap = await getDocs(subcollections.eventRegistrations(eventId));
    return snap.docs.map(d => ({ ...d.data() }) as EventRegistration);
  },

  async cancelRegistration(eventId: string, userId: string): Promise<void> {
    const regRef = doc(subcollections.eventRegistrations(eventId), userId);
    await deleteDoc(regRef);
    await updateDoc(docRef.event(eventId), {
      registrationCount: increment(-1),
    });
  },
};
