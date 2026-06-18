# Bibdle

Bibdle is a browser-based Catholic Bible verse guessing game inspired by daily deduction games. Each round presents a verse and challenges the player to identify the correct Bible book using structured feedback such as testament, section, first-letter clues, and canonical proximity.

The project is a client-side web application built with plain HTML, CSS, and JavaScript. It uses a modular, surface-oriented architecture that separates rendering, modal orchestration, event bindings, read-model/view-model generation, and gameplay logic while keeping deployment lightweight.

## Overview

Bibdle supports both **Daily** and **Practice** play modes, multiple difficulty settings, persistent local progress, and optional Firebase-backed authentication and cloud features. The codebase is organized around a central application module (`bibdle.js`) that coordinates state, game rules, persistence, localization, rendering, and Firebase integration.

At runtime, the app loads book and verse data, hydrates saved preferences and stats, initializes render services, binds UI events, and then renders the active puzzle state. UI behavior is split into focused modules so that surfaces such as stats, archive, leaderboard, and post-game content can evolve independently.

## Tech Stack

- **HTML** for the application shell and modal structure (`index.html`)
- **CSS** for layout, theming, responsive styling, accessibility preferences, and game presentation (`css/bibdle.css`)
- **Vanilla JavaScript (ES modules)** for gameplay logic, state management, rendering, UI orchestration, and Firebase integration
- **Firebase Authentication** for sign-in and player identity
- **Cloud Firestore** for profile sync and Daily leaderboard data
- **Browser storage** for local progress, preferences, and statistics persistence

## Architecture

### Core entry point

`js/bibdle.js` is the main orchestration layer. It imports data, configures gameplay rules, initializes Firebase services, owns the in-memory application state, coordinates persistence, computes achievements and stats, and wires together the rendering and interaction modules.

### Modal service

`js/modal-service.js` centralizes modal registration and lifecycle behavior. It provides a reusable modal API for opening, closing, toggling, closing the topmost modal, closing all modals, handling Escape key dismissal, backdrop click dismissal, and delegated close-button handling.

This keeps modal behavior consistent across help, settings, stats, archive, leaderboard, and post-game dialogs without duplicating DOM logic in each feature module.

### Render pipeline

`js/render-pipeline.js` acts as a lightweight UI orchestration layer. Instead of letting every feature mutate the interface independently, the render pipeline coordinates control rendering, auth rendering, puzzle rendering, stats rendering, preference-driven rerenders, mode switches, and transient UI cleanup.

This creates a predictable rendering flow and helps keep `bibdle.js` focused on application state and rules instead of direct DOM sequencing.

### Bindings-oriented structure

`js/bindings.js` implements a bindings-oriented event layer. It centralizes event subscription for gameplay inputs, settings controls, delegated document clicks, archive interactions, modal actions, share/copy actions, auth controls, and post-game actions.

That structure makes the app easier to maintain because event wiring is separated from rendering and from the underlying game rules. In practice, `bibdle.js` defines handlers, `bindings.js` connects them to the DOM, and the surface modules render the resulting UI.

### Surface and read-model modules

The project also follows a surface/read-model pattern in several areas:

- **Surface modules** render specific UI regions, such as `puzzle-surface.js`, `stats-surface.js`, `postgame-surface.js`, `archive-surface.js`, and `leaderboard-surface.js`.
- **Read-model modules** prepare UI-friendly data structures, such as `achievement-read-models.js`, `archive-read-models.js`, `postgame-read-models.js`, and `stats-read-models.js`.
- **Utility modules** such as `ui-render-utils.js` and `ui-refactor-helpers.js` provide shared rendering helpers, empty/loading states, and small view utilities.

This separation reduces coupling between raw state and final markup, making feature-specific UI easier to reason about and extend.

## Features

The following features are implemented in the provided code:

- Daily puzzle mode with date-based puzzle selection
- Practice mode for non-daily play
- Easy, Normal, and Hard difficulty modes with different clue schedules
- Progressive clue reveals based on guess count and difficulty
- Guess feedback for testament, section, first letter, and canonical book proximity
- Autocomplete book search with keyboard navigation
- Duplicate-guess prevention by canonical book identity
- English and Malayalam display support for book and verse-derived content
- Theme switching and accessibility preferences, including reduced motion, high contrast, larger text, and sound toggle settings
- Local persistence for progress, preferences, stats, and puzzle state
- Historical stats for Daily and Practice modes, including played, won, lost, streaks, and guess distribution
- Achievement engine with earned achievements, progress tracking, grouped categories, newly unlocked achievements, and closest incomplete achievements
- Archive/progress map showing Daily-mode progress across Bible books with per-book performance details
- Post-game modal with answer, verse, explanation, book intro, trivia, stats, achievement progress, and leaderboard placement
- Firebase Authentication-based sign-in support
- Cloud profile sync for preferences and stats
- Firebase-backed global Daily leaderboard with summary stats, top entries, and current player placement
- Share and copy result actions
- Boot diagnostics and application shell readiness tracking for startup validation and debugging

## Project Structure

```text
.
├── index.html
├── README.md
├── css/
│   └── bibdle.css
└── js/
    ├── data/
    │   ├── books.js
    │   └── verses.js
    ├── achievement-read-models.js
    ├── app-shell.js
    ├── archive-read-models.js
    ├── archive-surface.js
    ├── auth-service.js
    ├── bibdle.js
    ├── bindings.js
    ├── game-transitions.js
    ├── leaderboard-surface.js
    ├── modal-service.js
    ├── postgame-read-models.js
    ├── postgame-surface.js
    ├── puzzle-surface.js
    ├── render-pipeline.js
    ├── stats-read-models.js
    ├── stats-surface.js
    ├── ui-refactor-helpers.js
    └── ui-render-utils.js
```

## Running the Project

Because Bibdle is a browser-based ES module application, it should be served from a local web server rather than opened directly from the filesystem.

### Option 1: VS Code Live Server

1. Open the project folder in VS Code.
2. Install the **Live Server** extension if needed.
3. Start Live Server from `index.html` or from the project root.
4. Open the local URL in your browser.

### Option 2: Simple local server

From the project root, run one of the following:

```bash
# Python 3
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

### Build/deploy notes

This project does not require a JavaScript build step based on the provided files. It is written as a static front-end app using native ES modules.

For production hosting, deploy the project as static files to any web host that can serve `index.html`, the `css/` directory, and the `js/` directory.

## Firebase Notes

The provided code includes Firebase configuration and optional cloud features. When Firebase is available and correctly configured, the app can:

- Authenticate users
- Sync local preferences and stats to a cloud profile
- Load cloud profile data back into the app
- Store and retrieve Daily leaderboard data

If Firebase is unavailable, the game still supports local gameplay and browser-based persistence.

## Development Notes

A few implementation characteristics are especially useful when working on the project:

- The central state object in `bibdle.js` is the source of truth for gameplay, preferences, stats, auth state, leaderboard state, and transient UI state.
- Rendering is intentionally split into surface modules and coordinated through the render pipeline.
- Modal behavior is abstracted behind the modal service rather than being implemented ad hoc per dialog.
- Event hookup is centralized in the bindings layer, which keeps the DOM event map easier to audit.
- View-model/read-model helpers are used to transform raw state into presentational data before rendering.