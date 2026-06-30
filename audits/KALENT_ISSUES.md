# KalEnt / Events Page — Issue Report

> **Files:** [`app/(public)/events/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/events/page.tsx)
> **Services:** `event-service.ts`
> **Components:** [`EventForm.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/events/EventForm.tsx), [`EventsCalendar.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/components/events/EventsCalendar.tsx)
> **Edit page:** [`app/(public)/events/[id]/edit/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/events/[id]/edit/page.tsx)

---

## Summary

The Events page fetches upcoming events from Firestore and renders them with date formatting. The seller view includes a functional Create Event form, dynamic event stats, a Manage flow via `/events/[id]/edit`, and an inline calendar view toggle.

---

## Issues

### ✅ M-10 — "Publish Event" and "Save as Draft" Buttons Have No Handlers `[RESOLVED]`
**File:** `app/(public)/events/page.tsx`, `app/components/events/EventForm.tsx`
**Resolution:** `EventForm` wraps fields in `<form onSubmit>`. Publish submits with `status: 'upcoming'` via `createEvent()`. Save as Draft calls `createEvent()` with `status: 'draft'`. Auth guard redirects unauthenticated users to `/login?redirect=/events?create=1`. Success/error toasts and list refresh on completion.

### ✅ M-11 — Create Event Form Inputs Are Unbound `[RESOLVED]`
**File:** `app/components/events/EventForm.tsx`
**Resolution:** All inputs are controlled via React state (`title`, `description`, `type`, `mode`, `startDate`, `endDate`, `venue`, `city`, `maxCapacity`, `price`) with `value`/`onChange` bindings. `buildEventPayload()` maps form values to `CalendarEvent` shape including timezone, pricing, and location fields.

### ✅ — Seller Event Stats Are Hardcoded `[RESOLVED]`
**File:** `app/(public)/events/page.tsx`
**Resolution:** `getEventsByOrganizer(user.id)` drives dynamic stats: My Events count, total registrations (`sum(registrationCount)`), upcoming events (`status === 'upcoming' && startDate > now`), and revenue (`sum(price × registrationCount)` for paid events). Skeleton loading state shown while fetching.

### ✅ — "Manage" Button on Seller's Own Events Has No Handler `[RESOLVED]`
**File:** `app/(public)/events/page.tsx`, `app/(public)/events/[id]/edit/page.tsx`
**Resolution:** Manage button is a `Link` to `/events/[id]/edit`. Edit page loads event, verifies `organizerId === user.id`, and reuses `EventForm` in edit mode with Save Changes, Publish (for drafts), and Cancel actions via `updateEvent()`.

### ✅ — "View Calendar" Button Has No Handler `[RESOLVED]`
**File:** `app/(public)/events/page.tsx`, `app/components/events/EventsCalendar.tsx`
**Resolution:** Header button toggles `viewMode` between `grid` and `calendar`. `EventsCalendar` renders a month grid with `date-fns`, prev/next navigation, today highlight, and clickable event chips linking to `/events/[id]`. Button label flips to "View List" in calendar mode.

---

## Verification Checklist

- [x] Create Event form inputs are bound and validate (title ≥ 3, description ≥ 10, dates required, end > start)
- [x] Publish Event creates Firestore doc with `status: 'upcoming'` and navigates to event detail
- [x] Save as Draft creates doc with `status: 'draft'`; draft excluded from `getUpcomingEvents` public feed
- [x] Seller sees drafts in merged event list with DRAFT badge
- [x] Seller stats reflect real organizer event data
- [x] Manage links to `/events/[id]/edit` with organizer-only guard
- [x] Edit page saves changes and can publish drafts
- [x] View Calendar toggles inline month calendar; events appear on correct dates
- [x] Buyer view hides create form, stats, and Manage; calendar toggle still works

---

## Remaining / Out of Scope

No open issues remain in this audit.

Optional hardening: tighten Firestore create rule to `request.resource.data.organizerId == request.auth.uid`.
