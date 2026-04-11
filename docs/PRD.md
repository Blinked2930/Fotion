# Product Requirements Document: "Fotion" (Local-First PWA)

## 1. Vision & Objective
Build a lightning-fast, mobile-optimized, component-driven personal knowledge management (PKM) system. It must replace bulky incumbents by prioritizing sub-100ms interactions, offline capabilities, and a unified view for deep thinking and daily execution.

## 2. Core Workflows to Support
* **Deep/Philosophical Thinking (Zettelkasten):** Needs robust bi-directional linking, tagging, and atomic note structures for frictionless capturing of thoughts.
* **Task Management (Eisenhower Matrix):** Quick capture of tasks with immediate sorting into the "Do First", "Do Fast", "Do ASAP", or "For Funsies" quadrants.
* **Mundane Note Collection:** Fast, unstyled text entry for fleeting thoughts, project details, or travel logistics.

## 3. Key Features & Requirements
* **Mobile-First Performance:** Zero splash screens. Immediate text input focus upon opening the app.
* **Offline-Ready:** Service workers must cache the app shell and handle offline data queuing. Must be reliable in areas with unstable internet connections, like rural regions or during international travel.
* **Block-Based Editor:** Slash commands (`/`) for quick formatting (headers, toggles, checkboxes) without leaving the keyboard.
* **Component-Driven UI:** UI must be modular so specific tools (like the task matrix) can be exported to a public-facing personal website later.

## 4. Success Metrics
* Time to interaction on mobile < 1 second.
* Zero lost data when transitioning from offline to online states.
* Zero client-side lag during rapid typing in the editor.