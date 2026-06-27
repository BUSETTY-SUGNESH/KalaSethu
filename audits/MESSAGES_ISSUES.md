# Messages / Chat — Issue Report

> **Files:** [`app/dashboard/messages/page.tsx`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/messages/page.tsx)
> **Services:** [`chat-service.ts`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/lib/services/chat-service.ts)

---

## Summary
The Messages page implements a real-time chat interface with Firestore subscriptions. The chat room list and message rendering are functional. However, critical bugs cause infinite re-renders and the "new chat" flow is broken.

---

## Issues

### 🟠 H-06 — Infinite Re-Render Loop via `participantProfiles` Dependency `[NEW]`
**File:** [`dashboard/messages/page.tsx:L110`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/messages/page.tsx#L110)
**Description:** The `useEffect` that loads chat rooms includes `participantProfiles` in its dependency array. Inside this effect, the code calls `setParticipantProfiles(prev => ({...prev, [id]: {...}}))`, which creates a new object reference, which triggers the effect again, which fetches profiles again — creating an infinite loop.
**Impact:** The Messages page will freeze the browser tab with thousands of Firestore reads per second, causing both client-side crashes and excessive Firebase billing.

### 🟡 M-12 — New Chat Flow Logs Warning Instead of Creating Room `[NEW]`
**File:** [`dashboard/messages/page.tsx:L144-153`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/messages/page.tsx#L144-L153)
**Description:** When a user navigates to Messages with a `userId` query parameter to start a new conversation, and sends the first message, the handler logs `console.warn("Starting new chat needs a dedicated function.")` and does nothing. The `getOrCreateDirectChatRoom` function exists in `chat-service.ts` but is not called here.
**Impact:** Users cannot initiate new conversations from profile pages or artwork pages.

### 🔵 — Attach File and Add Image Buttons Non-Functional `[NEW]`
**File:** [`dashboard/messages/page.tsx:L372-377`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/messages/page.tsx#L372-L377)
**Description:** The chat input area has "Attach file" and "Add image" buttons with no `onClick` handlers. Users see upload icons but cannot send media.

### 🔵 — Search Messages Input is Unbound `[NEW]`
**File:** [`dashboard/messages/page.tsx:L193`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/messages/page.tsx#L193)
**Description:** The "Search messages..." input in the sidebar has no `value`, `onChange`, or search logic.

### 🔵 — Messages Reversed In-Place `[NEW]`
**File:** [`dashboard/messages/page.tsx:L125`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/messages/page.tsx#L125)
**Description:** `setMessages(newMessages.reverse())` mutates the array from the subscription callback in place using `.reverse()`. This mutates the source array, which can cause stale data in other subscribers. Should use `[...newMessages].reverse()`.

### 🔵 — "More options" Button Non-Functional `[NEW]`
**File:** [`dashboard/messages/page.tsx:L315`](file:///c:/Users/Bhyresh%20BS/Documents/Bhyresh/Programs/KalaSethu/app/dashboard/messages/page.tsx#L315)
**Description:** The three-dot menu button in the chat header has no handler or dropdown.
