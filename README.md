# Bibdle

Bibdle is a browser-based Catholic Bible verse guessing game inspired by daily deduction games. Each round presents a verse and challenges the player to identify the correct Bible book using structured feedback such as testament, section, first-letter clues, and canonical proximity.

## Features

- Daily puzzle mode with streaks, stats, leaderboard submission, and archive progress.
- Practice mode with separate stats.
- Easy, Normal, and Hard difficulty modes.
- Bilingual Bible data support with English (`en`) and Malayalam (`ml`) language modes.
- Language-aware book search and autocomplete with keyboard support.
- Malayalam mode accepts guesses in either English or Malayalam while resolving both to the same canonical book.
- Canonical duplicate protection, so a book guessed in one language is treated as already guessed in the other.
- Light/dark theme toggle.
- Accessibility settings for reduced motion, high contrast, and larger text.
- Post-game panel with localized verse reference, verse text, explanation, book intro, trivia, and stats.
- Stats modal for historical progress and streak badges.
- Archive map showing Daily solved progress across the Catholic canon, with localized book, testament, and section metadata.
- Responsive layout for desktop and mobile.
- Firebase-backed global daily leaderboard alongside local browser persistence.
- Realtime local rooms with invite links and QR codes, timed or round-count games, saint-named guests, and a live room leaderboard.

## Language Support

Catholic Bibdle now supports two language modes for **book- and verse-derived content only**:

- `en` — English mode.
- `ml` — Malayalam mode.

The broader UI remains in English. Buttons, settings labels, leaderboard chrome, auth labels, modal action buttons, and other generic interface text are not translated.

When Malayalam mode is active:

- Book names, verse references, verse text, clue text, explanation text, book intro title/text, themes, testament labels, and section labels are shown in Malayalam when Malayalam fields are available.
- Search and guessing accept either English or Malayalam book names.
- Autocomplete can match both languages, prefers Malayalam display labels, and avoids duplicate canonical suggestions where possible.
- Duplicate guesses are enforced by canonical `book.id`, so English and Malayalam aliases of the same book count as one book.
- If Malayalam data is missing for a field, the app falls back safely to English.

When English mode is active:

- Autocomplete suggestions display English only.
- Guessed books display in English.
- Book- and verse-derived content displays in English.

## How to Play Bibdle

1. Choose Daily or Practice mode.
2. Choose a difficulty.
3. Choose English or Malayalam for book and verse content display.
4. Read the verse.
5. Guess the Bible book.
6. Use the clue tiles and proximity feedback to narrow the answer.
7. Review the post-game explanation, book intro, trivia, leaderboard placement, and stats when the puzzle ends.

## Local Games

Choose **Play with friends** to create a room or join one with an invite link or room code. Hosts can choose a room name, whether the room is public or invite-only, a 5-, 10-, or 15-minute game (or a custom 1–240 minute duration), or a custom number of rounds (1–1,000). Public rooms can be discovered from the join form. Rooms support up to 200 players.

Players who join without an account receive a Catholic saint name, which they can edit. Signing in with Google before joining uses the account display name. When the host starts or advances a round, every connected room member loads the same book and can submit guesses. Each new round selects a book not yet used in that room, until all books have been used. A correct answer earns 10 points for one guess, decreasing by one point per guess through the tenth; unanswered rounds earn no points. The live leaderboard sorts by total score and gives tied scores the same rank. When a game ends, the final scoreboard stays visible to each player, with their own result highlighted.

Local games require the provided Firestore rules and composite index. From this project folder, deploy them to the configured Firebase project with `firebase deploy --only firestore:rules,firestore:indexes --project bibdle-db7ae`. Enable **Anonymous** and **Google** under Firebase Console → Authentication → Sign-in method. To automatically expire abandoned rooms and player records after 24 hours, enable Firestore TTL policies for both collections. Firestore TTL deletion is eventual, not an exact timer:

```sh
gcloud firestore fields ttls update expiresAt --collection-group=localRooms --enable-ttl --project=bibdle-db7ae
gcloud firestore fields ttls update expiresAt --collection-group=players --enable-ttl --project=bibdle-db7ae
```

When a game ends, the host removes the room and player records after a short delay so all connected players can receive and view the final scoreboard; the TTL policies clean up rooms if the host disconnects before that cleanup runs. A `permission-denied` room error usually means the rules were not deployed to `bibdle-db7ae` or the required authentication provider is disabled. Missing TTL policies affect abandoned-room cleanup, not room access. The rules preserve signed-in profile sync and the daily leaderboard while restricting room membership and writes.

The invite QR code is rendered from the full room URL by QRServer. The unique room link grants access to anyone who receives it, including the room's public scores and player names.

## Canon Coverage

Bibdle uses the Catholic canon, including the Deuterocanonical books. Book order, sections, and testament groupings are normalized so clue feedback, archive progress, and canonical proximity all follow Catholic Bible structure.

## Accessibility

Bibdle includes accessible modal dialogs, keyboard-friendly autocomplete, screen-reader-friendly status updates, and user-controlled visual preferences.

Accessibility and typography options include:

- Reduced motion.
- High contrast.
- Larger text.
- Language-aware document attributes using `document.documentElement.lang` and a `lang-mode` attribute for script-sensitive styling.
- Malayalam-capable typography for verse text, autocomplete suggestions, guess tiles, archive content, and post-game content.

## Tech Stack

- **HTML** for the application shell and modal structure (`index.html`)
- **CSS** for layout, theming, responsive styling, accessibility preferences, and game presentation (`css/bibdle.css`)
- **Vanilla JavaScript (ES modules)** for gameplay logic, state management, rendering, UI orchestration, and Firebase integration
- **Firebase Authentication** for sign-in and player identity
- **Cloud Firestore** for profile sync and Daily leaderboard data
- **Browser storage** for local progress, preferences, and statistics persistence

## Architecture

### Core entry point

`js/main.js` is the browser entry point. It initializes the game state and Firebase services, coordinates puzzle lifecycle and persistence, and connects the focused UI and feature modules.

### Modal service

`js/core/dom/modal-controller.js` centralizes modal registration and lifecycle behavior. It provides a reusable modal API for opening, closing, toggling, closing the topmost modal, closing all modals, handling Escape key dismissal, backdrop click dismissal, and delegated close-button handling.

This keeps modal behavior consistent across help, settings, stats, archive, leaderboard, and post-game dialogs without duplicating DOM logic in each feature module.

### Bible data

`js/data/books.js` contains localized book metadata, including:

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

`js/data/verses.js` contains localized verse content, including:

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
│   ├── main.js
│   ├── config.js
│   ├── bindings.js
│   ├── game-rules.js
│   ├── localization-service.js
│   ├── local-game.js
│   ├── preferences-storage.js
│   ├── progress-storage.js
│   └── data/
│       ├── books.js
│       └── verses.js
│   ├── app/
│   │   └── bootstrap.js
│   ├── core/
│   │   ├── auth/
│   │   │   └── auth-client.js
│   │   └── dom/
│   │       ├── bindings-registry.js
│   │       ├── modal-controller.js
│   │       ├── render-orchestrator.js
│   │       └── ui-render-utils.js
│   ├── features/
│   │   ├── achievements/
│   │   ├── archive/
│   │   ├── leaderboard/
│   │   ├── postgame/
│   │   ├── puzzle/
│   │   └── stats/
│   └── shared/
│       ├── game-transitions.js
│       └── ui-refactor-helpers.js
└── assets/
    └── achievements/
```

`main.js` coordinates startup and application state. Authentication, modal behavior, DOM bindings, rendering, game transitions, and feature surfaces are organized into focused modules. Configuration, localization, persistence, and Firestore-backed local room play remain at the top level of `js/`.

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