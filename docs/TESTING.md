# Testing & QA Protocol

## 1. Performance Testing
* **Mobile Throttling:** Test UI responsiveness using Chrome DevTools with "Fast 3G" and "Offline" presets.
* **Editor Stress Test:** Paste a 5,000-word Markdown document into the TipTap editor. Scroll speed must remain consistently 60fps on a mobile device.

## 2. State & Sync Testing (Convex)
* **Optimistic UI:** Ensure tasks visually move to a new quadrant instantly upon clicking a checkbox, before the server confirms.
* **Offline Queuing:** Disconnect internet, create 3 notes, reconnect. Verify all 3 sync to Convex without conflict.

## 3. Component Isolation Testing
* Verify that complex components (like the `MatrixView.tsx`) can receive mock data via props and render perfectly without requiring a live Convex connection. This ensures they can be ported to a static demo site later.