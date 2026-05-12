import { books } from './data/books.js';
import { verses } from './data/verses.js';

const CONFIG = {
    modes: {
        normal: { maxGuesses: 6, progressiveHints: true },
        easy: { maxGuesses: 8, progressiveHints: true },
        hard: { maxGuesses: 5, progressiveHints: false }
    },
    proximityBands: {
        exact: 0,
        almost: 2,
        close: 4
    },
    ui: {
        maxSuggestions: 8
    },
    daily: {
        epochYear: 2026,
        epochMonth: 0,
        epochDay: 1
    },
    storageKeys: {
        progress: 'bibdle-progress',
        preferences: 'bibdle-preferences',
        stats: 'bibdle-stats'
    }
};

const state = {
    mode: 'normal',
    currentPuzzle: null,
    guesses: [],
    status: 'playing',
    selectedSuggestionIndex: -1,
    currentSuggestions: [],
    preferences: {
        theme: 'dark',
        difficulty: 'normal',
        preferredMode: 'daily',
        sound: false,
        reducedAnimation: false
    },
    stats: {
        played: 0,
        won: 0,
        lost: 0,
        currentStreak: 0,
        bestStreak: 0,
        guessDistribution: {},
        lastDailySolvedDate: null
    }
};

const elements = {
    verseText: document.getElementById('verseText'),
    dateLabel: document.getElementById('dateLabel'),
    attemptLabel: document.getElementById('attemptLabel'),
    hintBlock: document.getElementById('hintBlock'),
    guessForm: document.getElementById('guessForm'),
    guessInput: document.getElementById('guessInput'),
    autocomplete: document.getElementById('autocomplete'),
    guessRows: document.getElementById('guessRows'),
    statusLine: document.getElementById('statusLine'),
    helpBtn: document.getElementById('helpBtn'),
    shareBtn: document.getElementById('shareBtn'),
    newPuzzleBtn: document.getElementById('newPuzzleBtn'),
    helpModal: document.getElementById('helpModal'),
    closeHelpBtn: document.getElementById('closeHelpBtn'),
    difficultySelect: document.getElementById('difficultySelect'),
    themeToggle: document.querySelector('[data-theme-toggle]')
};

function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function normalizeBookName(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getBookByName(name) {
    const normalized = normalizeBookName(name);
    return books.find(book => book.normalizedName === normalized);
}

function getPuzzleById(id) {
    return verses.find(verse => verse.id === id) ?? null;
}

function getBookDistance(a, b) {
    const bookA = typeof a === 'string' ? getBookByName(a) : a;
    const bookB = typeof b === 'string' ? getBookByName(b) : b;

    if (!bookA || !bookB) return null;
    return Math.abs(bookA.order - bookB.order);
}

function isSameSection(a, b) {
    const bookA = typeof a === 'string' ? getBookByName(a) : a;
    const bookB = typeof b === 'string' ? getBookByName(b) : b;

    if (!bookA || !bookB) return false;
    return bookA.sectionKey === bookB.sectionKey;
}

function getProximityLabel(distance) {
    if (distance === null) return 'unknown';
    if (distance <= CONFIG.proximityBands.exact) return 'exact';
    if (distance <= CONFIG.proximityBands.almost) return 'almost';
    if (distance <= CONFIG.proximityBands.close) return 'close';
    return 'far';
}

function getTodayPuzzleDate() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getPreviousDate(dateString) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

function getDailyIndex() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();

    const epoch = Date.UTC(
        CONFIG.daily.epochYear,
        CONFIG.daily.epochMonth,
        CONFIG.daily.epochDay
    );

    const current = Date.UTC(y, m, d);
    return Math.floor((current - epoch) / 86400000) % verses.length;
}

function pickPuzzle(mode = 'daily') {
    if (mode === 'random') {
        return verses[Math.floor(Math.random() * verses.length)];
    }

    return verses[((getDailyIndex() % verses.length) + verses.length) % verses.length];
}

function buildCurrentPuzzle(mode = 'daily') {
    const puzzle = pickPuzzle(mode);

    return {
        id: puzzle.id,
        date: mode === 'daily' ? getTodayPuzzleDate() : null,
        mode,
        verse: puzzle
    };
}

function clearSavedProgress() {
    try {
        localStorage.removeItem(CONFIG.storageKeys.progress);
    } catch {
        // Ignore storage failures.
    }
}

function saveProgress() {
    if (!state.currentPuzzle) return;

    const payload = {
        mode: state.mode,
        currentPuzzle: {
            id: state.currentPuzzle.id,
            date: state.currentPuzzle.date,
            mode: state.currentPuzzle.mode
        },
        guesses: state.guesses,
        status: state.status
    };

    try {
        localStorage.setItem(CONFIG.storageKeys.progress, JSON.stringify(payload));
    } catch {
        // Ignore storage failures.
    }
}

function loadProgress() {
    try {
        const raw = localStorage.getItem(CONFIG.storageKeys.progress);
        if (!raw) return false;

        const saved = JSON.parse(raw);
        if (!saved || !saved.currentPuzzle?.id) {
            clearSavedProgress();
            return false;
        }

        const savedPuzzle = getPuzzleById(saved.currentPuzzle.id);
        if (!savedPuzzle) {
            clearSavedProgress();
            return false;
        }

        const todayPuzzle = pickPuzzle('daily');
        const todayDate = getTodayPuzzleDate();

        const isMatchingDailyPuzzle =
            saved.currentPuzzle.mode === 'daily' &&
            saved.currentPuzzle.date === todayDate &&
            saved.currentPuzzle.id === todayPuzzle.id;

        if (!isMatchingDailyPuzzle) {
            clearSavedProgress();
            return false;
        }

        state.mode = saved.mode && CONFIG.modes[saved.mode] ? saved.mode : state.preferences.difficulty;
        state.currentPuzzle = {
            id: savedPuzzle.id,
            date: saved.currentPuzzle.date,
            mode: 'daily',
            verse: savedPuzzle
        };
        state.guesses = Array.isArray(saved.guesses) ? saved.guesses : [];
        state.status = ['playing', 'won', 'lost'].includes(saved.status) ? saved.status : 'playing';

        return true;
    } catch {
        clearSavedProgress();
        return false;
    }
}

function savePreferences() {
    const payload = {
        theme: state.preferences.theme,
        difficulty: state.preferences.difficulty,
        preferredMode: state.preferences.preferredMode,
        sound: state.preferences.sound,
        reducedAnimation: state.preferences.reducedAnimation
    };

    try {
        localStorage.setItem(CONFIG.storageKeys.preferences, JSON.stringify(payload));
    } catch {
        // Ignore storage failures.
    }
}

function loadPreferences() {
    const defaults = {
        theme: getSystemTheme(),
        difficulty: 'normal',
        preferredMode: 'daily',
        sound: false,
        reducedAnimation: false
    };

    try {
        const raw = localStorage.getItem(CONFIG.storageKeys.preferences);
        if (!raw) {
            state.preferences = defaults;
            return;
        }

        const saved = JSON.parse(raw);

        state.preferences = {
            theme: saved?.theme === 'light' || saved?.theme === 'dark' ? saved.theme : defaults.theme,
            difficulty: saved?.difficulty && CONFIG.modes[saved.difficulty] ? saved.difficulty : defaults.difficulty,
            preferredMode: saved?.preferredMode === 'random' ? 'random' : defaults.preferredMode,
            sound: typeof saved?.sound === 'boolean' ? saved.sound : defaults.sound,
            reducedAnimation: typeof saved?.reducedAnimation === 'boolean' ? saved.reducedAnimation : defaults.reducedAnimation
        };
    } catch {
        state.preferences = defaults;
    }

    state.mode = state.preferences.difficulty;
}

function saveStats() {
    const payload = {
        played: state.stats.played,
        won: state.stats.won,
        lost: state.stats.lost,
        currentStreak: state.stats.currentStreak,
        bestStreak: state.stats.bestStreak,
        guessDistribution: state.stats.guessDistribution,
        lastDailySolvedDate: state.stats.lastDailySolvedDate
    };

    try {
        localStorage.setItem(CONFIG.storageKeys.stats, JSON.stringify(payload));
    } catch {
        // Ignore storage failures.
    }
}

function loadStats() {
    const defaults = {
        played: 0,
        won: 0,
        lost: 0,
        currentStreak: 0,
        bestStreak: 0,
        guessDistribution: {},
        lastDailySolvedDate: null
    };

    try {
        const raw = localStorage.getItem(CONFIG.storageKeys.stats);
        if (!raw) {
            state.stats = defaults;
            return;
        }

        const saved = JSON.parse(raw);

        state.stats = {
            played: Number.isInteger(saved?.played) && saved.played >= 0 ? saved.played : defaults.played,
            won: Number.isInteger(saved?.won) && saved.won >= 0 ? saved.won : defaults.won,
            lost: Number.isInteger(saved?.lost) && saved.lost >= 0 ? saved.lost : defaults.lost,
            currentStreak: Number.isInteger(saved?.currentStreak) && saved.currentStreak >= 0 ? saved.currentStreak : defaults.currentStreak,
            bestStreak: Number.isInteger(saved?.bestStreak) && saved.bestStreak >= 0 ? saved.bestStreak : defaults.bestStreak,
            guessDistribution: saved?.guessDistribution && typeof saved.guessDistribution === 'object' && !Array.isArray(saved.guessDistribution)
                ? saved.guessDistribution
                : defaults.guessDistribution,
            lastDailySolvedDate: typeof saved?.lastDailySolvedDate === 'string' || saved?.lastDailySolvedDate === null
                ? saved.lastDailySolvedDate
                : defaults.lastDailySolvedDate
        };
    } catch {
        state.stats = defaults;
    }
}

function hasRecordedDailyResult(date) {
    return state.stats.lastDailySolvedDate === date;
}

function recordPuzzleCompletion(outcome) {
    if (!state.currentPuzzle) return;

    const isDaily = state.currentPuzzle.mode === 'daily';
    const completionDate = state.currentPuzzle.date;

    if (isDaily && completionDate && hasRecordedDailyResult(completionDate)) {
        return;
    }

    state.stats.played += 1;

    if (outcome === 'won') {
        state.stats.won += 1;
        const guessCount = state.guesses.length;
        state.stats.guessDistribution[guessCount] = (state.stats.guessDistribution[guessCount] ?? 0) + 1;

        if (isDaily && completionDate) {
            const previousDate = getPreviousDate(completionDate);
            state.stats.currentStreak =
                state.stats.lastDailySolvedDate === previousDate
                    ? state.stats.currentStreak + 1
                    : 1;
            state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.currentStreak);
            state.stats.lastDailySolvedDate = completionDate;
        }
    } else if (outcome === 'lost') {
        state.stats.lost += 1;

        if (isDaily && completionDate) {
            state.stats.currentStreak = 0;
        }
    }

    saveStats();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    state.preferences.theme = theme;
}

function renderThemeToggle() {
    const toggle = elements.themeToggle;
    if (!toggle) return;

    toggle.innerHTML = state.preferences.theme === 'dark'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

    toggle.setAttribute('aria-label', 'Switch to ' + (state.preferences.theme === 'dark' ? 'light' : 'dark') + ' mode');
}

function canChangeDifficulty() {
    return state.guesses.length === 0 && state.status === 'playing';
}

function syncPreferenceControls() {
    if (elements.difficultySelect) {
        elements.difficultySelect.value = state.preferences.difficulty;
        elements.difficultySelect.disabled = !canChangeDifficulty();
        elements.difficultySelect.setAttribute('aria-disabled', String(!canChangeDifficulty()));
        elements.difficultySelect.title = canChangeDifficulty()
            ? 'Choose difficulty before your first guess.'
            : 'Difficulty can only be changed before starting a puzzle.';
    }
}

function initTheme() {
    applyTheme(state.preferences.theme);
    renderThemeToggle();
}

function formatDate() {
    return new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getMaxGuesses() {
    return CONFIG.modes[state.preferences.difficulty]?.maxGuesses ?? CONFIG.modes.normal.maxGuesses;
}

function isGameOver() {
    return state.status === 'won' || state.status === 'lost';
}

function getHintLines() {
    const target = getBookByName(state.currentPuzzle?.verse.book);
    if (!target) return [];

    if (state.guesses.length === 0) {
        return ['The first letter is hidden until later guesses.'];
    }

    if (state.guesses.length === 1) {
        return [
            'It is in the ' + target.testament + ' Testament.',
            'Its first letter is hidden until later guesses.'
        ];
    }

    if (state.guesses.length <= 3) {
        return [
            'It is in the ' + target.testament + ' Testament.',
            'It is in the ' + target.section + ' section.'
        ];
    }

    if (state.guesses.length <= 5) {
        return [
            'It is in the ' + target.testament + ' Testament.',
            'It is in the ' + target.section + ' section.',
            'Its first letter is ' + target.firstLetter + '.'
        ];
    }

    return [
        'It is in the ' + target.testament + ' Testament.',
        'It is in the ' + target.section + ' section.',
        'Its first letter is ' + target.firstLetter + '.',
        'Reference: ' + state.currentPuzzle.verse.reference + '.'
    ];
}

function compareGuess(guessName) {
    const target = getBookByName(state.currentPuzzle?.verse.book);
    const guess = getBookByName(guessName);

    if (!target || !guess) return null;

    const distance = getBookDistance(target, guess);
    const proximity = getProximityLabel(distance);

    return {
        book: guess.name,
        distance,
        proximity,
        testament: {
            value: guess.testament,
            state: guess.testament === target.testament ? 'correct' : 'wrong'
        },
        section: {
            value: guess.section,
            state: isSameSection(guess, target)
                ? 'correct'
                : guess.testament === target.testament
                    ? 'partial'
                    : 'wrong'
        },
        firstLetter: {
            value: guess.firstLetter,
            state: guess.firstLetter === target.firstLetter ? 'correct' : 'wrong'
        },
        bookResult: {
            value: guess.name,
            state: proximity === 'exact'
                ? 'correct'
                : proximity === 'almost' || proximity === 'close'
                    ? 'partial'
                    : 'wrong'
        },
        solved: guess.name === target.name
    };
}

function getAttemptLabel() {
    if (state.status === 'won') return 'You solved it';
    if (state.status === 'lost') return 'Out of guesses';
    if (state.guesses.length === 0) return 'Start guessing';
    return 'Guess again';
}

function renderPuzzleCard() {
    elements.verseText.textContent = state.currentPuzzle?.verse.text ?? '';
    elements.dateLabel.textContent = formatDate();
}

function renderHintBlock() {
    const lines = getHintLines();
    elements.hintBlock.innerHTML = lines
        .map(line => `<p class="meta-line">${line}</p>`)
        .join('');
    elements.attemptLabel.textContent = getAttemptLabel();
}

function renderEmptyGuessRows() {
    elements.guessRows.innerHTML = `
    <div class="guess-grid">
      <div class="empty-state">No guesses yet</div>
      <div class="empty-state">Section clue appears after each guess</div>
      <div class="empty-state">First letter narrows the answer</div>
      <div class="empty-state">Book proximity helps you triangulate</div>
    </div>
  `;
}

function renderGuessRow(guess) {
    return `
    <div class="guess-grid" aria-label="Guess ${guess.book}">
      <div class="guess-card ${guess.testament.state}">${guess.testament.value}</div>
      <div class="guess-card ${guess.section.state}">${guess.section.value}</div>
      <div class="guess-card ${guess.firstLetter.state}">${guess.firstLetter.value}</div>
      <div class="guess-card ${guess.bookResult.state}">${guess.bookResult.value}</div>
    </div>
  `;
}

function renderGuessRows() {
    if (!state.guesses.length) {
        renderEmptyGuessRows();
        return;
    }

    elements.guessRows.innerHTML = state.guesses.map(renderGuessRow).join('');
}

function renderStatus(message = 'Guess the book from the verse above.') {
    elements.statusLine.textContent = message;
}

function renderPuzzleView() {
    renderPuzzleCard();
    renderHintBlock();
    renderGuessRows();
    syncPreferenceControls();

    if (state.status === 'won') {
        renderStatus(`Correct — ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`);
        return;
    }

    if (state.status === 'lost') {
        renderStatus(`Out of guesses — the answer was ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`);
        return;
    }

    renderStatus();
}

function resetInput() {
    elements.guessInput.value = '';
}

function resetSuggestionsState() {
    state.selectedSuggestionIndex = -1;
    state.currentSuggestions = [];
}

function closeSuggestions() {
    state.selectedSuggestionIndex = -1;
    elements.autocomplete.dataset.open = 'false';
    elements.autocomplete.innerHTML = '';
}

function startPuzzle(mode = 'daily') {
    state.currentPuzzle = buildCurrentPuzzle(mode);
    state.guesses = [];
    state.status = 'playing';
    state.mode = state.preferences.difficulty;
    resetInput();
    resetSuggestionsState();
    closeSuggestions();
}

function resetPuzzle(mode = 'daily') {
    startPuzzle(mode);
    saveProgress();
    renderPuzzleView();
}

function renderSuggestions() {
    if (!state.currentSuggestions.length) {
        closeSuggestions();
        return;
    }

    elements.autocomplete.innerHTML = state.currentSuggestions.map((book, index) => `
    <button
      type="button"
      class="suggestion"
      role="option"
      aria-selected="${index === state.selectedSuggestionIndex}"
      data-index="${index}">
      ${book.name}
    </button>
  `).join('');

    elements.autocomplete.dataset.open = 'true';
}

function updateSuggestions(query) {
    const value = query.trim().toLowerCase();

    if (!value) {
        resetSuggestionsState();
        closeSuggestions();
        return;
    }

    state.currentSuggestions = books
        .filter(book => book.name.toLowerCase().includes(value))
        .slice(0, CONFIG.ui.maxSuggestions);

    renderSuggestions();
}

function handleInvalidGuess() {
    renderStatus('Choose a valid Catholic Bible book from the list.');
}

function handleDuplicateGuess(bookName) {
    renderStatus('You already tried ' + bookName + '.');
}

function handleSolvedGuess() {
    state.status = 'won';
    recordPuzzleCompletion('won');
    renderHintBlock();
    renderGuessRows();
    syncPreferenceControls();
    renderStatus(`Correct — ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`);
    saveProgress();
}

function handleLostGuess() {
    state.status = 'lost';
    recordPuzzleCompletion('lost');
    renderHintBlock();
    renderGuessRows();
    syncPreferenceControls();
    renderStatus(`Out of guesses — the answer was ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`);
    saveProgress();
}

function handleIncorrectGuess(bookName, proximity) {
    const proximityText = {
        almost: ' Your guess is almost the target in canon order.',
        close: ' Your guess is fairly close in canon order.',
        far: '',
        unknown: ''
    };

    renderHintBlock();
    renderGuessRows();
    syncPreferenceControls();
    renderStatus(`${bookName} added. Use the colors and clues for your next guess.${proximityText[proximity] ?? ''}`);
    saveProgress();
}

function applyGuess(rawGuess) {
    if (isGameOver()) {
        renderPuzzleView();
        return;
    }

    const match = getBookByName(rawGuess);

    if (!match) {
        handleInvalidGuess();
        return;
    }

    if (state.guesses.some(guess => guess.book === match.name)) {
        handleDuplicateGuess(match.name);
        return;
    }

    const result = compareGuess(match.name);
    if (!result) return;

    state.guesses.push(result);
    resetInput();
    resetSuggestionsState();
    closeSuggestions();

    if (result.solved) {
        handleSolvedGuess();
        return;
    }

    if (state.guesses.length >= getMaxGuesses()) {
        handleLostGuess();
        return;
    }

    handleIncorrectGuess(match.name, result.proximity);
}

function buildShareSummary() {
    return state.guesses.map(guess => {
        const tile = cell => cell.state === 'correct' ? '🟩' : cell.state === 'partial' ? '🟨' : '🟥';
        return [
            tile(guess.testament),
            tile(guess.section),
            tile(guess.firstLetter),
            tile(guess.bookResult)
        ].join('');
    }).join('\n');
}

function buildShareText() {
    const solved = state.status === 'won';
    const guessWord = state.guesses.length === 1 ? 'guess' : 'guesses';

    return `Bibdle ${formatDate()}\n${solved ? 'Solved' : state.status === 'lost' ? 'Lost' : 'In progress'} in ${state.guesses.length} ${guessWord}\n${buildShareSummary()}`;
}

async function copyResult() {
    try {
        await navigator.clipboard.writeText(buildShareText());
        renderStatus('Result copied to clipboard.');
    } catch {
        renderStatus('Clipboard access is unavailable in this browser.');
    }
}

function openHelpModal() {
    elements.helpModal.dataset.open = 'true';
    elements.helpModal.setAttribute('aria-hidden', 'false');
}

function closeHelpModal() {
    elements.helpModal.dataset.open = 'false';
    elements.helpModal.setAttribute('aria-hidden', 'true');
}

function handleGuessSubmit(event) {
    event.preventDefault();
    applyGuess(elements.guessInput.value);
}

function handleGuessInput(event) {
    if (isGameOver()) return;
    updateSuggestions(event.target.value);
}

function handleGuessKeydown(event) {
    if (isGameOver()) return;

    if (elements.autocomplete.dataset.open !== 'true') {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyGuess(elements.guessInput.value);
        }
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        state.selectedSuggestionIndex =
            (state.selectedSuggestionIndex + 1) % state.currentSuggestions.length;
        renderSuggestions();
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        state.selectedSuggestionIndex =
            (state.selectedSuggestionIndex - 1 + state.currentSuggestions.length) % state.currentSuggestions.length;
        renderSuggestions();
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        const picked = state.currentSuggestions[state.selectedSuggestionIndex] || state.currentSuggestions[0];
        if (picked) applyGuess(picked.name);
    }

    if (event.key === 'Escape') {
        closeSuggestions();
    }
}

function handleSuggestionClick(event) {
    const button = event.target.closest('.suggestion');
    if (!button) return;

    const book = state.currentSuggestions[Number(button.dataset.index)];
    if (book) applyGuess(book.name);
}

function handleDocumentClick(event) {
    if (!elements.guessForm.contains(event.target)) {
        closeSuggestions();
    }
}

function handleThemeToggle() {
    const nextTheme = state.preferences.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    renderThemeToggle();
    savePreferences();
}

function handleDifficultyChange(event) {
    if (!canChangeDifficulty()) {
        syncPreferenceControls();
        renderStatus('Difficulty can only be changed before starting the puzzle.');
        return;
    }

    const value = event.target.value;
    if (!CONFIG.modes[value]) return;

    state.preferences.difficulty = value;
    state.mode = value;
    savePreferences();
    saveProgress();
    syncPreferenceControls();
}

function bindEvents() {
    elements.guessForm.addEventListener('submit', handleGuessSubmit);
    elements.guessInput.addEventListener('input', handleGuessInput);
    elements.guessInput.addEventListener('keydown', handleGuessKeydown);
    elements.autocomplete.addEventListener('click', handleSuggestionClick);
    document.addEventListener('click', handleDocumentClick);

    elements.helpBtn.addEventListener('click', openHelpModal);
    elements.closeHelpBtn.addEventListener('click', closeHelpModal);
    elements.helpModal.addEventListener('click', event => {
        if (event.target === elements.helpModal) {
            closeHelpModal();
        }
    });

    elements.shareBtn.addEventListener('click', copyResult);
    elements.newPuzzleBtn.addEventListener('click', () => resetPuzzle('random'));

    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', handleThemeToggle);
    }

    if (elements.difficultySelect) {
        elements.difficultySelect.addEventListener('change', handleDifficultyChange);
    }
}

function initGame() {
    const restored = loadProgress();

    if (!restored) {
        startPuzzle(state.preferences.preferredMode);
        saveProgress();
    }

    renderPuzzleView();
}

function init() {
    loadPreferences();
    loadStats();
    initTheme();
    syncPreferenceControls();
    bindEvents();
    initGame();
}

init();