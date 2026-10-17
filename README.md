# Catholic Bibdle

Catholic Bibdle is a browser-based Bible book guessing game inspired by Wordle, built around the Catholic canon. Each puzzle shows a verse, and the player must identify the correct Bible book using feedback on testament, section, first letter, and canonical proximity.

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

- Semantic HTML.
- CSS.
- Vanilla JavaScript.
- Firebase Authentication and Firestore for sign-in, profile sync, and leaderboard data.
- Local browser storage for progress, preferences, stats, and archive data across sessions.

## Data Model

The bilingual content layer depends on localized fields already present in the data files.

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

- Progress.
- Preferences.
- Stats.

Preferences now include:

- Theme.
- Difficulty.
- Preferred mode.
- Language (`en` or `ml`).
- Sound.
- Reduced motion.
- High contrast.
- Larger text.

If older saved preferences do not include a language value, the app defaults safely to English.

## Project Structure

```text
bibdle/
├── index.html
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