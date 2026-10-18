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

### `books.js`

Localized book metadata includes fields such as:

- `id`
- `name`
- `nameMl`
- `testament`
- `testamentMl`
- `section`
- `sectionMl`
- `sectionKey`
- `bookIntroTitle`
- `bookIntroTitleMl`
- `bookIntroText`
- `bookIntroTextMl`
- `bookThemes`
- `bookThemesMl`
- `normalizedName`
- `firstLetter`

The exported `books` array normalizes intro and theme field names to `bookIntroTextMl`, `bookIntroText`, `bookThemesMl`, and `bookThemes`. Application code should use these canonical names.

### `verses.js`

Localized verse content includes fields such as:

- `id`
- `book`
- `bookMl`
- `bookId`
- `reference`
- `referenceMl`
- `text`
- `textMl`
- `difficulty`
- `themes`
- `themesMl`
- `clue`
- `clueMl`
- `explanation`
- `explanationMl`

## Persistence

Bibdle stores the following in the browser:

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
├── js/
│   ├── bibdle.js
│   ├── config.js
│   ├── app-shell.js
│   ├── auth-service.js
│   ├── bindings.js
│   ├── game-rules.js
│   ├── localization-service.js
│   ├── modal-service.js
│   ├── preferences-storage.js
│   ├── progress-storage.js
│   ├── render-pipeline.js
│   └── data/
│       ├── books.js
│       └── verses.js
└── assets/
    └── achievements/
```

`bibdle.js` is the browser entry point and coordinates application state and startup. Configuration, localization and autocomplete, authentication, modal behavior, event binding, and render transitions live in focused modules. The book and verse datasets stay under `js/data/`.

## Verification

The app remains a static site with no application build step. The automated test tooling is development-only:

```sh
npm ci
npm run test:unit
npm run test:e2e:install
npm run test:e2e
npm test
npm run test:coverage
```

The Vitest unit suite covers the data model, localization and search, game rules, storage, authentication,
rendering, modal behavior, application startup, and event bindings. Playwright runs the application in Chromium
with Firebase Authentication and Firestore requests replaced by deterministic offline mocks; it exercises
gameplay, clue progression, bilingual canonical duplicate handling, preferences and persistence, stats, archive,
modal accessibility, sign-in, leaderboard rendering, and the expected Firestore queries and writes. GitHub Actions
runs the unit and browser suites on pushes and pull requests. No live Firebase account or external Firebase
service is required for tests.

## Notes

The app remains fully client-side for gameplay, rendering, and local persistence. The book data module normalizes intro and theme field aliases when exporting its data, while the content itself remains unchanged. Generic UI chrome intentionally remains in English while data-driven Bible content can switch between English and Malayalam.