# Tech Stack & Architecture

## Core Technologies
* **Framework:** Next.js (App Router) - For routing, API endpoints, and PWA integration.
* **Language:** TypeScript - Strict typing for component interfaces and database schemas.
* **Styling:** Tailwind CSS & shadcn/ui - For rapid, accessible, and modular UI component design.
* **Backend & Database:** Convex - Real-time state management, instant sync, and serverless functions.
* **Authentication:** Clerk - Lightweight, secure auth integrated directly with Convex.
* **Text Editor:** TipTap - Headless, highly extensible block editor optimized for mobile.
* **PWA Support:** `next-pwa` (or Serwist) - For service worker generation and manifest management.

## Project Structure (Component-Driven)
* `/app`: Standard Next.js routing.
* `/components/ui`: Reusable, dumb visual components (buttons, inputs).
* `/components/editor`: TipTap specific extensions and UI (slash menus, floating bars).
* `/components/views`: Complex data-fetching components (Eisenhower Matrix, Zettelkasten Graph).
* `/convex`: Database schemas, queries, and mutations.
* `/lib`: Utility functions (e.g., Matrix quadrant calculators).