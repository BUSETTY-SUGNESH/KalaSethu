# KalEnt / Events Page — Issue Report

> **Files:** [`app/(public)/events/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/events/page.tsx)
> **Services:** `event-service.ts`

---

## Summary
The Events page correctly fetches upcoming events from Firestore and renders them with date formatting. The seller view includes a Create Event form and event stats. However, the Create Event form is **completely non-functional** and the stats are hardcoded.

---

## Issues

### 🟡 M-10 — "Publish Event" and "Save as Draft" Buttons Have No Handlers `[NEW]`
**File:** [`events/page.tsx:L148-149`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/events/page.tsx#L148-L149)
**Description:** The Create Event form has two action buttons: "Publish Event" and "Save as Draft". Neither has an `onClick` handler or `onSubmit` form binding. Clicking them does nothing.
**Impact:** Artists cannot create new events.

### 🟡 M-11 — Create Event Form Inputs Are Unbound `[NEW]`
**File:** [`events/page.tsx:L85-145`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/events/page.tsx#L85-L145)
**Description:** All form inputs (Event Title, Description, Event Type, Mode, Start/End Date, Venue, City, Max Capacity, Price) are HTML elements with no `value` or `onChange` bindings. The form data is never captured in React state.
**Impact:** Even if submit handlers were added, no data would be collected.

### 🔵 — Seller Event Stats Are Hardcoded `[NEW]`
**File:** [`events/page.tsx:L161-173`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/events/page.tsx#L161-L173)
**Description:** Stats show static values: "My Events: 4", "Total Registrations: 87", "Upcoming Events: 2", "Revenue from Events: ₹24,000".

### 🔵 — "Manage" Button on Seller's Own Events Has No Handler `[NEW]`
**File:** [`events/page.tsx:L221-223`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/events/page.tsx#L221-L223)
**Description:** Each event card owned by the seller shows a "Manage" button. It has no `onClick` handler.

### 🔵 — "View Calendar" Button Has No Handler `[NEW]`
**File:** [`events/page.tsx:L53-56`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/(public)/events/page.tsx#L53-L56)
**Description:** The "View Calendar" button in the header has no handler. No calendar view exists in the application.
