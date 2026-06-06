import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithCredential,
  linkWithCredential,
  linkWithPopup,
  signOut as firebaseSignOut,
  fetchSignInMethodsForEmail,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  runTransaction,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { books } from "./data/books.js";
import { verses } from "./data/verses.js";
import {
  createAppShell,
  createBootLogger,
  createBootStateSnapshot,
} from "./app-shell.js";
import { createRenderPipeline } from "./render-pipeline.js";
import { createModalService } from "./modal-service.js";
import { createBindings } from "./bindings.js";
import { createAuthService } from "./auth-service.js";

const CONFIG = {
  modes: {
    normal: {
      maxGuesses: 8,
      progressiveHints: true,
      hintSchedule: {
        testamentAt: 1,
        sectionAt: 3,
        firstLetterAt: 7,
        referenceAt: 4,
        distanceAt: 3,
        distanceRequiresBookPartial: false,
      },
    },
    easy: {
      maxGuesses: 8,
      progressiveHints: true,
      hintSchedule: {
        testamentAt: 1,
        sectionAt: 3,
        firstLetterAt: 6,
        referenceAt: 4,
        distanceAt: 1,
        distanceRequiresBookPartial: false,
      },
    },
    hard: {
      maxGuesses: 8,
      progressiveHints: true,
      hintSchedule: {
        testamentAt: 1,
        sectionAt: 5,
        firstLetterAt: 7,
        referenceAt: 3,
        distanceAt: null,
        distanceRequiresBookPartial: true,
      },
    },
  },
  proximityBands: {
    exact: 0,
    veryClose: 1,
    near: 3,
  },
  ui: {
    maxSuggestions: 10,
  },
  daily: {
    epochYear: 2026,
    epochMonth: 0,
    epochDay: 1,
  },
  storageKeys: {
    progress: "bibdle-progress",
    preferences: "bibdle-preferences",
    stats: "bibdle-stats",
  },
};

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC8Mo3GyKwFLvJU5npB_ZwlApJkDqnRrMY",
  authDomain: "bibdle-db7ae.firebaseapp.com",
  projectId: "bibdle-db7ae",
  storageBucket: "bibdle-db7ae.firebasestorage.app",
  messagingSenderId: "278845724002",
  appId: "1:278845724002:web:0842b72515b58791d0883b",
};

const FIREBASE_ENABLED =
  FIREBASE_CONFIG.apiKey !== "REPLACE_ME" &&
  FIREBASE_CONFIG.projectId !== "REPLACE_ME";

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let authService = null;

const BOOT_DEBUG =
  typeof window !== "undefined" &&
  (window.location.search.includes("bibdleDebug=1") ||
    window.location.search.includes("debug=1") ||
    window.location.hash.includes("bibdle-debug"));

const bootLogger = createBootLogger({
  enabled: BOOT_DEBUG,
  prefix: "[Bibdle boot]",
});

let appShell = null;
let renderPipeline = null;
let modalService = null;
let bindings = null;
let authUnsubscribe = null;

const STREAK_BADGES = [
  { id: "streak-3", threshold: 3, label: "3-Day Streak" },
  { id: "streak-7", threshold: 7, label: "7-Day Streak" },
  { id: "streak-14", threshold: 14, label: "14-Day Streak" },
  { id: "streak-30", threshold: 30, label: "30-Day Streak" },
];

const STATS_SCHEMA_VERSION = 2;

function createDefaultAchievementCounters() {
  return {
    totalCorrect: 0,
    dailyCorrect: 0,
    practiceCorrect: 0,
    firstTryCorrect: 0,
    consecutiveFirstTryCorrect: 0,
  };
}

function createDefaultAchievements() {
  return {
    earned: {},
    counters: createDefaultAchievementCounters(),
  };
}

function createDefaultDailyStats() {
  return {
    played: 0,
    won: 0,
    lost: 0,
    currentStreak: 0,
    bestStreak: 0,
    guessDistribution: {},
    lastDailySolvedDate: null,
    earnedBadges: [],
  };
}

function createDefaultPracticeStats() {
  return {
    played: 0,
    won: 0,
    lost: 0,
    guessDistribution: {},
  };
}

function createDefaultStatsState() {
  return {
    version: STATS_SCHEMA_VERSION,
    daily: createDefaultDailyStats(),
    practice: createDefaultPracticeStats(),
    bookStats: {},
    achievements: createDefaultAchievements(),
    meta: {
      updatedAt: null,
    },
  };
}

function sanitizeNonNegativeInt(value, fallback = 0) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function sanitizeGuessDistribution(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output = {};
  Object.entries(value).forEach(([key, count]) => {
    const normalizedKey = String(key);
    output[normalizedKey] = sanitizeNonNegativeInt(count);
  });
  return output;
}

function sanitizeEarnedBadges(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((badgeId) =>
    STREAK_BADGES.some((badge) => badge.id === badgeId),
  );
}

function sanitizeBookStats(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const output = {};

  Object.entries(value).forEach(([key, entry]) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;

    output[key] = {
      plays: sanitizeNonNegativeInt(entry.plays),
      solves: sanitizeNonNegativeInt(entry.solves),
      bestAttempts:
        Number.isInteger(entry.bestAttempts) && entry.bestAttempts > 0
          ? entry.bestAttempts
          : null,
      totalAttempts: sanitizeNonNegativeInt(entry.totalAttempts),
      lastSolvedDate:
        typeof entry.lastSolvedDate === "string" || entry.lastSolvedDate === null
          ? entry.lastSolvedDate
          : null,
    };
  });

  return output;
}

function sanitizeAchievementCounters(value) {
  const defaults = createDefaultAchievementCounters();
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    ...defaults,
    ...Object.fromEntries(
      Object.keys(defaults).map((key) => [key, sanitizeNonNegativeInt(source[key])]),
    ),
  };
}

function sanitizeAchievementEarned(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...value };
}

function sanitizeStatsMeta(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    ...source,
    updatedAt:
      typeof source.updatedAt === "string" || source.updatedAt === null
        ? source.updatedAt
        : null,
  };
}

function sanitizeDailyStats(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return {
    ...createDefaultDailyStats(),
    ...source,
    played: sanitizeNonNegativeInt(source.played),
    won: sanitizeNonNegativeInt(source.won),
    lost: sanitizeNonNegativeInt(source.lost),
    currentStreak: sanitizeNonNegativeInt(source.currentStreak),
    bestStreak: sanitizeNonNegativeInt(source.bestStreak),
    guessDistribution: sanitizeGuessDistribution(source.guessDistribution),
    lastDailySolvedDate:
      typeof source.lastDailySolvedDate === "string" || source.lastDailySolvedDate === null
        ? source.lastDailySolvedDate
        : null,
    earnedBadges: sanitizeEarnedBadges(source.earnedBadges),
  };
}

function sanitizePracticeStats(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return {
    ...createDefaultPracticeStats(),
    ...source,
    played: sanitizeNonNegativeInt(source.played),
    won: sanitizeNonNegativeInt(source.won),
    lost: sanitizeNonNegativeInt(source.lost),
    guessDistribution: sanitizeGuessDistribution(source.guessDistribution),
  };
}

function migrateStatsShape(saved) {
  const defaults = createDefaultStatsState();
  const source =
    saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};

  const hasNestedShape =
    source?.daily &&
    typeof source.daily === "object" &&
    !Array.isArray(source.daily);

  const legacyDailySource = hasNestedShape ? source.daily : source;
  const legacyPracticeSource =
    source?.practice && typeof source.practice === "object" && !Array.isArray(source.practice)
      ? source.practice
      : null;

  const migrated = {
    ...defaults,
    ...source,
    version: STATS_SCHEMA_VERSION,
    daily: sanitizeDailyStats(legacyDailySource),
    practice: sanitizePracticeStats(legacyPracticeSource),
    bookStats: sanitizeBookStats(source.bookStats),
    achievements: {
      ...createDefaultAchievements(),
      ...(source.achievements && typeof source.achievements === "object" && !Array.isArray(source.achievements)
        ? source.achievements
        : {}),
      earned: sanitizeAchievementEarned(source?.achievements?.earned),
      counters: sanitizeAchievementCounters(source?.achievements?.counters),
    },
    meta: sanitizeStatsMeta(source.meta),
  };

  if (
    !hasNestedShape &&
    Array.isArray(source?.earnedBadges) &&
    !migrated.daily.earnedBadges.length
  ) {
    migrated.daily.earnedBadges = sanitizeEarnedBadges(source.earnedBadges);
  }

  return migrated;
}

function getSerializedStatsForSave() {
  const stats = migrateStatsShape(state.stats);
  return {
    ...stats,
    version: STATS_SCHEMA_VERSION,
    meta: {
      ...sanitizeStatsMeta(stats.meta),
      updatedAt: new Date().toISOString(),
    },
  };
}

function updateAchievementCountersForCompletion(outcome) {
  const stats = migrateStatsShape(state.stats);
  const counters = stats.achievements.counters;
  const isWin = outcome === "won";
  const isFirstTryWin = isWin && state.guesses.length === 1;
  const isDaily = state.currentPuzzle?.mode === "daily";
  const isPractice = state.currentPuzzle?.mode === "practice";

  if (isWin) {
    counters.totalCorrect += 1;

    if (isDaily) {
      counters.dailyCorrect += 1;
    }

    if (isPractice) {
      counters.practiceCorrect += 1;
    }

    if (isFirstTryWin) {
      counters.firstTryCorrect += 1;
      counters.consecutiveFirstTryCorrect += 1;
    } else {
      counters.consecutiveFirstTryCorrect = 0;
    }
  } else {
    counters.consecutiveFirstTryCorrect = 0;
  }

  state.stats = stats;
}

function getSharePayload() {
  const text = buildShareText();
  const playUrl = "https://dvndmy.github.io/BIBDLE";

  return {
    text,
    url: playUrl,
    title: "Catholic Bibdle",
  };
}

function canUseNativeShare(payload) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }

  if (typeof navigator.canShare === "function") {
    try {
      return navigator.canShare({
        text: payload.text,
        url: payload.url,
      });
    } catch {
      return false;
    }
  }

  return true;
}

async function fallbackCopyText(text, options = {}) {
  const {
    copiedMessage = "Result copied to clipboard.",
    unavailableMessage = "Sharing is unavailable in this browser.",
  } = options;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      renderStatus(copiedMessage);
      return true;
    }
  } catch { }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (copied) {
      renderStatus(copiedMessage);
      return true;
    }
  } catch { }

  renderStatus(unavailableMessage);
  return false;
}

async function shareResult() {
  const payload = getSharePayload();

  if (canUseNativeShare(payload)) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      renderStatus("Result shared.");
      return true;
    } catch (error) {
      const errorName = error?.name || "";
      if (errorName === "AbortError") {
        return fallbackCopyText(payload.text, {
          copiedMessage: "Share canceled. Result copied to clipboard instead.",
          unavailableMessage: "Share canceled, and clipboard access is unavailable here.",
        });
      }

      return fallbackCopyText(payload.text, {
        copiedMessage: "Sharing failed, so the result was copied instead.",
        unavailableMessage: "Sharing is unavailable, and clipboard access is not available here.",
      });
    }
  }

  return fallbackCopyText(payload.text, {
    copiedMessage: "Native share is unavailable. Result copied to clipboard.",
    unavailableMessage: "Sharing is unavailable in this browser.",
  });
}

const state = {
  mode: "daily",
  currentPuzzle: null,
  guesses: [],
  status: "playing",
  selectedSuggestionIndex: -1,
  currentSuggestions: [],
  postGameOpen: false,
  countdownIntervalId: null,
  countdownTimeoutId: null,
  preferences: {
    theme: "dark",
    difficulty: "normal",
    preferredMode: "daily",
    language: "en",
    sound: false,
    reducedAnimation: false,
    highContrast: false,
    largeText: false,
  },
  stats: {
    daily: {
      played: 0,
      won: 0,
      lost: 0,
      currentStreak: 0,
      bestStreak: 0,
      guessDistribution: {},
      lastDailySolvedDate: null,
      earnedBadges: [],
    },
    practice: {
      played: 0,
      won: 0,
      lost: 0,
      guessDistribution: {},
    },
    bookStats: {},
  },
  auth: {
    ready: false,
    enabled: false,
    user: null,
    syncing: false,
  },
  leaderboard: {
    loading: false,
    stats: null,
    entries: [],
    userRank: null,
  },
};

function ensureClueUiState() {
  if (!state.ui) {
    state.ui = {};
  }

  if (!state.ui.clues) {
    state.ui.clues = {
      lastUnlockedKeys: [],
      lastRenderSignature: "",
    };
  }

  return state.ui.clues;
}

function syncEndStateVisibility() {
  const isComplete = state.status === "won" || state.status === "lost";

  if (elements.preGuessPanel) {
    elements.preGuessPanel.hidden = isComplete;
  }

  if (elements.guessForm) {
    elements.guessForm.hidden = isComplete;
  }

  if (elements.guessInput) {
    if (isComplete) {
      elements.guessInput.blur();
      elements.guessInput.setAttribute("tabindex", "-1");
    } else {
      elements.guessInput.removeAttribute("tabindex");
    }
  }

  if (elements.autocomplete) {
    if (isComplete) {
      elements.autocomplete.innerHTML = "";
      elements.autocomplete.hidden = true;
    } else {
      elements.autocomplete.hidden = false;
    }
  }
}

const elements = {
  mobileLanguageToggle: document.getElementById("mobileLanguageToggle"),
  mobileLanguageGlyph: document.getElementById("mobileLanguageGlyph"),
  signInBtn: document.getElementById("signInBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  authStatus: document.getElementById("authStatus"),
  languageSelect: document.getElementById("languageSelect"),
  verseText: document.getElementById("verseText"),
  dateLabel: document.getElementById("dateLabel"),
  countdownTimer: document.getElementById("countdownTimer"),
  preGuessPanel: document.getElementById("preGuessPanel"),
  attemptLabel: document.getElementById("attemptLabel"),
  hintBlock: document.getElementById("hintBlock"),
  guessForm: document.getElementById("guessForm"),
  guessInput: document.getElementById("guessInput"),
  autocomplete: document.getElementById("autocomplete"),
  guessRows: document.getElementById("guessRows"),
  statusLine: document.getElementById("statusLine"),

  helpBtn: document.getElementById("helpBtn"),
  shareBtn: document.getElementById("shareBtn"),
  nextPracticeBtn: document.getElementById("nextPracticeBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  statsBtn: document.getElementById("statsBtn"),
  tryPracticeBtn: document.getElementById("tryPracticeBtn"),
  todayBibdleBtn: document.getElementById("todayBibdleBtn"),

  difficultySelect: document.getElementById("difficultySelect"),
  modeSelect: document.getElementById("modeSelect"),
  themeToggle: document.querySelector("[data-theme-toggle]"),

  helpModal: document.getElementById("helpModal"),
  closeHelpBtn: document.getElementById("closeHelpBtn"),

  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  reducedMotionToggle: document.getElementById("reducedMotionToggle"),
  highContrastToggle: document.getElementById("highContrastToggle"),
  largeTextToggle: document.getElementById("largeTextToggle"),
  soundToggle: document.getElementById("soundToggle"),
  appShell: document.getElementById("appShell"),
  statsModal: document.getElementById("statsModal"),
  closeStatsBtn: document.getElementById("closeStatsBtn"),
  statsPlayed: document.getElementById("statsPlayed"),
  statsWon: document.getElementById("statsWon"),
  statsLost: document.getElementById("statsLost"),
  statsCurrentStreak: document.getElementById("statsCurrentStreak"),
  statsBestStreak: document.getElementById("statsBestStreak"),
  statsGuessDistribution: document.getElementById("statsGuessDistribution"),
  statsModalBadges: document.getElementById("statsModalBadges"),
  practiceStatsPlayed: document.getElementById("practiceStatsPlayed"),
  practiceStatsWon: document.getElementById("practiceStatsWon"),
  practiceStatsLost: document.getElementById("practiceStatsLost"),
  practiceStatsGuessDistribution: document.getElementById("practiceStatsGuessDistribution"),
  postGameStatsLabel: document.getElementById("postGameStatsLabel"),
  postGameStatsGridSecondary: document.getElementById("postGameStatsGridSecondary"),
  postGameStatsPlayed: document.getElementById("postGameStatsPlayed"),
  postGameStatsWon: document.getElementById("postGameStatsWon"),
  postGameStatsLost: document.getElementById("postGameStatsLost"),
  postGameStatsCurrentStreak: document.getElementById("postGameStatsCurrentStreak"),
  postGameStatsBestStreak: document.getElementById("postGameStatsBestStreak"),
  postGameCurrentStreakItem: document.getElementById("postGameCurrentStreakItem"),
  postGameBestStreakItem: document.getElementById("postGameBestStreakItem"),
  postGameGuessDistribution: document.getElementById("postGameGuessDistribution"),
  postGameModal: document.getElementById("postGameModal"),
  postGameTitle: document.getElementById("postGameTitle"),
  postGameBadge: document.getElementById("postGameBadge"),
  postGameReference: document.getElementById("postGameReference"),
  postGameBook: document.getElementById("postGameBook"),
  postGameVerse: document.getElementById("postGameVerse"),
  postGameIntroTitle: document.getElementById("postGameIntroTitle"),
  postGameIntroText: document.getElementById("postGameIntroText"),
  postGameCloseBtn: document.getElementById("postGameCloseBtn"),
  postGameNextBtn: document.getElementById("postGameNextBtn"),
  postGameTriviaSection: document.getElementById("postGameTriviaSection"),
  postGameTriviaTitle: document.getElementById("postGameTriviaTitle"),
  postGameTriviaText: document.getElementById("postGameTriviaText"),
  postGameTriviaChips: document.getElementById("postGameTriviaChips"),
  postGameLeaderboardSection: document.getElementById("postGameLeaderboardSection"),
  postGameLeaderboardRank: document.getElementById("postGameLeaderboardRank"),
  postGameLeaderboardBtn: document.getElementById("postGameLeaderboardBtn"),
  postGameCopyBtn: document.getElementById("postGameCopyBtn"),
  postGamePracticeBtn: document.getElementById("postGamePracticeBtn"),

  archiveBtn: document.getElementById("archiveBtn"),
  archiveModal: document.getElementById("archiveModal"),
  closeArchiveBtn: document.getElementById("closeArchiveBtn"),
  archiveSummary: document.getElementById("archiveSummary"),
  archiveSummaryExpanded: document.getElementById("archiveSummaryExpanded"),
  archiveGrid: document.getElementById("archiveGrid"),
  archiveDetails: document.getElementById("archiveDetails"),

  leaderboardBtn: document.getElementById("leaderboardBtn"),
  leaderboardModal: document.getElementById("leaderboardModal"),
  closeLeaderboardBtn: document.getElementById("closeLeaderboardBtn"),
  leaderboardSummary: document.getElementById("leaderboardSummary"),
  leaderboardList: document.getElementById("leaderboardList"),
  leaderboardUserRank: document.getElementById("leaderboardUserRank"),
  appShellRoot: document.getElementById("appShell")
};

function getRequiredBootElements() {
  return {
    appShell: elements.appShell,
    verseText: elements.verseText,
    dateLabel: elements.dateLabel,
    countdownTimer: elements.countdownTimer,
    attemptLabel: elements.attemptLabel,
    hintBlock: elements.hintBlock,
    guessForm: elements.guessForm,
    guessInput: elements.guessInput,
    autocomplete: elements.autocomplete,
    guessRows: elements.guessRows,
    statusLine: elements.statusLine,
    difficultySelect: elements.difficultySelect,
    modeSelect: elements.modeSelect,
  };
}

function getOptionalBootElements() {
  return {
    themeToggle: elements.themeToggle,
    languageSelect: elements.languageSelect,
    mobileLanguageToggle: elements.mobileLanguageToggle,
    authStatus: elements.authStatus,
    signInBtn: elements.signInBtn,
    signOutBtn: elements.signOutBtn,
    helpModal: elements.helpModal,
    settingsModal: elements.settingsModal,
    statsModal: elements.statsModal,
    archiveModal: elements.archiveModal,
    leaderboardModal: elements.leaderboardModal,
    postGameModal: elements.postGameModal,
  };
}

function validateBootRequirements() {
  const required = getRequiredBootElements();
  const optional = getOptionalBootElements();

  const missingRequired = Object.entries(required)
    .filter(([, element]) => !element)
    .map(([key]) => key);

  const missingOptional = Object.entries(optional)
    .filter(([, element]) => !element)
    .map(([key]) => key);

  const contentIssues = [];

  if (!Array.isArray(books) || books.length === 0) {
    contentIssues.push("books");
  }

  if (!Array.isArray(verses) || verses.length === 0) {
    contentIssues.push("verses");
  }

  return {
    ok: missingRequired.length === 0 && contentIssues.length === 0,
    missingRequired,
    missingOptional,
    contentIssues,
  };
}

function ensureBootDebugSurface() {
  if (typeof window === "undefined") return;

  if (!window.__BIBDLE_BOOT__) {
    window.__BIBDLE_BOOT__ = {};
  }

  window.__BIBDLE_BOOT__.debug = BOOT_DEBUG;
  window.__BIBDLE_BOOT__.getState = () =>
    appShell ? appShell.getSnapshot() : createBootStateSnapshot();
  window.__BIBDLE_BOOT__.state = () =>
    appShell ? appShell.getSnapshot() : createBootStateSnapshot();
  window.__BIBDLE_BOOT__.elements = elements;
  window.__BIBDLE_BOOT__.stateRef = state;
  window.__BIBDLE_BOOT__.validate = validateBootRequirements;
}

function getLifecycleReadinessSnapshot() {
  return {
    dom: !!elements.appShell,
    contentLoaded: Array.isArray(books) && books.length > 0 && Array.isArray(verses) && verses.length > 0,
    hydrated: !!state.preferences && !!state.stats,
    servicesInitialized: !!state.auth.ready || state.auth.enabled === false,
    authReady: !!state.auth.ready,
    puzzleReady: !!state.currentPuzzle,
    renderReady: !!state.currentPuzzle && !!elements.verseText,
    eventsBound: !!state.ui?.eventsBound,
  };
}

function publishBootSnapshot(extra = {}) {
  if (!appShell) return;

  appShell.updateReadiness(getLifecycleReadinessSnapshot());
  appShell.setMeta("mode", state.mode);
  appShell.setMeta("difficulty", state.preferences?.difficulty || "normal");
  appShell.setMeta("auth", {
    ready: !!state.auth.ready,
    enabled: !!state.auth.enabled,
    user: state.auth.user
      ? {
        uid: state.auth.user.uid,
        isAnonymous: !!state.auth.user.isAnonymous,
      }
      : null,
    syncing: !!state.auth.syncing,
  });

  const snapshot = appShell.getSnapshot();

  if (typeof window !== "undefined" && window.__BIBDLE_BOOT__) {
    window.__BIBDLE_BOOT__.snapshot = snapshot;
    window.__BIBDLE_BOOT__.last = {
      ...snapshot,
      ...extra,
    };
  }
}

function markLifecycleStage(stage, details = {}) {
  if (!appShell) return;
  appShell.setStage(stage, details);
  publishBootSnapshot(details);
}

function markLifecycleError(stage, error, details = {}) {
  if (!appShell) return;
  appShell.fail(stage, error, details);
  publishBootSnapshot({
    failedStage: stage,
    error: error?.message || String(error),
    ...details,
  });
}

function createStartupDependencies() {
  return {
    state,
    elements,
    bootLogger,
    validateBootRequirements,
    loadPreferences,
    applyLanguageToDocument,
    applyAccessibilityPreferences,
    loadStats,
    initTheme,
    syncPreferenceControls,
    renderLanguageControl,
    renderMobileLanguageToggle,
    renderAuthUI,
    bindEvents,
    initAuthLifecycle,
    initGame,
    startPuzzle,
    resetPuzzle,
    renderPuzzleView,
    renderStatsModal,
    stopCountdownTimer,
    updateCountdownLabel,
    startCountdownTimer,
    isGameOver,
    authService,
    renderPipeline,
  };
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const LEADERBOARD_LIMIT = 10;

function getDailyDateKey() {
  if (state.currentPuzzle?.mode === "daily" && state.currentPuzzle?.date) {
    return state.currentPuzzle.date;
  }

  return getTodayPuzzleDate();
}

function hashStringToSeed(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function getDeterministicDailyIndex() {
  if (!Array.isArray(verses) || verses.length === 0) return 0;

  const dateKey = getTodayPuzzleDate();
  const seed = hashStringToSeed(String(dateKey));
  const random = mulberry32(seed);

  return Math.floor(random() * verses.length);
}

function getDailyPuzzleId() {
  return (
    state.currentPuzzle?.verse?.id ||
    state.currentPuzzle?.id ||
    state.currentPuzzle?.verse?.reference ||
    state.currentPuzzle?.verse?.book ||
    getDailyDateKey()
  );
}

function getDailyStatsDocRef(dateKey) {
  if (!firebaseDb || !dateKey) return null;
  return doc(firebaseDb, "dailyStats", dateKey);
}

function getDailyScoresCollectionRef(dateKey) {
  if (!firebaseDb || !dateKey) return null;
  return collection(firebaseDb, "dailyStats", dateKey, "scores");
}

function sanitizeLeaderboardName(name) {
  const raw = typeof name === "string" ? name.trim() : "";
  if (!raw) return "Anonymous Disciple";
  const cleaned = raw.replace(/\s+/g, " ").replace(/[<>]/g, "");
  return cleaned.length > 24 ? `${cleaned.slice(0, 24)}…` : cleaned;
}

function getAnonymousPublicNameFromUid(uid) {
  const safeUid = String(uid || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const suffix = (safeUid || "unknown00").slice(0, 8).padEnd(8, "0");
  return `disciple_${suffix}`;
}

function getPublicUserName(user = state.auth.user) {
  if (!user) return "";

  if (user.isAnonymous) {
    return getAnonymousPublicNameFromUid(user.uid);
  }

  return sanitizeLeaderboardName(user.displayName || user.email || "Google user");
}

function formatLeaderboardTime(value) {
  if (!value) return "—";
  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getLeaderboardEntryDocRef(dateKey, uid) {
  if (!firebaseDb || !dateKey || !uid) return null;
  return doc(firebaseDb, "dailyStats", dateKey, "scores", uid);
}

function getUserProfileRef(uid) {
  if (!firebaseDb || !uid) return null;
  return doc(firebaseDb, "users", uid, "profile", "main");
}

function getLocalPreferencesSnapshot() {
  return JSON.parse(JSON.stringify(state.preferences));
}

function getLocalStatsSnapshot() {
  return JSON.parse(JSON.stringify(state.stats));
}

function sanitizeCloudProfile(data) {
  if (!data || typeof data !== "object") {
    return { preferences: null, stats: null };
  }

  return {
    preferences:
      data.preferences && typeof data.preferences === "object"
        ? data.preferences
        : null,
    stats: data.stats && typeof data.stats === "object" ? data.stats : null,
  };
}

function getCurrentLanguage() {
  return state.preferences?.language === "ml" ? "ml" : "en";
}

function getSafeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getLocalizedValue(primary, fallback) {
  return getSafeString(primary) || getSafeString(fallback) || "";
}

function getLocalizedFirstLetter(book, language = getCurrentLanguage()) {
  if (!book) return "";

  const localizedName = getLocalizedBookName(book, language);
  const displayName = getSafeString(localizedName).replace(/^[123]\s*/, "").trim();

  if (!displayName) return "";

  const locale = language === "ml" ? "ml-IN" : "en-US";
  return displayName.charAt(0).toLocaleUpperCase(locale);
}

function normalizeBookName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function getLocalizedBookName(book, language = getCurrentLanguage()) {
  if (!book) return "";
  return language === "ml"
    ? getLocalizedValue(book.nameMl, book.name)
    : getLocalizedValue(book.name, book.nameMl);
}

function getLocalizedTestament(book, language = getCurrentLanguage()) {
  if (!book) return "";
  return language === "ml"
    ? getLocalizedValue(book.testamentMl, book.testament)
    : getLocalizedValue(book.testament, book.testamentMl);
}

function getLocalizedSection(book, language = getCurrentLanguage()) {
  if (!book) return "";
  return language === "ml"
    ? getLocalizedValue(book.sectionMl, book.section)
    : getLocalizedValue(book.section, book.sectionMl);
}

function getLocalizedBookIntroTitle(book, language = getCurrentLanguage()) {
  if (!book) return "";
  return language === "ml"
    ? getLocalizedValue(book.bookIntroTitleMl, book.bookIntroTitle)
    : getLocalizedValue(book.bookIntroTitle, book.bookIntroTitleMl);
}

function getLocalizedBookIntroText(book, language = getCurrentLanguage()) {
  if (!book) return "";
  return language === "ml"
    ? getLocalizedValue(book.bookIntroTextMl, book.bookIntroText)
    : getLocalizedValue(book.bookIntroText, book.bookIntroTextMl);
}

function getLocalizedReference(verse, language = getCurrentLanguage()) {
  if (!verse) return "";
  return language === "ml"
    ? getLocalizedValue(verse.referenceMl, verse.reference)
    : getLocalizedValue(verse.reference, verse.referenceMl);
}

function getLocalizedVerseText(verse, language = getCurrentLanguage()) {
  if (!verse) return "";
  return language === "ml"
    ? getLocalizedValue(verse.textMl, verse.text)
    : getLocalizedValue(verse.text, verse.textMl);
}

function getLocalizedClue(verse, language = getCurrentLanguage()) {
  if (!verse) return "";
  return language === "ml"
    ? getLocalizedValue(verse.clueMl, verse.clue)
    : getLocalizedValue(verse.clue, verse.clueMl);
}

function getLocalizedExplanation(verse, language = getCurrentLanguage()) {
  if (!verse) return "";
  return language === "ml"
    ? getLocalizedValue(verse.explanationMl, verse.explanation)
    : getLocalizedValue(verse.explanation, verse.explanationMl);
}

function getLocalizedThemes(item, language = getCurrentLanguage()) {
  const englishThemes = Array.isArray(item?.themes)
    ? item.themes
    : Array.isArray(item?.bookThemes)
      ? item.bookThemes
      : [];

  const malayalamThemes = Array.isArray(item?.themesMl)
    ? item.themesMl
    : Array.isArray(item?.bookThemesMl)
      ? item.bookThemesMl
      : [];

  const source = language === "ml" ? malayalamThemes : englishThemes;
  const fallback = language === "ml" ? englishThemes : [];

  return (source.length ? source : fallback).filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

function getBookAliases(book) {
  if (!book) return [];
  const aliases = new Map();

  const addAlias = (label, source) => {
    const value = getSafeString(label);
    const normalized = normalizeBookName(value);
    if (!value || !normalized) return;
    aliases.set(normalized, {
      value,
      normalized,
      source,
      bookId: book.id,
    });
  };

  addAlias(book.name, "en");
  addAlias(book.nameMl, "ml");

  return Array.from(aliases.values());
}

function getBookById(bookId) {
  return books.find((book) => book.id === bookId) ?? null;
}

function getCanonicalBookId(input) {
  if (!input) return "";
  if (typeof input === "object" && input.id) return input.id;
  const byName = getBookByName(input);
  return byName?.id || "";
}

function getBookByName(name) {
  const normalized = normalizeBookName(name);

  return books.find((book) => {
    if (normalizeBookName(book.normalizedName) === normalized) return true;
    return getBookAliases(book).some((alias) => alias.normalized === normalized);
  }) ?? null;
}

function isBookAlreadyGuessed(bookId) {
  return state.guesses.some((guess) => guess.bookId === bookId);
}

function getSuggestionCandidates(query, language = getCurrentLanguage()) {
  const normalizedQuery = normalizeBookName(query);
  if (!normalizedQuery) return [];

  const ranked = [];

  books.forEach((book) => {
    const aliases = getBookAliases(book);
    const matchingAliases = aliases.filter((alias) =>
      alias.normalized.includes(normalizedQuery)
    );

    if (!matchingAliases.length) return;
    if (isBookAlreadyGuessed(book.id)) return;

    const mlAlias = aliases.find((alias) => alias.source === "ml");
    const enAlias = aliases.find((alias) => alias.source === "en");
    const exactMatch = matchingAliases.some((alias) => alias.normalized === normalizedQuery);
    const startsWithMatch = matchingAliases.some((alias) => alias.normalized.startsWith(normalizedQuery));
    const matchedMl = matchingAliases.some((alias) => alias.source === "ml");
    const matchedEn = matchingAliases.some((alias) => alias.source === "en");

    if (language === "en") {
      if (!matchedEn) return;

      ranked.push({
        bookId: book.id,
        primaryLabel: getLocalizedBookName(book, "en"),
        secondaryLabel: "",
        matchSource: "en",
        score: exactMatch ? 0 : startsWithMatch ? 1 : 2,
      });
      return;
    }

    ranked.push({
      bookId: book.id,
      primaryLabel: getLocalizedBookName(book, "ml"),
      secondaryLabel:
        getLocalizedBookName(book, "ml") !== getLocalizedBookName(book, "en")
          ? getLocalizedBookName(book, "en")
          : "",
      matchSource: matchedMl ? "ml" : "en",
      score: exactMatch ? 0 : startsWithMatch ? 1 : 2,
    });
  });

  return ranked
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (language === "ml" && a.matchSource !== b.matchSource) {
        return a.matchSource === "ml" ? -1 : 1;
      }
      return a.primaryLabel.localeCompare(b.primaryLabel, language === "ml" ? "ml" : "en");
    })
    .slice(0, CONFIG.ui.maxSuggestions);
}

function applyLanguageToDocument() {
  const language = getCurrentLanguage();
  document.documentElement.lang = language;
  document.documentElement.setAttribute("lang-mode", language);
}

function renderLanguageControl() {
  if (elements.languageSelect) {
    elements.languageSelect.value = getCurrentLanguage();
  }
}

function getDisplayBookNameFromGuess(guess) {
  const book = getBookById(guess?.bookId);
  return getLocalizedBookName(book, getCurrentLanguage()) || guess?.book || "";
}

function mergePreferenceData(localPreferences, cloudPreferences) {
  if (!cloudPreferences || typeof cloudPreferences !== "object") {
    return { ...localPreferences };
  }

  return {
    ...localPreferences,
    ...cloudPreferences,
  };
}

function mergeGuessDistribution(localValue, cloudValue) {
  const output = {};
  const keys = new Set([
    ...Object.keys(localValue || {}),
    ...Object.keys(cloudValue || {}),
  ]);

  keys.forEach((key) => {
    const localCount = Number.isInteger(localValue?.[key]) ? localValue[key] : 0;
    const cloudCount = Number.isInteger(cloudValue?.[key]) ? cloudValue[key] : 0;
    output[key] = Math.max(localCount, cloudCount);
  });

  return output;
}

function mergeBookStatsMap(localMap, cloudMap) {
  const output = {};
  const keys = new Set([
    ...Object.keys(localMap || {}),
    ...Object.keys(cloudMap || {}),
  ]);

  keys.forEach((key) => {
    const localEntry = localMap?.[key] || null;
    const cloudEntry = cloudMap?.[key] || null;

    const localBest =
      Number.isInteger(localEntry?.bestAttempts) && localEntry.bestAttempts > 0
        ? localEntry.bestAttempts
        : null;

    const cloudBest =
      Number.isInteger(cloudEntry?.bestAttempts) && cloudEntry.bestAttempts > 0
        ? cloudEntry.bestAttempts
        : null;

    output[key] = {
      plays: Math.max(localEntry?.plays || 0, cloudEntry?.plays || 0),
      solves: Math.max(localEntry?.solves || 0, cloudEntry?.solves || 0),
      bestAttempts:
        localBest === null
          ? cloudBest
          : cloudBest === null
            ? localBest
            : Math.min(localBest, cloudBest),
      totalAttempts: Math.max(
        localEntry?.totalAttempts || 0,
        cloudEntry?.totalAttempts || 0,
      ),
      lastSolvedDate:
        [localEntry?.lastSolvedDate, cloudEntry?.lastSolvedDate]
          .filter(Boolean)
          .sort()
          .at(-1) || null,
    };
  });

  return output;
}

function mergeStatsData(localStats, cloudStats) {
  const safeLocal = migrateStatsShape(localStats);
  const safeCloud = migrateStatsShape(cloudStats);

  const localDaily = safeLocal.daily || {};
  const cloudDaily = safeCloud.daily || {};
  const localPractice = safeLocal.practice || {};
  const cloudPractice = safeCloud.practice || {};
  const localAchievements = safeLocal.achievements || {};
  const cloudAchievements = safeCloud.achievements || {};
  const localCounters = localAchievements.counters || {};
  const cloudCounters = cloudAchievements.counters || {};

  return {
    version: STATS_SCHEMA_VERSION,
    daily: {
      played: Math.max(localDaily.played || 0, cloudDaily.played || 0),
      won: Math.max(localDaily.won || 0, cloudDaily.won || 0),
      lost: Math.max(localDaily.lost || 0, cloudDaily.lost || 0),
      currentStreak: Math.max(localDaily.currentStreak || 0, cloudDaily.currentStreak || 0),
      bestStreak: Math.max(localDaily.bestStreak || 0, cloudDaily.bestStreak || 0),
      guessDistribution: mergeGuessDistribution(
        localDaily.guessDistribution,
        cloudDaily.guessDistribution,
      ),
      lastDailySolvedDate:
        [localDaily.lastDailySolvedDate, cloudDaily.lastDailySolvedDate]
          .filter(Boolean)
          .sort()
          .at(-1) || null,
      earnedBadges: Array.from(
        new Set([
          ...(Array.isArray(localDaily.earnedBadges) ? localDaily.earnedBadges : []),
          ...(Array.isArray(cloudDaily.earnedBadges) ? cloudDaily.earnedBadges : []),
        ]),
      ),
    },
    practice: {
      played: Math.max(localPractice.played || 0, cloudPractice.played || 0),
      won: Math.max(localPractice.won || 0, cloudPractice.won || 0),
      lost: Math.max(localPractice.lost || 0, cloudPractice.lost || 0),
      guessDistribution: mergeGuessDistribution(
        localPractice.guessDistribution,
        cloudPractice.guessDistribution,
      ),
    },
    bookStats: mergeBookStatsMap(safeLocal.bookStats, safeCloud.bookStats),
    achievements: {
      ...createDefaultAchievements(),
      ...localAchievements,
      ...cloudAchievements,
      earned: {
        ...(localAchievements.earned && typeof localAchievements.earned === "object" ? localAchievements.earned : {}),
        ...(cloudAchievements.earned && typeof cloudAchievements.earned === "object" ? cloudAchievements.earned : {}),
      },
      counters: {
        totalCorrect: Math.max(localCounters.totalCorrect || 0, cloudCounters.totalCorrect || 0),
        dailyCorrect: Math.max(localCounters.dailyCorrect || 0, cloudCounters.dailyCorrect || 0),
        practiceCorrect: Math.max(localCounters.practiceCorrect || 0, cloudCounters.practiceCorrect || 0),
        firstTryCorrect: Math.max(localCounters.firstTryCorrect || 0, cloudCounters.firstTryCorrect || 0),
        consecutiveFirstTryCorrect: Math.max(
          localCounters.consecutiveFirstTryCorrect || 0,
          cloudCounters.consecutiveFirstTryCorrect || 0,
        ),
      },
    },
    meta: {
      ...sanitizeStatsMeta(safeLocal.meta),
      ...sanitizeStatsMeta(safeCloud.meta),
      updatedAt:
        [safeLocal?.meta?.updatedAt, safeCloud?.meta?.updatedAt]
          .filter(Boolean)
          .sort()
          .at(-1) || null,
    },
  };
}

function mergeLocalAndCloudData(localData, cloudData) {
  return {
    preferences: mergePreferenceData(localData.preferences, cloudData.preferences),
    stats: mergeStatsData(localData.stats, cloudData.stats),
  };
}

function getBookStatsKey(book) {
  if (!book) return "";
  return book.id || book.bookId || book.slug || normalizeBookName(book.name);
}

function ensureBookStatsEntry(book) {
  const key = getBookStatsKey(book);
  if (!key) return null;

  if (!state.stats.bookStats[key]) {
    state.stats.bookStats[key] = {
      plays: 0,
      solves: 0,
      bestAttempts: null,
      totalAttempts: 0,
      lastSolvedDate: null,
    };
  }

  return state.stats.bookStats[key];
}

function getBookStats(book) {
  const key = getBookStatsKey(book);
  return state.stats.bookStats[key] ?? null;
}

function getAverageAttemptsForBook(book) {
  const entry = getBookStats(book);
  if (!entry || entry.solves <= 0) return null;
  return entry.totalAttempts / entry.solves;
}

function getArchiveCellState(book) {
  const entry = getBookStats(book);

  if (!entry || entry.plays <= 0) return "is-unplayed";
  if (entry.solves <= 0) return "is-played-unsolved";
  if (entry.bestAttempts !== null && entry.bestAttempts <= 2) return "is-solved-low";
  if (entry.bestAttempts !== null && entry.bestAttempts <= 4) return "is-solved-mid";
  return "is-solved-high";
}

function getArchiveCellStateLabel(book) {
  const entry = getBookStats(book);

  if (!entry || entry.plays <= 0) return "Unplayed";
  if (entry.solves <= 0) return "Played, unsolved";
  if (entry.bestAttempts !== null && entry.bestAttempts <= 2) return "Very efficient";
  if (entry.bestAttempts !== null && entry.bestAttempts <= 4) return "Efficient";
  return "Solved slowly";
}

function getArchiveCellAriaLabel(book) {
  const entry = getBookStats(book);
  const stateLabel = getArchiveCellStateLabel(book);

  if (!entry || entry.plays <= 0) {
    return `${book.name}, ${book.testament}, ${book.section}, not yet solved`;
  }

  if (entry.solves <= 0) {
    return `${book.name}, ${book.testament}, ${book.section}, played but not yet solved`;
  }

  const bestText =
    entry.bestAttempts === null ? "no best solve recorded" : `best ${entry.bestAttempts} guesses`;

  return `${book.name}, ${book.testament}, ${book.section}, ${stateLabel.toLowerCase()}, solved ${entry.solves} times, ${bestText}`;
}

function getPuzzleById(id) {
  return verses.find((verse) => verse.id === id) ?? null;
}

function getBookDistance(a, b) {
  const bookA = typeof a === "string" ? getBookByName(a) : a;
  const bookB = typeof b === "string" ? getBookByName(b) : b;

  if (!bookA || !bookB) return null;
  return Math.abs(bookA.order - bookB.order);
}

function isSameSection(a, b) {
  const bookA = typeof a === "string" ? getBookByName(a) : a;
  const bookB = typeof b === "string" ? getBookByName(b) : b;

  if (!bookA || !bookB) return false;
  return bookA.sectionKey === bookB.sectionKey;
}

function getProximityLabel(distance, sameTestament = true) {
  if (!sameTestament) return "wrong testament";
  if (distance === null) return "far";
  if (distance <= CONFIG.proximityBands.exact) return "exact";
  if (distance <= CONFIG.proximityBands.veryClose) return "very close";
  if (distance <= CONFIG.proximityBands.near) return "near";
  return "far";
}

function getProximityDescription(guess) {
  if (!guess) return "";

  if (guess.solved || guess.distance === 0) {
    return `${guess.book} is the correct book.`;
  }

  if (typeof guess.distance === "number" && guess.distance > 0) {
    return `${guess.book} is ${guess.distance} ${guess.distance === 1 ? "book" : "books"} away from the target.`;
  }

  if (guess.proximity === "wrong testament") {
    return `${guess.book} is in the wrong testament, so the target is on the other side of the Bible.`;
  }

  return "";
}

function getTodayPuzzleDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getDailyIndex() {
  const now = new Date();
  const epoch = Date.UTC(
    CONFIG.daily.epochYear,
    CONFIG.daily.epochMonth,
    CONFIG.daily.epochDay,
  );
  const current = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return (
    ((Math.floor((current - epoch) / 86400000) % verses.length) + verses.length)
    % verses.length
  );
}

function getNextUTCMidnight() {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
}

function formatTime(leftMs) {
  const safeMs = Math.max(0, Math.floor(leftMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${Math.max(seconds, 0)}s`;
}

function stopCountdownTimer() {
  if (state.countdownIntervalId) {
    clearInterval(state.countdownIntervalId);
    state.countdownIntervalId = null;
  }

  if (state.countdownTimeoutId) {
    clearTimeout(state.countdownTimeoutId);
    state.countdownTimeoutId = null;
  }
}

function scheduleDailyReset() {
  if (state.countdownTimeoutId) return;

  state.countdownTimeoutId = window.setTimeout(() => {
    state.countdownTimeoutId = null;
    resetPuzzle("daily");
  }, 1500);
}

function updateCountdownLabel() {
  const label = elements.countdownTimer?.parentElement;
  const target = elements.countdownTimer;
  if (!label || !target) return;

  if (state.mode !== "daily") {
    label.classList.add("hidden");
    label.classList.add("is-muted");
    target.textContent = "";
    return;
  }

  label.classList.remove("hidden");
  label.classList.remove("is-muted");

  const diff = getNextUTCMidnight().getTime() - Date.now();
  if (diff <= 1000) {
    target.textContent = "Next puzzle is ready";
    scheduleDailyReset();
    stopCountdownTimer();
    return;
  }

  target.textContent = `Next puzzle in ${formatTime(diff)}`;
}

function startCountdownTimer() {
  if (!elements.countdownTimer) return;

  stopCountdownTimer();
  updateCountdownLabel();

  if (state.mode !== "daily") return;

  state.countdownIntervalId = window.setInterval(() => {
    if (document.hidden) return;
    updateCountdownLabel();
  }, 1000);
}

function pickPuzzle(mode = "daily") {
  if (mode === "practice") {
    return verses[Math.floor(Math.random() * verses.length)];
  }

  return verses[getDeterministicDailyIndex()];
}

function buildCurrentPuzzle(mode = "daily") {
  const puzzle = pickPuzzle(mode);

  return {
    id: puzzle.id,
    date: mode === "daily" ? getTodayPuzzleDate() : null,
    mode,
    verse: puzzle,
  };
}

async function syncCurrentStateToCloudIfSignedIn() {
  if (!state.auth.enabled || !state.auth.user?.uid || !firebaseDb) return;

  try {
    await writeMergedDataToCloud(state.auth.user.uid, {
      preferences: getLocalPreferencesSnapshot(),
      stats: getLocalStatsSnapshot(),
    });
  } catch (error) {
    console.error("Background cloud sync failed:", error);
  }
}

async function fetchDailyGlobalStats(dateKey) {
  console.log("Fetching daily stats for", dateKey);
  const statsRef = getDailyStatsDocRef(dateKey);
  if (!statsRef) return null;

  const snapshot = await getDoc(statsRef);
  console.log("Daily stats exists:", snapshot.exists());
  return snapshot.exists() ? snapshot.data() : null;
}

async function fetchLeaderboardTopEntries(dateKey) {
  console.log("Fetching leaderboard top entries for", dateKey);
  const scoresRef = getDailyScoresCollectionRef(dateKey);
  if (!scoresRef) return [];

  const q = query(
    scoresRef,
    where("result", "==", "won"),
    orderBy("guesses", "asc"),
    orderBy("completedAt", "asc"),
    limit(10),
  );

  const snapshot = await getDocs(q);
  console.log("Top entries count:", snapshot.size);

  return snapshot.docs.map((docSnap, index) => ({
    id: docSnap.id,
    rank: index + 1,
    ...docSnap.data(),
  }));
}

async function fetchCurrentUserRank(dateKey, uid) {
  console.log("Fetching user rank for", dateKey, uid);
  if (!uid) return null;

  const entryRef = getLeaderboardEntryDocRef(dateKey, uid);
  if (!entryRef) return null;

  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) return null;

  const entry = entrySnap.data();

  if (entry.result !== "won") {
    return {
      rank: null,
      ...entry,
    };
  }

  const scoresRef = getDailyScoresCollectionRef(dateKey);
  if (!scoresRef) return { rank: null, ...entry };

  try {
    const q = query(
      scoresRef,
      where("result", "==", "won"),
      orderBy("guesses", "asc"),
      orderBy("completedAt", "asc"),
      limit(100),
    );

    const snapshot = await getDocs(q);

    const rankedDocs = snapshot.docs.map((docSnap, index) => ({
      id: docSnap.id,
      rank: index + 1,
      ...docSnap.data(),
    }));

    const match = rankedDocs.find((doc) => doc.uid === uid);

    if (match) {
      return {
        ...entry,
        rank: match.rank,
      };
    }
  } catch (error) {
    console.error("Rank derivation failed:", error);
  }

  return {
    rank: null,
    ...entry,
  };
}

function renderLeaderboardSummary(stats) {
  if (!elements.leaderboardSummary) return;

  if (!stats) {
    renderBusyInto(
      elements.leaderboardSummary,
      renderLoadingBlock({
        label: "Loading global stats",
        variant: "kpis",
        rows: 4,
      }),
      "Loading global stats",
    );
    return;
  }

  clearBusyState(elements.leaderboardSummary);

  const players =
    Number.isInteger(stats.players)
      ? stats.players
      : Number.isInteger(stats.totalPlayers)
        ? stats.totalPlayers
        : 0;

  const completed =
    Number.isInteger(stats.solvers)
      ? stats.solvers
      : Number.isInteger(stats.completed)
        ? stats.completed
        : 0;

  const avgWinningGuesses =
    typeof stats.averageWinningGuesses === "number"
      ? stats.averageWinningGuesses
      : typeof stats.avgGuesses === "number"
        ? stats.avgGuesses
        : null;

  const avgGuessesDisplay =
    avgWinningGuesses !== null && Number.isFinite(avgWinningGuesses)
      ? avgWinningGuesses.toFixed(1)
      : "—";

  const solveRate =
    players > 0 ? `${Math.round((completed / players) * 100)}%` : "0%";

  elements.leaderboardSummary.innerHTML = `
    <div class="leaderboard-kpis">
      <div class="leaderboard-kpi">
        <div class="leaderboard-kpi-value">${players}</div>
        <div class="leaderboard-kpi-label">Players</div>
      </div>
      <div class="leaderboard-kpi">
        <div class="leaderboard-kpi-value">${completed}</div>
        <div class="leaderboard-kpi-label">Completed</div>
      </div>
      <div class="leaderboard-kpi">
        <div class="leaderboard-kpi-value">${avgGuessesDisplay}</div>
        <div class="leaderboard-kpi-label">Average guesses</div>
      </div>
      <div class="leaderboard-kpi">
        <div class="leaderboard-kpi-value">${solveRate}</div>
        <div class="leaderboard-kpi-label">Solve rate</div>
      </div>
    </div>
  `;
}

async function ensureAnonymousAuthForDailySubmission() {
  if (!state.auth.enabled || !firebaseAuth) return null;

  if (state.auth.user?.uid) {
    return state.auth.user;
  }

  try {
    await signInAnonymously(firebaseAuth);
    return firebaseAuth.currentUser || null;
  } catch (error) {
    console.error("Anonymous auth failed:", error);
    return null;
  }
}

async function submitDailyResultToLeaderboard(outcome) {
  if (!state.auth.enabled || !firebaseDb || state.mode !== "daily") {
    return;
  }

  const user = await ensureAnonymousAuthForDailySubmission();
  if (!user?.uid) {
    renderStatus("Global submission is unavailable right now, but your local result was saved.");
    return;
  }

  const dateKey = getDailyDateKey();
  const uid = user.uid;
  const statsRef = getDailyStatsDocRef(dateKey);
  const entryRef = getLeaderboardEntryDocRef(dateKey, uid);

  if (!statsRef || !entryRef) return;

  const displayName = getPublicUserName(user);
  const puzzleId = getDailyPuzzleId();
  const isWin = outcome?.result === "won";
  const guesses = Number.isInteger(outcome?.guesses) ? outcome.guesses : null;

  try {
    await runTransaction(firebaseDb, async (transaction) => {
      const existingEntrySnap = await transaction.get(entryRef);

      if (existingEntrySnap.exists()) {
        return;
      }

      const statsSnap = await transaction.get(statsRef);

      const nextStats = statsSnap.exists()
        ? statsSnap.data()
        : {
          date: dateKey,
          puzzleId,
          players: 0,
          solvers: 0,
          totalWinningGuesses: 0,
          averageWinningGuesses: 0,
        };

      transaction.set(entryRef, {
        uid,
        displayName,
        result: isWin ? "won" : "lost",
        guesses: isWin ? guesses : null,
        completedAt: serverTimestamp(),
        puzzleId,
      });

      const players = (nextStats.players || 0) + 1;
      const solvers = (nextStats.solvers || 0) + (isWin ? 1 : 0);
      const totalWinningGuesses =
        (nextStats.totalWinningGuesses || 0) + (isWin && guesses ? guesses : 0);

      transaction.set(
        statsRef,
        {
          date: dateKey,
          puzzleId,
          players,
          solvers,
          totalWinningGuesses,
          averageWinningGuesses:
            solvers > 0 ? totalWinningGuesses / solvers : 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch (error) {
    console.error("Leaderboard submission failed:", error);
  }
}

function renderLeaderboardList(entries) {
  if (!elements.leaderboardList) return;

  if (!Array.isArray(entries)) {
    renderBusyInto(
      elements.leaderboardList,
      renderLoadingBlock({
        label: "Loading leaderboard",
        variant: "list",
        rows: 5,
      }),
      "Loading leaderboard",
    );
    return;
  }

  clearBusyState(elements.leaderboardList);

  if (!entries.length) {
    renderInto(
      elements.leaderboardList,
      renderEmptyState({
        title: "No leaderboard entries yet",
        body: "Be the first player to finish today’s Daily puzzle.",
        compact: false,
        showMarker: true,
        tone: "empty",
        actions: renderRetryButtonMarkup("Focus guess box", "focus-guess-input"),
      }),
    );
    bindEmptyStateActions(elements.leaderboardList);
    return;
  }

  const rows = entries
    .map((entry) => {
      const isCurrentUser =
        !!state.auth.user?.uid && (entry.uid === state.auth.user.uid || entry.userId === state.auth.user.uid);

      return `
        <div class="leaderboard-row ${isCurrentUser ? "is-current-user" : ""}">
          <div class="leaderboard-rank">#${entry.rank}</div>
          <div class="leaderboard-name">${escapeHtml(entry.displayName || "Anonymous")}</div>
          <div class="leaderboard-guesses">${entry.guesses ?? "—"} ${entry.guesses === 1 ? "guess" : "guesses"}</div>
          <div class="leaderboard-time">${formatLeaderboardTime(entry.completedAt)}</div>
        </div>
      `;
    })
    .join("");

  renderInto(
    elements.leaderboardList,
    `<div class="leaderboard-list-shell">${rows}</div>`,
  );
}

function getLeaderboardPlacement(rankEntry) {
  const rank =
    Number.isInteger(rankEntry?.rank) && rankEntry.rank > 0
      ? rankEntry.rank
      : Number.isInteger(rankEntry?.position) && rankEntry.position > 0
        ? rankEntry.position
        : Number.isInteger(rankEntry?.place) && rankEntry.place > 0
          ? rankEntry.place
          : null;

  const solved = rankEntry?.result === "won" || rankEntry?.result === "solved";

  return {
    rank,
    solved,
    placementLabel: rank ? `#${rank}` : solved ? "Solved" : "Unranked",
    placementMeta: rank
      ? `You are currently #${rank} on today’s leaderboard.`
      : solved
        ? "You solved today’s puzzle, but a numeric placement is not available yet."
        : "Your result is recorded, but a ranked position is not available yet.",
  };
}

function renderCurrentUserRank(rankEntry) {
  if (!elements.leaderboardUserRank) return;

  clearBusyState(elements.leaderboardUserRank);

  if (!state.auth.user) {
    elements.leaderboardUserRank.innerHTML = renderEmptyState({
      title: "Join the leaderboard",
      body: "Complete today’s Daily puzzle to record your placement.",
      compact: true,
      showMarker: true,
      tone: "empty",
    });
    bindEmptyStateActions(elements.leaderboardUserRank);
    return;
  }

  if (!rankEntry) {
    elements.leaderboardUserRank.innerHTML = renderEmptyState({
      title: "No Daily result yet",
      body: "Finish today’s Daily puzzle to see your placement here.",
      compact: true,
      showMarker: true,
      tone: "empty",
      actions: renderRetryButtonMarkup("Focus guess box", "focus-guess-input"),
    });
    bindEmptyStateActions(elements.leaderboardUserRank);
    return;
  }

  const hasRank = Number.isInteger(rankEntry.rank) && rankEntry.rank > 0;
  const isSolved = rankEntry.result === "won" || rankEntry.result === "solved";

  const placementLabel = hasRank
    ? `#${rankEntry.rank}`
    : isSolved
      ? "Solved"
      : "Unranked";

  const placementMeta = hasRank
    ? `You are currently #${rankEntry.rank} on today’s leaderboard.`
    : isSolved
      ? "Your result is recorded, but a numeric placement is not available yet."
      : "Your result is recorded, but a ranked position is not available yet.";

  elements.leaderboardUserRank.innerHTML = `
    <div class="leaderboard-user-rank-card">
      <div>
        <div class="label">Your place</div>
        <div class="value">${placementLabel}</div>
      </div>
      <div>
        <div class="label">Result</div>
        <div class="value">${isSolved ? "Solved" : "Played"}</div>
      </div>
      <div>
        <div class="label">Guesses</div>
        <div class="value">${rankEntry.guesses ?? "—"}</div>
      </div>
      <div>
        <div class="label">Time</div>
        <div class="value">${formatLeaderboardTime(rankEntry.completedAt)}</div>
      </div>
      <div class="leaderboard-user-rank-note">${placementMeta}</div>
    </div>
  `;
}

function renderPostGameLeaderboardRank(rankEntry) {
  if (!elements.postGameLeaderboardSection || !elements.postGameLeaderboardRank) return;

  const isDaily = state.mode === "daily";
  showWhen(elements.postGameLeaderboardSection, isDaily);

  if (!isDaily) {
    renderWhen(elements.postGameLeaderboardRank, false, "");
    return;
  }

  clearBusyState(elements.postGameLeaderboardRank);

  if (!state.auth.user) {
    renderInto(
      elements.postGameLeaderboardRank,
      renderEmptyState({
        title: "Sign in to track placement",
        body: "Your Daily result can appear here once you are signed in.",
        compact: true,
        showMarker: true,
        tone: "empty",
        actions: renderRetryButtonMarkup("Open leaderboard", "open-leaderboard"),
      }),
    );
    bindEmptyStateActions(elements.postGameLeaderboardRank);
    return;
  }

  if (!rankEntry) {
    renderBusyInto(
      elements.postGameLeaderboardRank,
      renderLoadingBlock({
        label: "Loading placement",
        variant: "rank",
        rows: 1,
      }),
      "Loading placement",
    );
    return;
  }

  const hasRank = Number.isInteger(rankEntry.rank) && rankEntry.rank > 0;
  const isSolved = rankEntry.result === "won" || rankEntry.result === "solved";

  const placementLabel = hasRank
    ? `#${rankEntry.rank}`
    : isSolved
      ? "Solved"
      : "Unranked";

  const placementMeta = hasRank
    ? `You are currently #${rankEntry.rank} on today’s leaderboard.`
    : isSolved
      ? "Your result is recorded, but a numeric placement is not available yet."
      : "Your result is recorded, but a ranked position is not available yet.";

  renderInto(
    elements.postGameLeaderboardRank,
    `
      <div class="leaderboard-user-rank-card">
        <div>
          <div class="label">Your place</div>
          <div class="value">${placementLabel}</div>
        </div>
        <div>
          <div class="label">Result</div>
          <div class="value">${isSolved ? "Solved" : "Played"}</div>
        </div>
        <div>
          <div class="label">Guesses</div>
          <div class="value">${rankEntry.guesses ?? "—"}</div>
        </div>
        <div>
          <div class="label">Time</div>
          <div class="value">${formatLeaderboardTime(rankEntry.completedAt)}</div>
        </div>
        <div class="leaderboard-user-rank-note">${placementMeta}</div>
      </div>
    `,
  );
}

async function loadPostGameLeaderboardRank() {
  if (state.mode !== "daily" || !isGameOver()) {
    renderPostGameLeaderboardRank(null);
    return;
  }

  if (!elements.postGameLeaderboardSection || !elements.postGameLeaderboardRank) return;

  showWhen(elements.postGameLeaderboardSection, true);
  renderBusyInto(
    elements.postGameLeaderboardRank,
    renderLoadingBlock({
      label: "Loading placement",
      variant: "rank",
      rows: 1,
    }),
    "Loading placement",
  );

  const user = state.auth.user || firebaseAuth?.currentUser || null;
  if (!user?.uid || !state.auth.enabled || !firebaseDb) {
    clearBusyState(elements.postGameLeaderboardRank);
    renderInto(
      elements.postGameLeaderboardRank,
      renderEmptyState({
        title: "Placement unavailable",
        body: "Complete a Daily puzzle while connected to global stats to see your placement.",
        compact: true,
        showMarker: true,
        tone: "error",
        actions: renderRetryButtonMarkup("Open leaderboard", "open-leaderboard"),
      }),
    );
    bindEmptyStateActions(elements.postGameLeaderboardRank);
    return;
  }

  try {
    const userRank = await fetchCurrentUserRank(getDailyDateKey(), user.uid);
    state.leaderboard.userRank = userRank;
    renderPostGameLeaderboardRank(userRank);
  } catch (error) {
    console.error("Post-game rank load failed:", error);
    clearBusyState(elements.postGameLeaderboardRank);
    renderInto(
      elements.postGameLeaderboardRank,
      renderEmptyState({
        title: "Could not load placement",
        body: "Your result was saved locally, but your current global placement is not available yet.",
        compact: true,
        showMarker: true,
        tone: "error",
        actions: renderRetryButtonMarkup("Try again", "retry-postgame-rank"),
      }),
    );
    bindEmptyStateActions(elements.postGameLeaderboardRank);
  }
}

function clearSavedProgress(mode = null) {
  try {
    if (!mode) {
      localStorage.removeItem(CONFIG.storageKeys.progress);
      return;
    }

    const buckets = readStoredProgressBuckets();
    const storageKey = getProgressStorageKey(mode);

    buckets[storageKey] = null;

    if (!buckets.daily && !buckets.practice) {
      localStorage.removeItem(CONFIG.storageKeys.progress);
      return;
    }

    writeStoredProgressBuckets(buckets);
  } catch { }
}

function buildProgressPayload() {
  if (!state.currentPuzzle) return null;

  return {
    mode: state.mode,
    currentPuzzle: {
      id: state.currentPuzzle.id,
      date: state.currentPuzzle.date,
      mode: state.currentPuzzle.mode,
    },
    guesses: state.guesses,
    status: state.status,
    inputDraft: elements.guessInput?.value ?? "",
  };
}

function canRestoreSavedPracticePuzzle(saved) {
  if (!saved || saved.currentPuzzle?.mode !== "practice") return false;
  if (!saved.currentPuzzle?.id) return false;
  return !!getPuzzleById(saved.currentPuzzle.id);
}

function restoreDraftInput(saved) {
  if (!elements.guessInput) return;
  elements.guessInput.value =
    typeof saved?.inputDraft === "string" ? saved.inputDraft : "";
}

function getProgressStorageKey(mode) {
  return mode === "practice" ? "practice" : "daily";
}

function isProgressBucketShape(value) {
  return !!value && typeof value === "object" && ("daily" in value || "practice" in value);
}

function readStoredProgressBuckets() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKeys.progress);
    if (!raw) {
      return {
        daily: null,
        practice: null,
      };
    }

    const parsed = JSON.parse(raw);

    if (isProgressBucketShape(parsed)) {
      return {
        daily: parsed.daily ?? null,
        practice: parsed.practice ?? null,
      };
    }

    return {
      daily: parsed ?? null,
      practice: null,
    };
  } catch {
    return {
      daily: null,
      practice: null,
    };
  }
}

function writeStoredProgressBuckets(buckets) {
  try {
    localStorage.setItem(
      CONFIG.storageKeys.progress,
      JSON.stringify({
        daily: buckets?.daily ?? null,
        practice: buckets?.practice ?? null,
      }),
    );
  } catch { }
}

function restoreProgressPayload(saved) {
  if (!saved || !saved.currentPuzzle?.id) {
    return false;
  }

  const savedPuzzle = getPuzzleById(saved.currentPuzzle.id);
  if (!savedPuzzle) {
    return false;
  }

  const savedStatus = ["playing", "won", "lost"].includes(saved.status)
    ? saved.status
    : "playing";

  if (saved.currentPuzzle.mode === "daily") {
    const todayPuzzle = pickPuzzle("daily");
    const todayDate = getTodayPuzzleDate();
    const isMatchingDailyPuzzle =
      saved.currentPuzzle.date === todayDate &&
      saved.currentPuzzle.id === todayPuzzle.id;

    if (!isMatchingDailyPuzzle) {
      return false;
    }

    state.mode = "daily";
    applyModeTheme("daily");
    state.currentPuzzle = {
      id: savedPuzzle.id,
      date: saved.currentPuzzle.date,
      mode: "daily",
      verse: savedPuzzle,
    };
  } else if (canRestoreSavedPracticePuzzle(saved)) {
    state.mode = "practice";
    applyModeTheme("practice");
    state.currentPuzzle = {
      id: savedPuzzle.id,
      date: null,
      mode: "practice",
      verse: savedPuzzle,
    };
  } else {
    return false;
  }

  state.guesses = Array.isArray(saved.guesses) ? saved.guesses : [];
  state.status = savedStatus;
  restoreDraftInput(saved);
  resetSuggestionsState();
  closeSuggestions();

  return true;
}

function saveProgress() {
  const payload = buildProgressPayload();
  if (!payload) return;

  const buckets = readStoredProgressBuckets();
  const storageKey = getProgressStorageKey(payload.currentPuzzle?.mode || state.mode);

  buckets[storageKey] = payload;
  writeStoredProgressBuckets(buckets);
}

function loadProgress(mode = state.mode) {
  try {
    const buckets = readStoredProgressBuckets();
    const preferredKey = getProgressStorageKey(mode);
    const preferredSaved = buckets[preferredKey];

    if (restoreProgressPayload(preferredSaved)) {
      return true;
    }

    if (preferredKey === "daily" && buckets.daily) {
      const nextBuckets = {
        ...buckets,
        daily: null,
      };
      writeStoredProgressBuckets(nextBuckets);
      return false;
    }

    if (preferredKey === "practice" && buckets.practice) {
      const nextBuckets = {
        ...buckets,
        practice: null,
      };
      writeStoredProgressBuckets(nextBuckets);
      return false;
    }

    return false;
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
    language: getCurrentLanguage(),
    sound: state.preferences.sound,
    reducedAnimation: state.preferences.reducedAnimation,
    highContrast: state.preferences.highContrast,
    largeText: state.preferences.largeText,
  };

  try {
    localStorage.setItem(
      CONFIG.storageKeys.preferences,
      JSON.stringify(payload),
    );
  } catch { }

  syncCurrentStateToCloudIfSignedIn();
}

function loadPreferences() {
  const defaults = {
    theme: getSystemTheme(),
    difficulty: "normal",
    preferredMode: "daily",
    language: "en",
    sound: false,
    reducedAnimation: false,
    highContrast: false,
    largeText: false,
  };

  try {
    const raw = localStorage.getItem(CONFIG.storageKeys.preferences);

    if (!raw) {
      state.preferences = defaults;
      state.mode = defaults.preferredMode;
      return;
    }

    const saved = JSON.parse(raw);

    state.preferences = {
      theme:
        saved?.theme === "light" || saved?.theme === "dark"
          ? saved.theme
          : defaults.theme,
      difficulty:
        saved?.difficulty && CONFIG.modes[saved.difficulty]
          ? saved.difficulty
          : defaults.difficulty,
      preferredMode:
        saved?.preferredMode === "practice"
          ? "practice"
          : defaults.preferredMode,
      language: saved?.language === "ml" ? "ml" : defaults.language,
      sound: typeof saved?.sound === "boolean" ? saved.sound : defaults.sound,
      reducedAnimation:
        typeof saved?.reducedAnimation === "boolean"
          ? saved.reducedAnimation
          : defaults.reducedAnimation,
      highContrast:
        typeof saved?.highContrast === "boolean"
          ? saved.highContrast
          : defaults.highContrast,
      largeText:
        typeof saved?.largeText === "boolean"
          ? saved.largeText
          : defaults.largeText,
    };
  } catch {
    state.preferences = defaults;
  }

  state.mode = state.preferences.preferredMode;
}

function saveStats() {
  const payload = getSerializedStatsForSave();
  state.stats = payload;

  try {
    localStorage.setItem(CONFIG.storageKeys.stats, JSON.stringify(payload));
  } catch { }

  syncCurrentStateToCloudIfSignedIn();
}

function loadStats() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKeys.stats);

    if (!raw) {
      state.stats = createDefaultStatsState();
      return;
    }

    const saved = JSON.parse(raw);
    state.stats = migrateStatsShape(saved);
  } catch {
    state.stats = createDefaultStatsState();
  }
}

function hasRecordedDailyResult(date) {
  return state.stats.daily.lastDailySolvedDate === date;
}

function getEarnedBadgeIds() {
  return Array.isArray(state.stats?.daily?.earnedBadges)
    ? state.stats.daily.earnedBadges
    : [];
}

function computeNewlyEarnedBadges() {
  const earnedBadgeIds = new Set(getEarnedBadgeIds());
  const currentStreak =
    Number.isInteger(state.stats?.daily?.currentStreak) &&
      state.stats.daily.currentStreak >= 0
      ? state.stats.daily.currentStreak
      : 0;

  return STREAK_BADGES.filter(
    (badge) => currentStreak >= badge.threshold && !earnedBadgeIds.has(badge.id),
  );
}

function awardStreakBadges() {
  const existing = [...getEarnedBadgeIds()];
  const existingSet = new Set(existing);
  const newlyEarned = computeNewlyEarnedBadges();

  if (!newlyEarned.length) return [];

  newlyEarned.forEach((badge) => {
    if (!existingSet.has(badge.id)) {
      existing.push(badge.id);
      existingSet.add(badge.id);
    }
  });

  state.stats.daily.earnedBadges = existing;
  return newlyEarned;
}

function updateBookStats(outcome) {
  if (!state.currentPuzzle || state.currentPuzzle.mode !== "daily") return;

  const book = getBookByName(state.currentPuzzle.verse.book);
  if (!book) return;

  const entry = ensureBookStatsEntry(book);
  if (!entry) return;

  entry.plays += 1;

  if (outcome === "won") {
    const attempts = state.guesses.length;
    entry.solves += 1;
    entry.totalAttempts += attempts;
    entry.bestAttempts =
      entry.bestAttempts === null ? attempts : Math.min(entry.bestAttempts, attempts);
    entry.lastSolvedDate = state.currentPuzzle.date ?? getTodayPuzzleDate();
  }
}

async function recordPuzzleCompletion(outcome) {
  if (!state.currentPuzzle) return;

  state.stats = migrateStatsShape(state.stats);

  if (state.currentPuzzle.mode === "daily") {
    const completionDate = state.currentPuzzle.date;
    if (completionDate && hasRecordedDailyResult(completionDate)) return;

    state.stats.daily.played += 1;

    if (outcome === "won") {
      state.stats.daily.won += 1;

      const guessCount = state.guesses.length;
      state.stats.daily.guessDistribution[guessCount] =
        (state.stats.daily.guessDistribution[guessCount] ?? 0) + 1;

      if (completionDate) {
        const previousDate = getPreviousDate(completionDate);

        state.stats.daily.currentStreak =
          state.stats.daily.lastDailySolvedDate === previousDate
            ? state.stats.daily.currentStreak + 1
            : 1;

        state.stats.daily.bestStreak = Math.max(
          state.stats.daily.bestStreak,
          state.stats.daily.currentStreak,
        );

        state.stats.daily.lastDailySolvedDate = completionDate;
      }

      awardStreakBadges();
    } else if (outcome === "lost") {
      state.stats.daily.lost += 1;

      if (completionDate) {
        state.stats.daily.currentStreak = 0;
        state.stats.daily.lastDailySolvedDate = completionDate;
      }
    }

    updateAchievementCountersForCompletion(outcome);
    updateBookStats(outcome);
    saveStats();

    await submitDailyResultToLeaderboard({
      result: outcome,
      guesses: outcome === "won" ? state.guesses.length : null,
      dateKey: completionDate || getDailyDateKey(),
      puzzleId: getDailyPuzzleId(),
    });

    return;
  }

  if (state.currentPuzzle.mode === "practice") {
    state.stats.practice.played += 1;

    if (outcome === "won") {
      state.stats.practice.won += 1;

      const guessCount = state.guesses.length;
      state.stats.practice.guessDistribution[guessCount] =
        (state.stats.practice.guessDistribution[guessCount] ?? 0) + 1;
    } else if (outcome === "lost") {
      state.stats.practice.lost += 1;
    }

    updateAchievementCountersForCompletion(outcome);
    saveStats();
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  state.preferences.theme = theme;
}

function applyModeTheme(mode = state.mode) {
  const normalizedMode = mode === "practice" ? "practice" : "daily";
  document.documentElement.setAttribute("data-mode", normalizedMode);
}

function renderThemeToggle() {
  const toggle = elements.themeToggle;
  if (!toggle) return;

  toggle.innerHTML =
    state.preferences.theme === "dark"
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

  toggle.setAttribute(
    "aria-label",
    `Switch to ${state.preferences.theme === "dark" ? "light" : "dark"} mode`,
  );
}

function initTheme() {
  applyTheme(state.preferences.theme);
  applyModeTheme(state.mode);
  renderThemeToggle();
}

function setAuthStatus(message) {
  if (elements.authStatus) {
    elements.authStatus.textContent = message;
  }
}

function renderAuthUI() {
  const { enabled, ready, user, syncing } = state.auth;

  if (!elements.signInBtn || !elements.signOutBtn || !elements.authStatus) return;

  if (!enabled) {
    elements.signInBtn.hidden = false;
    elements.signInBtn.disabled = true;
    elements.signOutBtn.hidden = true;
    setAuthStatus(ready ? "Sign-in unavailable" : "Playing anonymously");
    return;
  }

  if (!ready) {
    elements.signInBtn.hidden = false;
    elements.signInBtn.disabled = true;
    elements.signOutBtn.hidden = true;
    setAuthStatus("Checking sign-in…");
    return;
  }

  if (syncing) {
    elements.signInBtn.hidden = !!user && !user.isAnonymous;
    elements.signInBtn.disabled = true;
    elements.signOutBtn.hidden = !user || user.isAnonymous;
    elements.signOutBtn.disabled = true;
    setAuthStatus("Syncing…");
    return;
  }

  if (user?.isAnonymous) {
    elements.signInBtn.hidden = false;
    elements.signInBtn.disabled = false;
    elements.signInBtn.textContent = "Sign in";
    elements.signOutBtn.hidden = true;
    setAuthStatus(`Playing anonymously as ${getPublicUserName(user)}`);
    return;
  }

  if (user) {
    elements.signInBtn.hidden = true;
    elements.signOutBtn.hidden = false;
    elements.signOutBtn.disabled = false;
    setAuthStatus(`Signed in as ${getPublicUserName(user)}`);
    return;
  }

  elements.signInBtn.hidden = false;
  elements.signInBtn.disabled = false;
  elements.signInBtn.textContent = "Sign in";
  elements.signOutBtn.hidden = true;
  setAuthStatus("Playing anonymously");
}

function formatDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getMaxGuesses() {
  return (
    CONFIG.modes[state.preferences.difficulty]?.maxGuesses
    ?? CONFIG.modes.normal.maxGuesses
  );
}

function getCurrentModeConfig() {
  return CONFIG.modes[state.preferences.difficulty] ?? CONFIG.modes.normal;
}

function getHintSchedule() {
  return getCurrentModeConfig().hintSchedule ?? {
    testamentAt: 1,
    sectionAt: 3,
    firstLetterAt: 7,
    referenceAt: 4,
    distanceAt: 3,
    distanceRequiresBookPartial: false,
  };
}

function getReferenceWithoutBookName(verse, language = getCurrentLanguage()) {
  const localizedReference = getLocalizedReference(verse, language);
  const targetBook = getBookByName(verse?.book);

  if (!localizedReference || !targetBook) {
    return localizedReference || "";
  }

  const localizedBookName = getLocalizedBookName(targetBook, language);
  if (!localizedBookName) {
    return localizedReference;
  }

  const escapedBookName = localizedBookName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutBook = localizedReference.replace(new RegExp(`^${escapedBookName}\\s*`, "i"), "").trim();

  return withoutBook || localizedReference;
}

function getNearestGuessDistance() {
  if (!Array.isArray(state.guesses) || !state.guesses.length) {
    return null;
  }

  const distances = state.guesses
    .map((guess) => (typeof guess?.distance === "number" ? guess.distance : null))
    .filter((distance) => distance !== null);

  if (!distances.length) {
    return null;
  }

  return Math.min(...distances);
}

function hasBookPartialGuess() {
  return state.guesses.some((guess) => guess?.bookResult?.state === "partial");
}

function hasCorrectSectionGuess() {
  return state.guesses.some((guess) => guess?.section?.state === "correct");
}

function hasCorrectFirstLetterGuess() {
  return state.guesses.some((guess) => guess?.firstLetter?.state === "correct");
}

function buildClueRevealState() {
  const target = getBookByName(state.currentPuzzle?.verse.book);
  if (!target || !state.currentPuzzle?.verse) {
    return {
      items: [],
      newlyUnlockedKeys: [],
    };
  }

  const language = getCurrentLanguage();
  const guessCount = state.guesses.length;
  const schedule = getHintSchedule();
  const clueUiState = ensureClueUiState();

  const nearestDistance = getNearestGuessDistance();
  const distanceEligibleBySchedule =
    Number.isInteger(schedule.distanceAt) && guessCount >= schedule.distanceAt;
  const distanceEligibleByRule =
    schedule.distanceRequiresBookPartial === true
      ? hasBookPartialGuess()
      : distanceEligibleBySchedule;

  const items = [
    {
      key: "testament",
      label: language === "ml" ? "നിയമം" : "Testament",
      unlocked:
        Number.isInteger(schedule.testamentAt) && guessCount >= schedule.testamentAt,
      value: `It is in the ${getLocalizedTestament(target, language)}`,
      lockedText:
        Number.isInteger(schedule.testamentAt)
          ? `Unlocks after guess ${schedule.testamentAt}.`
          : "Not available in this mode.",
      reason: guessCount >= schedule.testamentAt ? "scheduled" : "locked",
    },
    {
      key: "section",
      label: language === "ml" ? "വിഭാഗം" : "Section",
      unlocked:
        (Number.isInteger(schedule.sectionAt) && guessCount >= schedule.sectionAt) ||
        hasCorrectSectionGuess(),
      value: `It is in the ${getLocalizedSection(target, language)} section`,
      lockedText:
        Number.isInteger(schedule.sectionAt)
          ? `Unlocks after guess ${schedule.sectionAt}, or earlier if you identify the section.`
          : "Not available in this mode.",
      reason: hasCorrectSectionGuess() ? "inferred" : guessCount >= schedule.sectionAt ? "scheduled" : "locked",
    },
    {
      key: "distance",
      label: language === "ml" ? "ദൂരം" : "Nearest distance",
      unlocked: distanceEligibleByRule && typeof nearestDistance === "number",
      value: `Nearest guess: ${nearestDistance} ${nearestDistance === 1 ? "book" : "books"} away`,
      lockedText:
        schedule.distanceRequiresBookPartial
          ? "Unlocks after you earn a gold Book tile."
          : Number.isInteger(schedule.distanceAt)
            ? `Unlocks after guess ${schedule.distanceAt}.`
            : "Not available in this mode.",
      reason: schedule.distanceRequiresBookPartial
        ? hasBookPartialGuess()
          ? "inferred"
          : "locked"
        : guessCount >= schedule.distanceAt
          ? "scheduled"
          : "locked",
    },
    {
      key: "reference",
      label: language === "ml" ? "റഫറൻസ്" : "Reference",
      unlocked:
        Number.isInteger(schedule.referenceAt) && guessCount >= schedule.referenceAt,
      value: `Reference: ${getReferenceWithoutBookName(state.currentPuzzle.verse, language)}`,
      lockedText:
        Number.isInteger(schedule.referenceAt)
          ? `Unlocks after guess ${schedule.referenceAt}.`
          : "Not available in this mode.",
      reason: guessCount >= schedule.referenceAt ? "scheduled" : "locked",
    },
    {
      key: "firstLetter",
      label: language === "ml" ? "ആദ്യക്ഷരം" : "First letter",
      unlocked:
        (Number.isInteger(schedule.firstLetterAt) && guessCount >= schedule.firstLetterAt) ||
        hasCorrectFirstLetterGuess(),
      value: `Its first letter is ${getLocalizedFirstLetter(target, language)}.`,
      lockedText:
        Number.isInteger(schedule.firstLetterAt)
          ? `Unlocks after guess ${schedule.firstLetterAt}, or earlier if you identify the first letter.`
          : "Not available in this mode.",
      reason: hasCorrectFirstLetterGuess()
        ? "inferred"
        : guessCount >= schedule.firstLetterAt
          ? "scheduled"
          : "locked",
    },
  ];

  const unlockedKeys = items.filter((item) => item.unlocked).map((item) => item.key);
  const newlyUnlockedKeys = unlockedKeys.filter(
    (key) => !clueUiState.lastUnlockedKeys.includes(key),
  );

  clueUiState.lastUnlockedKeys = unlockedKeys;

  return {
    items,
    newlyUnlockedKeys,
  };
}

function isGameOver() {
  return state.status === "won" || state.status === "lost";
}

function hasCompletedTodaysDaily() {
  return state.stats.daily.lastDailySolvedDate === getTodayPuzzleDate();
}

function isCurrentDailyPuzzle() {
  return state.currentPuzzle?.mode === "daily";
}

function isCurrentPracticePuzzle() {
  return state.currentPuzzle?.mode === "practice";
}

function canChangeDifficulty() {
  return state.guesses.length === 0 && state.status === "playing";
}

function getHintLines() {
  const clueState = buildClueRevealState();
  const schedule = getHintSchedule();

  return clueState.items.map((item) => {
    let unlockAt = null;
    let lockVariant = "standard";

    if (item.key === "testament") {
      unlockAt = schedule.testamentAt;
    } else if (item.key === "section") {
      unlockAt = schedule.sectionAt;
    } else if (item.key === "distance") {
      unlockAt = schedule.distanceAt;
      if (schedule.distanceRequiresBookPartial) {
        lockVariant = "gold-star";
      }
    } else if (item.key === "reference") {
      unlockAt = schedule.referenceAt;
    } else if (item.key === "firstLetter") {
      unlockAt = schedule.firstLetterAt;
    }

    return {
      key: item.key,
      unlocked: item.unlocked,
      value: item.unlocked ? item.value : item.lockedText,
      isNew: clueState.newlyUnlockedKeys.includes(item.key),
      unlockAt,
      lockVariant,
    };
  });
}

function isAdjacentSection(guess, target) {
  if (!guess || !target) return false;
  if (guess.testament !== target.testament) return false;

  const sectionOrderByTestament = {
    "Old Testament": ["pentateuch", "historical-books", "wisdom-books", "major-prophets", "minor-prophets"],
    "New Testament": ["gospels", "historical-books", "pauline-letters", "general-epistles", "revelation"],
  };

  const order = sectionOrderByTestament[target.testament];
  if (!order) return false;

  const guessIndex = order.indexOf(guess.sectionKey);
  const targetIndex = order.indexOf(target.sectionKey);

  if (guessIndex < 0 || targetIndex < 0) return false;

  return Math.abs(guessIndex - targetIndex) === 1;
}

function compareGuess(guessInput) {
  const language = getCurrentLanguage();
  const target = getBookByName(state.currentPuzzle?.verse.book);
  const guess = typeof guessInput === "object" ? guessInput : getBookByName(guessInput);

  if (!target || !guess) return null;

  const distance = getBookDistance(target, guess);
  const sameTestament = guess.testament === target.testament;
  const proximity = getProximityLabel(distance, sameTestament);

  const guessFirstLetter = getLocalizedFirstLetter(guess, language);
  const targetFirstLetter = getLocalizedFirstLetter(target, language);

  return {
    bookId: guess.id,
    book: getLocalizedBookName(guess, language),
    distance,
    proximity,
    testament: {
      value: getLocalizedTestament(guess, language),
      state: sameTestament ? "correct" : "wrong",
    },
    section: {
      value: getLocalizedSection(guess, language),
      state: isSameSection(guess, target)
        ? "correct"
        : isAdjacentSection(guess, target)
          ? "partial"
          : "wrong",
    },
    firstLetter: {
      value: guessFirstLetter,
      state: guessFirstLetter === targetFirstLetter ? "correct" : "wrong",
    },
    bookResult: {
      value: getLocalizedBookName(guess, language),
      state:
        proximity === "exact"
          ? "correct"
          : proximity === "very close" || proximity === "near"
            ? "partial"
            : "wrong",
    },
    solved: guess.id === target.id,
  };
}

function getAttemptLabel() {
  if (state.status === "won") return "You solved it";
  if (state.status === "lost") return "Out of guesses";
  if (state.guesses.length === 0) return "Start guessing";
  return "Guess again";
}

function syncPreferenceControls() {
  const allowDifficultyChange = canChangeDifficulty();

  if (elements.difficultySelect) {
    elements.difficultySelect.value = state.preferences.difficulty;
    elements.difficultySelect.disabled = !allowDifficultyChange;
    elements.difficultySelect.setAttribute(
      "aria-disabled",
      String(!allowDifficultyChange),
    );
    elements.difficultySelect.title = allowDifficultyChange
      ? "Choose difficulty before your first guess."
      : "Difficulty can only be changed before starting a puzzle.";
  }

  if (elements.modeSelect) {
    elements.modeSelect.value = state.mode;
    elements.modeSelect.disabled = false;
    elements.modeSelect.setAttribute("aria-disabled", "false");
    elements.modeSelect.title = "Switch between Daily and Practice mode.";
  }

  if (elements.languageSelect) {
    elements.languageSelect.value = getCurrentLanguage();
    elements.languageSelect.disabled = false;
    elements.languageSelect.setAttribute("aria-disabled", "false");
    elements.languageSelect.title = "Choose how book and verse content is displayed.";
  }
}

function syncActionButtons() {
  const gameOver = isGameOver();
  const inDailyMode = state.mode === "daily";
  const inPracticeMode = state.mode === "practice";
  const completedTodaysDaily = hasCompletedTodaysDaily();
  const completedCurrentDaily = inDailyMode && gameOver;
  const completedCurrentPractice = inPracticeMode && gameOver;

  showWhen(elements.statsBtn, true);
  showWhen(elements.helpBtn, true);

  showWhen(elements.archiveBtn, inDailyMode);
  showWhen(elements.leaderboardBtn, completedCurrentDaily);

  showWhen(elements.shareBtn, gameOver);

  showWhen(
    elements.tryPracticeBtn,
    completedCurrentDaily,
  );

  showWhen(
    elements.nextPracticeBtn,
    completedCurrentPractice,
  );

  showWhen(
    elements.todayBibdleBtn,
    inPracticeMode && !completedTodaysDaily,
  );
}

function renderPuzzleCard() {
  const language = getCurrentLanguage();
  elements.verseText.textContent = getLocalizedVerseText(state.currentPuzzle?.verse, language);
  elements.dateLabel.textContent =
    state.mode === "daily"
      ? `Daily puzzle · ${formatDate()}`
      : "Practice puzzle";

  if (state.mode === "daily") {
    startCountdownTimer();
    return;
  }

  stopCountdownTimer();

  if (elements.countdownTimer?.parentElement) {
    elements.countdownTimer.parentElement.classList.add("hidden");
    elements.countdownTimer.parentElement.classList.add("is-muted");
  }
}

function renderHintBlock() {
  const lines = getHintLines();

  elements.hintBlock.innerHTML = lines
    .map((item) => {
      if (item.unlocked) {
        return `
          <div class="clue-feed__item is-unlocked ${item.isNew ? "is-new" : ""}" data-clue-key="${item.key}">
            <p class="meta-line is-book-data">${item.value}</p>
          </div>
        `;
      }

      const icon = item.lockVariant === "gold-star"
        ? `
          <span class="clue-feed__lock-icon clue-feed__lock-icon--gold-star" aria-hidden="true">
            <span class="clue-feed__lock-glyph">🔒</span>
            <span class="clue-feed__star-glyph">★</span>
          </span>
        `
        : `
          <span class="clue-feed__lock-icon" aria-hidden="true">🔒</span>
        `;

      const numberLabel = Number.isInteger(item.unlockAt)
        ? `<span class="clue-feed__lock-count">${item.unlockAt}</span>`
        : `<span class="clue-feed__lock-count">★</span>`;

      return `
        <div class="clue-feed__lock-chip" data-clue-key="${item.key}" aria-label="Clue locked">
          ${icon}
          ${numberLabel}
        </div>
      `;
    })
    .join("");

  elements.attemptLabel.textContent = getAttemptLabel();
}

function renderEmptyGuessRows() {
  elements.guessRows.innerHTML = `
    <div class="guess-grid">
      <div class="empty-state">No guesses yet</div>
      <div class="empty-state">Use each row to narrow the book</div>
      <div class="empty-state">Clues unlock as you progress</div>
      <div class="empty-state">Guess the book in the least guesses</div>

    </div>
  `;
}

function renderGuessRow(guess, rowIndex, animate = false) {
  const baseDelay = animate ? rowIndex * 200 : 0;
  const language = getCurrentLanguage();
  const book = getBookById(guess?.bookId);

  const bookLabel = getLocalizedBookName(book, language) || guess?.book || "";
  const testamentLabel = getLocalizedTestament(book, language) || guess?.testament?.value || "";
  const sectionLabel = getLocalizedSection(book, language) || guess?.section?.value || "";
  const firstLetterLabel = getLocalizedFirstLetter(book, language) || guess?.firstLetter?.value || "";

  return `
    <div class="guess-grid" aria-label="Guess ${bookLabel}">
      <div class="guess-card is-book-data ${guess.testament.state}${animate ? " reveal-animate" : ""}" style="--reveal-delay: ${baseDelay}ms">${testamentLabel}</div>
      <div class="guess-card is-book-data ${guess.section.state}${animate ? " reveal-animate" : ""}" style="--reveal-delay: ${baseDelay + 180}ms">${sectionLabel}</div>
      <div class="guess-card ${guess.firstLetter.state}${animate ? " reveal-animate" : ""}" style="--reveal-delay: ${baseDelay + 360}ms">${firstLetterLabel}</div>
      <div class="guess-card is-book-data ${guess.bookResult.state}${animate ? " reveal-animate" : ""}" style="--reveal-delay: ${baseDelay + 540}ms">${bookLabel}</div>
    </div>
  `;
}

function renderGuessRows(animateLatest = false) {
  if (!state.guesses.length) {
    renderEmptyGuessRows();
    return;
  }

  const guessesToRender = [...state.guesses].reverse();
  const latestGuess = state.guesses[state.guesses.length - 1];

  elements.guessRows.innerHTML = guessesToRender
    .map((guess, index) => {
      const originalIndex = state.guesses.length - 1 - index;
      const shouldAnimate = animateLatest && guess === latestGuess;
      return renderGuessRow(guess, originalIndex, shouldAnimate);
    })
    .join("");
}

function renderProximityLine() {
  if (!elements.proximityLine) return;

  const lastGuess = state.guesses[state.guesses.length - 1];
  elements.proximityLine.textContent = getProximityDescription(lastGuess);
}

function renderStatus(message = "Guess the book from the verse above.") {
  elements.statusLine.textContent = message;
}

function renderEmptyState({
  title = "",
  body = "",
  actions = "",
  compact = false,
  inline = false,
  showMarker = true,
  tone = "empty",
} = {}) {
  const classes = [
    "empty-state",
    compact ? "empty-state--compact" : "empty-state--standard",
    inline ? "empty-state--inline" : "",
    tone ? `empty-state--${tone}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const normalizedActions =
    Array.isArray(actions) ? actions.filter(Boolean).join("") : actions;

  return `
    <div class="${classes}" ${tone === "error" ? 'role="alert"' : ""}>
      ${showMarker ? '<div class="empty-state__marker" aria-hidden="true"></div>' : ""}
      <div class="empty-state__content">
        ${title ? `<p class="empty-state__title">${title}</p>` : ""}
        ${body ? `<p class="empty-state__body">${body}</p>` : ""}
      </div>
      ${normalizedActions ? `<div class="empty-state__actions">${normalizedActions}</div>` : ""}
    </div>
  `;
}

function renderRetryButtonMarkup(label = "Try again", action = "") {
  if (!action) return "";
  return `<button type="button" class="pill-btn" data-empty-action="${action}">${label}</button>`;
}

function bindEmptyStateActions(container = document) {
  container.querySelectorAll("[data-empty-action]").forEach((button) => {
    if (button.dataset.emptyActionBound === "true") return;
    button.dataset.emptyActionBound = "true";

    button.addEventListener("click", () => {
      const action = button.dataset.emptyAction;

      if (action === "retry-leaderboard") {
        openLeaderboardModal();
        return;
      }

      if (action === "retry-postgame-rank") {
        loadPostGameLeaderboardRank();
        return;
      }

      if (action === "focus-guess-input") {
        elements.guessInput?.focus();
        return;
      }

      if (action === "open-leaderboard") {
        openLeaderboardModal();
      }
    });
  });
}

function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = !!hidden;
}

function setModalOpenState(modalBackdrop, isOpen, options = {}) {
  if (modalService) {
    if (isOpen) {
      modalService.open(modalBackdrop, options);
      return;
    }

    modalService.close(modalBackdrop, options);
    return;
  }

  if (!modalBackdrop) return;

  ensureUiState();

  const {
    trigger = document.activeElement,
    restoreFocus = true,
  } = options;

  modalBackdrop.dataset.open = isOpen ? "true" : "false";
  modalBackdrop.setAttribute("aria-hidden", isOpen ? "false" : "true");

  if (isOpen) {
    rememberModalTrigger(modalBackdrop, trigger);
    pushOpenModal(modalBackdrop);
    syncModalEnvironment();
    focusModalEntry(modalBackdrop);
    return;
  }

  popOpenModal(modalBackdrop);
  syncModalEnvironment();

  if (restoreFocus) {
    restoreModalFocus(modalBackdrop);
  } else {
    clearRememberedModalTrigger(modalBackdrop);
  }
}

function closeModal(modalBackdrop, options = {}) {
  if (modalService) {
    modalService.close(modalBackdrop, options);
    return;
  }

  setModalOpenState(modalBackdrop, false, options);
}

function renderLoadingBlock({
  label = "Loading",
  variant = "list",
  rows = 3,
} = {}) {
  const items = Array.from({ length: rows }, () => {
    if (variant === "kpis") {
      return `
        <div class="loading-card" aria-hidden="true">
          <div class="loading-card__lines">
            <div class="loading-line loading-line--short"></div>
            <div class="loading-line loading-line--mid"></div>
          </div>
        </div>
      `;
    }

    if (variant === "rank") {
      return `
        <div class="loading-card" aria-hidden="true">
          <div class="loading-card__lines">
            <div class="loading-line loading-line--rank"></div>
            <div class="loading-line loading-line--name"></div>
            <div class="loading-line loading-line--meta"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="loading-row" aria-hidden="true">
        <div class="loading-row__lines">
          <div class="loading-line loading-line--rank"></div>
          <div class="loading-line loading-line--name"></div>
        </div>
      </div>
    `;
  }).join("");

  const gridClass =
    variant === "kpis" ? "loading-block__grid loading-block__grid--kpis" : "loading-block__grid loading-block__grid--list";

  return `
    <div class="loading-block" role="status" aria-live="polite" aria-label="${escapeHtml(label)}">
      <div class="loading-block__status">${escapeHtml(label)}</div>
      <div class="${gridClass}">
        ${items}
      </div>
    </div>
  `;
}

function renderBusyInto(container, markup, label = "Loading") {
  if (!container) return;
  container.setAttribute("aria-busy", "true");
  container.setAttribute("data-loading-label", label);
  container.innerHTML = markup;
}

function clearBusyState(container) {
  if (!container) return;
  container.setAttribute("aria-busy", "false");
  container.removeAttribute("data-loading-label");
}

function setContentVisibility(element, shouldShow, renderWhenHidden = false) {
  if (!element) return;
  setHidden(element, !shouldShow);
  if (!shouldShow && !renderWhenHidden) {
    element.innerHTML = "";
  }
}

function renderInto(container, markup, options = {}) {
  if (!container) return;
  const { visible = true, preserveWhenHidden = false } = options;
  setContentVisibility(container, visible, preserveWhenHidden);
  if (!visible && !preserveWhenHidden) return;
  container.innerHTML = markup;
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasTextContent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasRenderableMarkup(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setVisibility(element, visible) {
  setHidden(element, !visible);
}

function showWhen(element, condition) {
  setVisibility(element, !!condition);
  return !!condition;
}

function showWhenHasItems(element, items) {
  return showWhen(element, isNonEmptyArray(items));
}

function showWhenHasText(element, text) {
  return showWhen(element, hasTextContent(text));
}

function renderWhen(container, condition, markup = "", options = {}) {
  renderInto(container, markup, {
    visible: !!condition,
    preserveWhenHidden: !!options.preserveWhenHidden,
  });
  return !!condition;
}

function computeModeStatsSummary(mode = "daily") {
  const source = mode === "practice" ? state.stats.practice : state.stats.daily;

  const played =
    Number.isInteger(source?.played) && source.played >= 0 ? source.played : 0;
  const won = Number.isInteger(source?.won) && source.won >= 0 ? source.won : 0;
  const lost =
    Number.isInteger(source?.lost) && source.lost >= 0 ? source.lost : 0;
  const currentStreak =
    mode === "daily" &&
      Number.isInteger(source?.currentStreak) &&
      source.currentStreak >= 0
      ? source.currentStreak
      : 0;
  const bestStreak =
    mode === "daily" &&
      Number.isInteger(source?.bestStreak) &&
      source.bestStreak >= 0
      ? source.bestStreak
      : 0;

  const rawDistribution =
    source?.guessDistribution &&
      typeof source.guessDistribution === "object" &&
      !Array.isArray(source.guessDistribution)
      ? source.guessDistribution
      : {};

  const maxGuesses = 8;
  const guessDistribution = {};
  for (let i = 1; i <= maxGuesses; i += 1) {
    const value = rawDistribution[i] ?? rawDistribution[String(i)] ?? 0;
    guessDistribution[i] = Number.isInteger(value) && value >= 0 ? value : 0;
  }

  return {
    mode,
    played,
    won,
    lost,
    currentStreak,
    bestStreak,
    guessDistribution,
  };
}

function renderPostGameStats(mode) {
  const statsObj = computeModeStatsSummary(mode);
  const isDaily = mode === "daily";

  if (elements.postGameStatsLabel) {
    elements.postGameStatsLabel.textContent = isDaily
      ? "Daily stats"
      : "Practice stats";
  }

  if (elements.postGameStatsPlayed) {
    elements.postGameStatsPlayed.textContent = String(statsObj.played);
  }
  if (elements.postGameStatsWon) {
    elements.postGameStatsWon.textContent = String(statsObj.won);
  }
  if (elements.postGameStatsLost) {
    elements.postGameStatsLost.textContent = String(statsObj.lost);
  }

  showWhen(elements.postGameStatsGridSecondary, isDaily);
  showWhen(elements.postGameCurrentStreakItem, isDaily);
  showWhen(elements.postGameBestStreakItem, isDaily);

  if (isDaily) {
    if (elements.postGameStatsCurrentStreak) {
      elements.postGameStatsCurrentStreak.textContent = String(statsObj.currentStreak);
    }
    if (elements.postGameStatsBestStreak) {
      elements.postGameStatsBestStreak.textContent = String(statsObj.bestStreak);
    }
  }

  if (elements.postGameGuessDistribution) {
    renderStatsSection(statsObj, elements.postGameGuessDistribution);
  }
}

function renderStatsSection(statsObj, container) {
  if (!container) return;

  const safeStats = statsObj ?? computeStatsSummary();
  const totalWins = safeStats.won;
  const guessKeys = Object.keys(safeStats.guessDistribution || {})
    .map(Number)
    .sort((a, b) => a - b);

  const maxCount = guessKeys.reduce(
    (max, key) => Math.max(max, safeStats.guessDistribution[key] || 0),
    0,
  );

  container.innerHTML = "";

  const hasStats =
    safeStats.played > 0 || totalWins > 0 || safeStats.lost > 0;

  if (!hasStats) {
    container.innerHTML = renderEmptyState({
      title: "No history yet",
      body: "Play a few rounds to build your guess distribution.",
      compact: true,
      showMarker: true,
      tone: "empty",
      actions: renderRetryButtonMarkup("Start guessing", "focus-guess-input"),
    });
    bindEmptyStateActions(container);
    return;
  }

  if (!guessKeys.length) {
    container.innerHTML = renderEmptyState({
      title: "No solved rounds yet",
      body: "Win a puzzle to start filling the guess distribution.",
      compact: true,
      showMarker: true,
      tone: "empty",
      actions: renderRetryButtonMarkup("Keep playing", "focus-guess-input"),
    });
    bindEmptyStateActions(container);
    return;
  }

  guessKeys.forEach((attempt) => {
    const count = safeStats.guessDistribution[attempt] || 0;

    const row = document.createElement("div");
    row.className = "dist-row";

    const label = document.createElement("div");
    label.className = "dist-label";
    label.textContent = `${attempt}`;
    label.setAttribute("aria-label", `Guess distribution, ${attempt} attempts`);

    const track = document.createElement("div");
    track.className = "dist-track";

    const bar = document.createElement("div");
    bar.className = "dist-bar";
    bar.style.width = `${maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 8 : 0) : 0}%`;
    bar.setAttribute("aria-hidden", "true");
    track.appendChild(bar);

    const value = document.createElement("div");
    value.className = "dist-count";
    value.textContent = String(count);

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    container.appendChild(row);
  });
}

function renderEarnedBadges(container) {
  if (!container) return;

  const earnedIds = new Set(getEarnedBadgeIds());

  if (!earnedIds.size) {
    container.innerHTML = renderEmptyState({
      title: "No badges earned yet",
      body: "Keep a Daily winning streak going to unlock streak badges.",
      compact: true,
      showMarker: true,
    });
    return;
  }

  container.innerHTML = STREAK_BADGES.map((badge) => {
    const isEarned = earnedIds.has(badge.id);
    const badgeClass = isEarned
      ? "streak-badge ui-badge is-earned"
      : "streak-badge ui-badge is-locked";
    const badgeLabel = isEarned
      ? `Earned badge: ${badge.label}`
      : `Locked badge: ${badge.label}`;

    return `
      <span class="${badgeClass}" aria-label="${badgeLabel}">
        <span class="streak-badge-text">${badge.label}</span>
        <span class="streak-badge-state">${isEarned ? "Earned" : "Locked"}</span>
      </span>
    `;
  }).join("");
}

function formatTriviaLabel(value) {
  if (!value) return "";

  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildTriviaContent(puzzle, book) {
  const language = getCurrentLanguage();

  if (!puzzle && !book) {
    return {
      title: "",
      text: "",
      chips: [],
    };
  }

  const verseThemes = getLocalizedThemes(puzzle, language);
  const bookThemes = getLocalizedThemes(book, language);
  const combinedThemes = [...new Set([...verseThemes, ...bookThemes])].slice(0, 3);
  const chips = [];

  if (book) {
    const testament = getLocalizedTestament(book, language);
    const section = getLocalizedSection(book, language);
    if (testament) chips.push(`${testament}`);
    if (section) chips.push(section);
  }

  if (combinedThemes.length) {
    chips.push(`Themes: ${combinedThemes.join(", ")}`);
  }

  if (puzzle?.difficulty) {
    chips.push(`Difficulty: ${formatTriviaLabel(puzzle.difficulty)}`);
  }

  const localizedBookName = getLocalizedBookName(book, language) || getLocalizedValue(puzzle?.bookMl, puzzle?.book);

  const title =
    getLocalizedClue(puzzle, language) ||
    getLocalizedBookIntroTitle(book, language) ||
    `Learn more about ${localizedBookName || "this book"}`;

  const textParts = [];

  const explanation = getLocalizedExplanation(puzzle, language);
  const clue = getLocalizedClue(puzzle, language);

  if (explanation) {
    textParts.push(explanation);
  } else if (clue) {
    textParts.push(clue);
  }

  if (bookThemes.length) {
    textParts.push(`${localizedBookName} often emphasizes themes such as ${bookThemes.slice(0, 3).join(", ")}.`);
  } else if (verseThemes.length) {
    textParts.push(`This verse highlights themes such as ${verseThemes.slice(0, 3).join(", ")}.`);
  }

  if (puzzle?.devotional) {
    textParts.push(puzzle.devotional);
  }

  const uniqueParts = [];
  textParts.forEach((part) => {
    const trimmed = String(part || "").trim();
    if (!trimmed) return;
    if (uniqueParts.includes(trimmed)) return;
    uniqueParts.push(trimmed);
  });

  return {
    title,
    text: uniqueParts.slice(0, 2).join(" "),
    chips,
  };
}

function renderTriviaSection(content) {
  const {
    postGameTriviaSection,
    postGameTriviaTitle,
    postGameTriviaText,
    postGameTriviaChips,
  } = elements;

  if (
    !postGameTriviaSection ||
    !postGameTriviaTitle ||
    !postGameTriviaText ||
    !postGameTriviaChips
  ) {
    return;
  }

  const hasTitle = hasTextContent(content?.title);
  const hasText = hasTextContent(content?.text);
  const hasChips = isNonEmptyArray(content?.chips);
  const hasTrivia = hasTitle || hasText || hasChips;

  showWhen(postGameTriviaSection, true);

  if (!hasTrivia) {
    postGameTriviaTitle.textContent = "Book trivia";
    postGameTriviaText.textContent = "";
    renderInto(
      postGameTriviaChips,
      renderEmptyState({
        title: "No trivia available",
        body: "This book does not have extra trivia to show yet.",
        compact: true,
        showMarker: true,
        tone: "empty",
      }),
    );
    bindEmptyStateActions(postGameTriviaChips);
    return;
  }

  postGameTriviaTitle.textContent = content.title || "Learn more";
  postGameTriviaText.textContent = content.text || "";

  const chipsMarkup = (content.chips || [])
    .map((chip) => `<span class="postgame-chip ui-chip">${chip}</span>`)
    .join("");

  if (chipsMarkup) {
    renderWhen(postGameTriviaChips, true, chipsMarkup);
  } else {
    renderInto(
      postGameTriviaChips,
      renderEmptyState({
        title: "No extra trivia points",
        body: "There is a short summary for this book, but no additional trivia tags yet.",
        compact: true,
        showMarker: true,
        tone: "empty",
      }),
    );
    bindEmptyStateActions(postGameTriviaChips);
  }
}

function getPostGameContent() {
  const puzzle = state.currentPuzzle?.verse;
  if (!puzzle) return null;

  const language = getCurrentLanguage();
  const book = getBookByName(puzzle.book);

  return {
    title: state.status === "won" ? "Well done" : "Game over",
    badge: state.status === "won" ? "Solved" : "Failed",
    reference: getLocalizedReference(puzzle, language),
    bookName: getLocalizedBookName(book, language) || getLocalizedValue(puzzle.bookMl, puzzle.book),
    verseText: getLocalizedVerseText(puzzle, language),
    explanation: getLocalizedExplanation(puzzle, language),
    introTitle: getLocalizedBookIntroTitle(book, language),
    introText: getLocalizedBookIntroText(book, language),
    devotionalText: puzzle.devotional ?? book?.devotionalText ?? "",
    trivia: buildTriviaContent(puzzle, book),
  };
}

function computeArchiveSummary() {
  const totalBooks = books.length;
  const solvedBooks = books.filter((book) => {
    const entry = getBookStats(book);
    return entry && entry.solves > 0;
  }).length;

  const completionPercentage =
    totalBooks > 0 ? Math.round((solvedBooks / totalBooks) * 100) : 0;

  const testamentSummary = books.reduce((acc, book) => {
    const key = book.id ? `testament:${book.id}:${book.testament}` : book.testament;
    const label = getLocalizedTestament(book, getCurrentLanguage());

    if (!acc[label]) {
      acc[label] = { total: 0, solved: 0, totalAttempts: 0, solveCount: 0 };
    }

    acc[label].total += 1;

    const entry = getBookStats(book);
    if (entry && entry.solves > 0) {
      acc[label].solved += 1;
      acc[label].totalAttempts += entry.totalAttempts;
      acc[label].solveCount += entry.solves;
    }

    return acc;
  }, {});

  const sectionSummary = books.reduce((acc, book) => {
    const label = getLocalizedSection(book, getCurrentLanguage());

    if (!acc[label]) {
      acc[label] = { total: 0, solved: 0, totalAttempts: 0, solveCount: 0 };
    }

    acc[label].total += 1;

    const entry = getBookStats(book);
    if (entry && entry.solves > 0) {
      acc[label].solved += 1;
      acc[label].totalAttempts += entry.totalAttempts;
      acc[label].solveCount += entry.solves;
    }

    return acc;
  }, {});

  return {
    totalBooks,
    solvedBooks,
    completionPercentage,
    testamentSummary,
    sectionSummary,
  };
}

function formatArchiveAverage(totalAttempts, solveCount) {
  if (!solveCount) return "—";
  return (totalAttempts / solveCount).toFixed(1);
}

function renderArchiveBars(summaryObj) {
  return Object.entries(summaryObj)
    .map(([label, value]) => {
      const percentage = value.total > 0 ? (value.solved / value.total) * 100 : 0;

      return `
        <div class="archive-bar-row">
          <div class="archive-bar-topline">
            <span class="archive-bar-label">${label}</span>
            <span>${value.solved}/${value.total} · Avg ${formatArchiveAverage(value.totalAttempts, value.solveCount)}</span>
          </div>
          <div class="archive-bar-track" aria-hidden="true">
            <div class="archive-bar-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderArchiveSummary() {
  if (!elements.archiveSummary) return;

  const summary = computeArchiveSummary();

  elements.archiveSummary.innerHTML = `
    <div class="archive-summary-blocks">
      <section class="archive-summary-group ui-card section-shell section-shell--subtle" aria-label="Overall archive progress">
        <div class="section-shell__header">
          <p class="archive-summary-title">Overall</p>
        </div>
        <div class="section-shell__body">
          <div class="archive-kpis">
            <div class="archive-kpi stat-block">
              <span class="archive-kpi-value">${summary.solvedBooks}/${summary.totalBooks}</span>
              <span class="archive-kpi-label">Books solved</span>
            </div>
            <div class="archive-kpi stat-block">
              <span class="archive-kpi-value">${summary.completionPercentage}%</span>
              <span class="archive-kpi-label">Canon complete</span>
            </div>
          </div>
        </div>
      </section>

      <section class="archive-stat-group ui-card section-shell section-shell--subtle" aria-label="Solved books by testament">
        <div class="section-shell__header">
          <h3>By testament</h3>
        </div>
        <div class="section-shell__body">
          <div class="archive-bars">
            ${renderArchiveBars(summary.testamentSummary)}
          </div>
        </div>
      </section>

      <section class="archive-stat-group ui-card section-shell section-shell--subtle" aria-label="Solved books by section">
        <div class="section-shell__header">
          <h3>By section</h3>
        </div>
        <div class="section-shell__body">
          <div class="archive-bars">
            ${renderArchiveBars(summary.sectionSummary)}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderArchiveGrid(selectedBookKey = "") {
  if (!elements.archiveGrid) return;

  const language = getCurrentLanguage();

  elements.archiveGrid.innerHTML = books
    .map((book) => {
      const entry = getBookStats(book);
      const key = getBookStatsKey(book);
      const stateClass = getArchiveCellState(book);
      const stateLabel = getArchiveCellStateLabel(book);
      const average = getAverageAttemptsForBook(book);

      const metaLine =
        entry && entry.solves > 0
          ? `Best ${entry.bestAttempts ?? "—"} · Avg ${average ? average.toFixed(1) : "—"}`
          : entry && entry.plays > 0
            ? `Played ${entry.plays} · Unsolved`
            : `${getLocalizedTestament(book, language)} · ${getLocalizedSection(book, language)}`;

      return `
        <button
          type="button"
          class="archive-cell ${stateClass}${selectedBookKey === key ? " is-selected" : ""}"
          data-book-key="${key}"
          aria-label="${getArchiveCellAriaLabel(book)}"
          aria-pressed="${selectedBookKey === key ? "true" : "false"}"
        >
          <div class="archive-cell-top">
            <span class="archive-cell-order">#${book.order}</span>
            <span class="archive-cell-state">${stateLabel}</span>
          </div>
          <div class="archive-cell-book">${getLocalizedBookName(book, language)}</div>
          <div class="archive-cell-meta">${metaLine}</div>
        </button>
      `;
    })
    .join("");
}

function renderArchiveDetails(bookKey = "") {
  if (!elements.archiveDetails) return;

  const book = books.find((item) => getBookStatsKey(item) === bookKey) || null;

  if (!book) {
    renderInto(
      elements.archiveDetails,
      renderEmptyState({
        title: "No book selected",
        body: "Choose a book from the archive map to view its Daily progress details.",
        compact: false,
        inline: false,
        showMarker: true,
        tone: "empty",
      }),
    );
    return;
  }

  const language = getCurrentLanguage();
  const entry = getBookStats(book);
  const average = getAverageAttemptsForBook(book);
  const solved = entry?.solves ?? 0;
  const plays = entry?.plays ?? 0;
  const bestAttempts = entry?.bestAttempts ?? "—";
  const lastSolvedDate = entry?.lastSolvedDate ?? "Not yet solved";
  const stateLabel = getArchiveCellStateLabel(book);

  renderInto(
    elements.archiveDetails,
    `
      <div class="archive-details-header">
        <div class="archive-details-title">${getLocalizedBookName(book, language)}</div>
        <div class="archive-details-subtitle">${getLocalizedTestament(book, language)} · ${getLocalizedSection(book, language)} · Canon #${book.order}</div>
      </div>

      <div class="archive-details-grid">
        <div class="archive-detail-stat">
          <span class="archive-detail-stat-value">${plays}</span>
          <span class="archive-detail-stat-label">Daily plays</span>
        </div>
        <div class="archive-detail-stat">
          <span class="archive-detail-stat-value">${solved}</span>
          <span class="archive-detail-stat-label">Daily solves</span>
        </div>
        <div class="archive-detail-stat">
          <span class="archive-detail-stat-value">${bestAttempts}</span>
          <span class="archive-detail-stat-label">Best attempts</span>
        </div>
        <div class="archive-detail-stat">
          <span class="archive-detail-stat-value">${average ? average.toFixed(1) : "—"}</span>
          <span class="archive-detail-stat-label">Average attempts</span>
        </div>
      </div>

      <p class="archive-details-copy">
        Status: ${stateLabel}. Last solved date: ${lastSolvedDate}. This archive tracks Daily mode progress only.
      </p>
    `,
  );
}

const MODAL_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getModalDialog(modalBackdrop) {
  return modalBackdrop?.querySelector(".modal") || null;
}

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(MODAL_FOCUSABLE_SELECTOR)).filter(
    (node) =>
      !node.hasAttribute("hidden") &&
      node.getAttribute("aria-hidden") !== "true" &&
      node.offsetParent !== null,
  );
}

function getTopmostModal() {
  const openModals = state?.ui?.openModals || [];
  return openModals.length ? openModals[openModals.length - 1] : null;
}

function isModalOpen(modalBackdrop) {
  return !!modalBackdrop && modalBackdrop.dataset.open === "true";
}

function ensureUiState() {
  if (!state.ui) state.ui = {};
  if (!Array.isArray(state.ui.openModals)) state.ui.openModals = [];
  if (!(state.ui.modalFocusReturn instanceof Map)) {
    state.ui.modalFocusReturn = new Map();
  }
}

function rememberModalTrigger(modalBackdrop, trigger = document.activeElement) {
  ensureUiState();
  if (modalBackdrop && trigger instanceof HTMLElement) {
    state.ui.modalFocusReturn.set(modalBackdrop.id, trigger);
  }
}

function getRememberedModalTrigger(modalBackdrop) {
  ensureUiState();
  return modalBackdrop ? state.ui.modalFocusReturn.get(modalBackdrop.id) || null : null;
}

function clearRememberedModalTrigger(modalBackdrop) {
  ensureUiState();
  if (modalBackdrop) state.ui.modalFocusReturn.delete(modalBackdrop.id);
}

function pushOpenModal(modalBackdrop) {
  ensureUiState();
  state.ui.openModals = state.ui.openModals.filter((item) => item !== modalBackdrop);
  state.ui.openModals.push(modalBackdrop);
}

function popOpenModal(modalBackdrop) {
  ensureUiState();
  state.ui.openModals = state.ui.openModals.filter((item) => item !== modalBackdrop);
}

function getBackgroundRoots() {
  return [elements.appShell].filter(Boolean);
}

function syncModalStackClasses() {
  ensureUiState();
  state.ui.openModals.forEach((modal, index) => {
    modal.classList.toggle("is-topmost", index === state.ui.openModals.length - 1);
  });
}

function syncBackgroundInertState() {
  const hasOpenModal = !!getTopmostModal();
  getBackgroundRoots().forEach((root) => {
    if (!root) return;
    if (hasOpenModal) {
      root.setAttribute("inert", "");
      root.setAttribute("aria-hidden", "true");
    } else {
      root.removeAttribute("inert");
      root.removeAttribute("aria-hidden");
    }
  });
}

function focusModalEntry(modalBackdrop) {
  const dialog = getModalDialog(modalBackdrop);
  if (!dialog) return;

  const autofocusTarget =
    dialog.querySelector("[data-modal-autofocus]") ||
    getFocusableElements(dialog)[0] ||
    dialog;

  requestAnimationFrame(() => {
    autofocusTarget.focus?.({ preventScroll: true });
  });
}

function restoreModalFocus(modalBackdrop) {
  const trigger = getRememberedModalTrigger(modalBackdrop);
  clearRememberedModalTrigger(modalBackdrop);

  if (trigger && document.contains(trigger)) {
    requestAnimationFrame(() => {
      trigger.focus?.();
    });
  }
}

function trapModalFocus(event, modalBackdrop) {
  if (event.key !== "Tab") return;
  const dialog = getModalDialog(modalBackdrop);
  if (!dialog) return;

  const focusable = getFocusableElements(dialog);
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || !dialog.contains(active)) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (active === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleModalKeydown(event) {
  const activeModal = getTopmostModal();
  if (!activeModal) return;

  if (event.key === "Tab") {
    trapModalFocus(event, activeModal);
  }
}

function syncModalEnvironment() {
  syncModalStackClasses();
  syncBackgroundInertState();

  const hasOpenModal = !!getTopmostModal();
  if (hasOpenModal && !state.ui.modalKeydownBound) {
    document.addEventListener("keydown", handleModalKeydown);
    state.ui.modalKeydownBound = true;
  } else if (!hasOpenModal && state.ui.modalKeydownBound) {
    document.removeEventListener("keydown", handleModalKeydown);
    state.ui.modalKeydownBound = false;
  }
}

function handlePostGameLeaderboardOpen() {
  const trigger = document.activeElement;
  closePostGamePanel();
  openLeaderboardModal(trigger);
}

function handlePostGamePracticeStart() {
  resetPuzzle("practice");
}

async function openLeaderboardModal(trigger = document.activeElement) {
  if (!elements.leaderboardModal) return;

  modalService?.open("leaderboard", { trigger }) ??
    setModalOpenState(elements.leaderboardModal, true, {
      trigger,
    });

  renderBusyInto(
    elements.leaderboardSummary,
    renderLoadingBlock({
      label: "Loading global stats",
      variant: "kpis",
      rows: 4,
    }),
    "Loading global stats",
  );

  renderBusyInto(
    elements.leaderboardList,
    renderLoadingBlock({
      label: "Loading leaderboard",
      variant: "list",
      rows: 5,
    }),
    "Loading leaderboard",
  );

  renderBusyInto(
    elements.leaderboardUserRank,
    renderLoadingBlock({
      label: "Loading placement",
      variant: "rank",
      rows: 1,
    }),
    "Loading placement",
  );

  if (!state.auth.enabled || !firebaseDb) {
    clearBusyState(elements.leaderboardSummary);
    clearBusyState(elements.leaderboardList);
    clearBusyState(elements.leaderboardUserRank);

    renderInto(
      elements.leaderboardSummary,
      renderEmptyState({
        title: "Global stats unavailable",
        body: "Global Daily leaderboard data is unavailable right now.",
        compact: true,
        showMarker: true,
        tone: "error",
      }),
    );
    renderInto(
      elements.leaderboardList,
      renderEmptyState({
        title: "Leaderboard unavailable",
        body: "Firebase is not available, but local gameplay still works.",
        compact: true,
        showMarker: true,
        tone: "error",
        actions: renderRetryButtonMarkup("Try again", "retry-leaderboard"),
      }),
    );
    renderCurrentUserRank(null);
    bindEmptyStateActions(elements.leaderboardSummary);
    bindEmptyStateActions(elements.leaderboardList);
    bindEmptyStateActions(elements.leaderboardUserRank);
    return;
  }

  const dateKey = getDailyDateKey();

  try {
    const [stats, entries] = await Promise.all([
      fetchDailyGlobalStats(dateKey),
      fetchLeaderboardTopEntries(dateKey),
    ]);

    state.leaderboard.stats = stats;
    state.leaderboard.entries = entries;

    renderLeaderboardSummary(stats);
    renderLeaderboardList(entries);
  } catch (error) {
    console.error("Leaderboard stats/list load failed:", error);

    clearBusyState(elements.leaderboardSummary);
    clearBusyState(elements.leaderboardList);
    clearBusyState(elements.leaderboardUserRank);

    renderInto(
      elements.leaderboardSummary,
      renderEmptyState({
        title: "Could not load global stats",
        body: "Today’s global Daily metrics are not available right now.",
        compact: true,
        showMarker: true,
        tone: "error",
      }),
    );
    renderInto(
      elements.leaderboardList,
      renderEmptyState({
        title: "Could not load leaderboard",
        body: "Please try again in a moment.",
        compact: true,
        showMarker: true,
        tone: "error",
        actions: renderRetryButtonMarkup("Try again", "retry-leaderboard"),
      }),
    );
    renderCurrentUserRank(null);
    bindEmptyStateActions(elements.leaderboardSummary);
    bindEmptyStateActions(elements.leaderboardList);
    bindEmptyStateActions(elements.leaderboardUserRank);
    return;
  }

  if (!state.auth.user?.uid) {
    clearBusyState(elements.leaderboardUserRank);
    renderCurrentUserRank(null);
    return;
  }

  renderBusyInto(
    elements.leaderboardUserRank,
    renderLoadingBlock({
      label: "Loading placement",
      variant: "rank",
      rows: 1,
    }),
    "Loading placement",
  );

  try {
    const userRank = await fetchCurrentUserRank(dateKey, state.auth.user.uid);
    state.leaderboard.userRank = userRank;
    renderCurrentUserRank(userRank);
  } catch (error) {
    console.error("Leaderboard rank load failed:", error);
    clearBusyState(elements.leaderboardUserRank);
    renderInto(
      elements.leaderboardUserRank,
      renderEmptyState({
        title: "Could not load placement",
        body: "Your personal Daily placement is not available yet.",
        compact: true,
        showMarker: true,
        tone: "error",
        actions: renderRetryButtonMarkup("Try again", "retry-leaderboard"),
      }),
    );
    bindEmptyStateActions(elements.leaderboardUserRank);
  }
}

function closeLeaderboardModal() {
  modalService?.close("leaderboard") ?? closeModal(elements.leaderboardModal);
}



function openArchiveModal(trigger = document.activeElement) {
  if (!elements.archiveModal) return;

  const selectedBook =
    books.find((book) => {
      const entry = getBookStats(book);
      return entry && entry.plays > 0;
    }) || null;

  const selectedKey = selectedBook ? getBookStatsKey(selectedBook) : "";

  renderArchiveSummary();
  renderArchiveGrid(selectedKey);
  renderArchiveDetails(selectedKey);

  modalService?.open("archive", { trigger }) ?? setModalOpenState(elements.archiveModal, true, { trigger });
}

function closeArchiveModal() {
  modalService?.close("archive") ?? closeModal(elements.archiveModal);
}

function renderStatsModal() {
  const dailyStats = computeModeStatsSummary("daily");
  const practiceStats = computeModeStatsSummary("practice");

  if (elements.statsPlayed) {
    elements.statsPlayed.textContent = String(dailyStats.played);
  }
  if (elements.statsWon) {
    elements.statsWon.textContent = String(dailyStats.won);
  }
  if (elements.statsLost) {
    elements.statsLost.textContent = String(dailyStats.lost);
  }
  if (elements.statsCurrentStreak) {
    elements.statsCurrentStreak.textContent = String(dailyStats.currentStreak);
  }
  if (elements.statsBestStreak) {
    elements.statsBestStreak.textContent = String(dailyStats.bestStreak);
  }
  if (elements.statsGuessDistribution) {
    renderStatsSection(dailyStats, elements.statsGuessDistribution);
  }
  if (elements.statsModalBadges) {
    renderEarnedBadges(elements.statsModalBadges);
  }

  if (elements.practiceStatsPlayed) {
    elements.practiceStatsPlayed.textContent = String(practiceStats.played);
  }
  if (elements.practiceStatsWon) {
    elements.practiceStatsWon.textContent = String(practiceStats.won);
  }
  if (elements.practiceStatsLost) {
    elements.practiceStatsLost.textContent = String(practiceStats.lost);
  }
  if (elements.practiceStatsGuessDistribution) {
    renderStatsSection(practiceStats, elements.practiceStatsGuessDistribution);
  }
}

function getDailyStreakBadges() {
  const earnedIds = new Set(getEarnedBadgeIds());

  return STREAK_BADGES.map((badge) => ({
    ...badge,
    earned: earnedIds.has(badge.id),
  }));
}

function renderStatsModalBadges() {
  if (!elements.statsModalBadges) return;

  const badges = getDailyStreakBadges();

  if (!isNonEmptyArray(badges)) {
    renderInto(
      elements.statsModalBadges,
      renderEmptyState({
        title: "No badges yet",
        body: "Keep a Daily streak going to unlock badge milestones here.",
        compact: true,
        showMarker: true,
        tone: "empty",
      }),
    );
    bindEmptyStateActions(elements.statsModalBadges);
    return;
  }

  const markup = badges
    .map((badge) => {
      const earned = badge.earned;
      return `
        <span class="streak-badge ${earned ? "is-earned" : "is-locked"}">
          <span class="streak-badge-text">${badge.label}</span>
          <span class="streak-badge-state">${earned ? "Earned" : "Locked"}</span>
        </span>
      `;
    })
    .join("");

  renderInto(elements.statsModalBadges, markup);
}

function renderPostGameBadges(container, badges) {
  if (!container) return;

  if (!isNonEmptyArray(badges)) {
    renderInto(
      container,
      renderEmptyState({
        title: "No new badge this round",
        body: "Keep building your Daily streak to unlock badge milestones.",
        compact: true,
        showMarker: true,
        tone: "empty",
      }),
    );
    bindEmptyStateActions(container);
    return;
  }

  const markup = badges
    .map((badge) => {
      const earned = badge.earned !== false;
      return `
        <span class="streak-badge ${earned ? "is-earned" : "is-locked"}">
          <span class="streak-badge-text">${badge.label}</span>
          <span class="streak-badge-state">${earned ? "Earned" : "Locked"}</span>
        </span>
      `;
    })
    .join("");

  renderInto(container, markup);
}

function renderPostGamePanel() {
  if (!elements.postGameModal) return;

  const content = getPostGameContent();

  if (!content || !isGameOver()) {
    setModalOpenState(elements.postGameModal, false);
    state.postGameOpen = false;
    return;
  }

  elements.postGameTitle.textContent = content.title;
  elements.postGameBadge.textContent = content.badge;
  elements.postGameReference.textContent = content.reference;
  elements.postGameBook.textContent = content.bookName;
  elements.postGameVerse.textContent = content.verseText;
  elements.postGameIntroTitle.textContent = content.introTitle;
  elements.postGameIntroText.textContent =
    content.introText || content.explanation || "";

  if (elements.shareBtn) {
    elements.shareBtn.textContent = "Share result";
  }

  if (elements.postGameCopyBtn) {
    elements.postGameCopyBtn.textContent = "Share result";
  }

  showWhen(elements.postGameNextBtn, state.mode === "practice");
  showWhen(elements.postGamePracticeBtn, state.mode === "daily");

  renderTriviaSection(content.trivia);
  renderPostGameStats(state.mode);

  if (state.mode === "daily") {
    showWhen(elements.postGameLeaderboardSection, true);
    loadPostGameLeaderboardRank();
  } else {
    showWhen(elements.postGameLeaderboardSection, false);
    renderWhen(elements.postGameLeaderboardRank, false, "");
  }

  setModalOpenState(elements.postGameModal, true);
  state.postGameOpen = true;
}

function closePostGameModal() {
  modalService?.close("postGame") ?? closeModal(elements.postGameModal);
}

function closePostGamePanel() {
  closePostGameModal();
}

function renderPuzzleView() {
  applyLanguageToDocument();
  applyModeTheme(state.mode);
  renderLanguageControl();
  renderMobileLanguageToggle();
  renderPuzzleCard();

  if (state.status === "won" || state.status === "lost") {
    syncEndStateVisibility();
    renderGuessRows();
    syncPreferenceControls();
    syncActionButtons();
    renderPostGamePanel();

    if (state.status === "won") {
      renderStatus(
        `Correct — ${getLocalizedValue(state.currentPuzzle.verse.book, state.currentPuzzle.verse.bookMl)} (${getLocalizedReference(state.currentPuzzle.verse, getCurrentLanguage())}).`,
      );
      publishBootSnapshot({ renderStatus: "won" });
      return;
    }

    renderStatus(
      `Out of guesses — the answer was ${getLocalizedValue(state.currentPuzzle.verse.book, state.currentPuzzle.verse.bookMl)} (${getLocalizedReference(state.currentPuzzle.verse, getCurrentLanguage())}).`,
    );
    publishBootSnapshot({ renderStatus: "lost" });
    return;
  }

  syncEndStateVisibility();
  renderHintBlock();
  renderGuessRows();
  renderProximityLine();
  syncPreferenceControls();
  syncActionButtons();
  renderPostGamePanel();

  const clueState = buildClueRevealState();
  const newHintCount = clueState.newlyUnlockedKeys.length;

  if (newHintCount > 0 && state.guesses.length > 0) {
    renderStatus(
      `${newHintCount} new ${newHintCount === 1 ? "clue" : "clues"} unlocked. Review the clue panel above.`,
    );
    publishBootSnapshot({ renderStatus: "new-clues" });
    return;
  }

  renderStatus();
  publishBootSnapshot({ renderStatus: "playing" });
}

function resetInput() {
  elements.guessInput.value = "";
  updateComboboxA11y(false);
  saveProgress();
}

function resetSuggestionsState() {
  state.selectedSuggestionIndex = -1;
  state.currentSuggestions = [];
  updateComboboxA11y(false);
}

function closeSuggestions() {
  state.selectedSuggestionIndex = -1;
  if (elements.autocomplete) {
    elements.autocomplete.dataset.open = "false";
    renderWhen(elements.autocomplete, false, "");
  }
  updateComboboxA11y(false);
}

function updateComboboxA11y(isOpen) {
  if (!elements.guessInput) return;

  elements.guessInput.setAttribute("aria-expanded", String(isOpen));

  const active =
    isOpen && state.selectedSuggestionIndex >= 0
      ? `suggestion-${state.selectedSuggestionIndex}`
      : "";

  elements.guessInput.setAttribute("aria-activedescendant", active);
}

function openSuggestions() {
  if (!elements.autocomplete) return;
  elements.autocomplete.dataset.open = "true";
  showWhen(elements.autocomplete, true);
  updateComboboxA11y(true);
}

function scrollActiveSuggestionIntoView() {
  const active = elements.autocomplete.querySelector('[aria-selected="true"]');
  active?.scrollIntoView({ block: "nearest" });
}

function renderSuggestions() {
  if (!elements.autocomplete) return;

  if (!state.currentSuggestions.length) {
    const query = elements.guessInput?.value?.trim() || "";

    if (!query) {
      closeSuggestions();
      return;
    }

    renderInto(
      elements.autocomplete,
      renderEmptyState({
        title: "No matching books",
        body: "Try another spelling or a different Bible book name.",
        compact: true,
        showMarker: true,
        tone: "empty",
        actions: renderRetryButtonMarkup("Keep typing", "focus-guess-input"),
      }),
    );
    bindEmptyStateActions(elements.autocomplete);
    openSuggestions();
    updateComboboxA11y(false);
    return;
  }

  const markup = state.currentSuggestions
    .map((suggestion, index) => {
      const active = index === state.selectedSuggestionIndex;

      return `
        <button
          id="suggestion-${index}"
          type="button"
          class="suggestion${active ? " is-active" : ""}"
          role="option"
          aria-selected="${active}"
          data-index="${index}"
        >
          <span class="suggestion-primary">${suggestion.primaryLabel}</span>
          ${suggestion.secondaryLabel ? `<span class="suggestion-secondary">${suggestion.secondaryLabel}</span>` : ""}
        </button>
      `;
    })
    .join("");

  renderWhen(elements.autocomplete, hasRenderableMarkup(markup), markup);
  openSuggestions();
  updateComboboxA11y(state.selectedSuggestionIndex >= 0);
  scrollActiveSuggestionIntoView();
}

function updateSuggestions(query) {
  const value = query.trim();

  if (!value) {
    resetSuggestionsState();
    closeSuggestions();
    return;
  }

  state.currentSuggestions = getSuggestionCandidates(value, getCurrentLanguage());
  state.selectedSuggestionIndex = -1;
  renderSuggestions();
}

function handleInvalidGuess() {
  renderStatus("Choose a valid Catholic Bible book from the list.");
}

function handleDuplicateGuess(book) {
  const bookName =
    typeof book === "object"
      ? getLocalizedBookName(book, getCurrentLanguage())
      : String(book || "");
  renderStatus(`You already tried ${bookName}.`);
}

function refreshAfterGuess(message) {
  syncEndStateVisibility();

  if (state.status !== "won" && state.status !== "lost") {
    renderHintBlock();
    renderProximityLine();
  }

  renderGuessRows(true);
  syncPreferenceControls();
  syncActionButtons();
  renderStatus(message);
  saveProgress();
  renderPuzzleView();
}

async function handleSolvedGuess() {
  state.status = "won";
  await recordPuzzleCompletion("won");
  refreshAfterGuess(
    `Correct — ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`,
  );
}

async function handleLostGuess() {
  state.status = "lost";
  await recordPuzzleCompletion("lost");
  refreshAfterGuess(
    `Out of guesses — the answer was ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`,
  );
}

function handleIncorrectGuess(bookName) {
  const clueState = buildClueRevealState();
  const newHintCount = clueState.newlyUnlockedKeys.length;
  const nearestDistance = getNearestGuessDistance();

  renderHintBlock();
  renderGuessRows(true);
  renderProximityLine();
  syncPreferenceControls();
  syncActionButtons();

  if (newHintCount > 0) {
    renderStatus(
      `${bookName} added. ${newHintCount} new ${newHintCount === 1 ? "clue" : "clues"} unlocked.`,
    );
  } else if (typeof nearestDistance === "number" && nearestDistance > 0) {
    renderStatus(
      `${bookName} added. Your nearest guess so far is ${nearestDistance} ${nearestDistance === 1 ? "book" : "books"} away.`,
    );
  } else {
    renderStatus(`${bookName} added. Use the colors and clues for your next guess.`);
  }

  saveProgress();
}

async function applyGuess(rawGuess) {
  if (isGameOver()) {
    renderPuzzleView();
    return;
  }

  const match = typeof rawGuess === "object" ? rawGuess : getBookByName(rawGuess);
  if (!match) {
    handleInvalidGuess();
    return;
  }

  if (isBookAlreadyGuessed(match.id)) {
    handleDuplicateGuess(match);
    return;
  }

  const result = compareGuess(match);
  if (!result) return;

  state.guesses.push(result);
  resetInput();
  resetSuggestionsState();
  closeSuggestions();

  if (result.solved) {
    await handleSolvedGuess();
    return;
  }

  if (state.guesses.length >= getMaxGuesses()) {
    await handleLostGuess();
    return;
  }

  handleIncorrectGuess(getLocalizedBookName(match, getCurrentLanguage()));
}

function buildShareSummary() {
  return state.guesses
    .map((guess) => {
      const tile = (cell) =>
        cell.state === "correct"
          ? "🟩"
          : cell.state === "partial"
            ? "🟨"
            : "🟥";

      return [
        tile(guess.testament),
        tile(guess.section),
        tile(guess.firstLetter),
        tile(guess.bookResult),
      ].join("");
    })
    .join("\n");
}

function buildShareText() {
  const solved = state.status === "won";
  const lost = state.status === "lost";
  const guessCount = state.guesses.length;
  const guessWord = guessCount === 1 ? "guess" : "guesses";
  const modeLabel = state.mode === "daily" ? "Daily" : "Practice";
  const difficultyLabel =
    typeof state.preferences?.difficulty === "string"
      ? state.preferences.difficulty.charAt(0).toUpperCase() + state.preferences.difficulty.slice(1)
      : "Normal";
  const currentStreak =
    Number.isFinite(state.stats?.daily?.currentStreak) ? state.stats.daily.currentStreak : 0;
  const streakLine =
    state.mode === "daily" && currentStreak > 0
      ? `Streak: ${currentStreak} day${currentStreak === 1 ? "" : "s"} 🔥\n`
      : "";
  const puzzleLabel =
    state.mode === "daily"
      ? state.currentPuzzle?.date || getTodayPuzzleDate()
      : "practice";
  const resultLabel = solved ? "Solved" : lost ? "Lost" : "In progress";
  const summary = buildShareSummary();

  return `✝️ Catholic Bibdle ✝️
${modeLabel} · ${puzzleLabel}
${resultLabel} in ${guessCount} ${guessWord}
${difficultyLabel} mode
${streakLine}${summary}
Play: https://dvndmy.github.io/BIBDLE`;
}

async function copyResult() {
  return fallbackCopyText(buildShareText(), {
    copiedMessage: "Result copied to clipboard.",
    unavailableMessage: "Clipboard access is unavailable in this browser.",
  });
}

function bindShareActions() {
  if (elements.shareBtn && elements.shareBtn.dataset.shareBound !== "true") {
    elements.shareBtn.dataset.shareBound = "true";
    elements.shareBtn.addEventListener("click", () => {
      shareResult();
    });
  }

  if (elements.postGameCopyBtn && elements.postGameCopyBtn.dataset.shareBound !== "true") {
    elements.postGameCopyBtn.dataset.shareBound = "true";
    elements.postGameCopyBtn.addEventListener("click", () => {
      shareResult();
    });
  }
}

function setModalOpen(modal, isOpen) {
  setModalOpenState(modal, isOpen);
}

function openHelpModal(trigger = document.activeElement) {
  modalService?.open("help", { trigger }) ?? setModalOpenState(elements.helpModal, true, { trigger });
}

function closeHelpModal() {
  modalService?.close("help") ?? setModalOpen(elements.helpModal, false);
}

function openSettingsModal(trigger = document.activeElement) {
  if (!elements.settingsModal) return;

  syncSettingsControls();
  modalService?.open("settings", { trigger }) ?? setModalOpenState(elements.settingsModal, true, { trigger });
}

function closeSettingsModal() {
  modalService?.close("settings") ?? setModalOpen(elements.settingsModal, false);
}

function openStatsModal(trigger = document.activeElement) {
  if (!elements.statsModal) return;

  renderStatsModal();
  modalService?.open("stats", { trigger }) ?? setModalOpenState(elements.statsModal, true, { trigger });
}

function closeStatsModal() {
  modalService?.close("stats") ?? setModalOpen(elements.statsModal, false);
}

function syncSettingsControls() {
  if (elements.reducedMotionToggle) {
    elements.reducedMotionToggle.checked = !!state.preferences.reducedAnimation;
  }
  if (elements.highContrastToggle) {
    elements.highContrastToggle.checked = !!state.preferences.highContrast;
  }
  if (elements.largeTextToggle) {
    elements.largeTextToggle.checked = !!state.preferences.largeText;
  }
  if (elements.soundToggle) {
    elements.soundToggle.checked = !!state.preferences.sound;
  }
}

function applyAccessibilityPreferences() {
  document.documentElement.classList.toggle(
    "reduced-motion",
    !!state.preferences.reducedAnimation,
  );
  document.documentElement.classList.toggle(
    "high-contrast",
    !!state.preferences.highContrast,
  );
  document.documentElement.classList.toggle(
    "large-text",
    !!state.preferences.largeText,
  );
}

function handleReducedMotionToggle(event) {
  state.preferences.reducedAnimation = !!event.target.checked;
  applyAccessibilityPreferences();
  savePreferences();
  renderPipeline.renderPreferencesChanged({
    reason: "reduced-motion-toggle",
  });
}

function handleHighContrastToggle(event) {
  state.preferences.highContrast = !!event.target.checked;
  applyAccessibilityPreferences();
  savePreferences();
  renderPipeline.renderPreferencesChanged({
    reason: "high-contrast-toggle",
  });
}

function handleLargeTextToggle(event) {
  state.preferences.largeText = !!event.target.checked;
  applyAccessibilityPreferences();
  savePreferences();
  renderPipeline.renderPreferencesChanged({
    reason: "large-text-toggle",
  });
}

function handleSoundToggle(event) {
  state.preferences.sound = !!event.target.checked;
  savePreferences();
  renderPipeline.renderPreferencesChanged({
    reason: "sound-toggle",
  });
}

async function handleGuessSubmit(event) {
  event.preventDefault();
  await applyGuess(elements.guessInput.value);
}

function handleGuessInput(event) {
  if (isGameOver()) return;

  updateSuggestions(event.target.value);
  saveProgress();
}

function moveSuggestion(nextIndex) {
  if (!state.currentSuggestions.length) return;

  state.selectedSuggestionIndex = nextIndex;
  renderSuggestions();
}

async function handleGuessKeydown(event) {
  if (isGameOver()) return;

  const isOpen = elements.autocomplete.dataset.open === "true";
  const hasSuggestions = state.currentSuggestions.length > 0;

  if (!isOpen || !hasSuggestions) {
    if (event.key === "Enter") {
      event.preventDefault();
      await applyGuess(elements.guessInput.value);
    }

    if (event.key === "ArrowDown" && hasSuggestions) {
      event.preventDefault();
      state.selectedSuggestionIndex = 0;
      renderSuggestions();
    }

    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();

    const next =
      state.selectedSuggestionIndex < 0
        ? 0
        : Math.min(
          state.selectedSuggestionIndex + 1,
          state.currentSuggestions.length - 1,
        );

    moveSuggestion(next);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();

    const next =
      state.selectedSuggestionIndex < 0
        ? state.currentSuggestions.length - 1
        : Math.max(state.selectedSuggestionIndex - 1, 0);

    moveSuggestion(next);
    return;
  }

  if (event.key === "Escape") {
    closeSuggestions();
    return;
  }

  if (event.key === "Enter" && state.selectedSuggestionIndex >= 0) {
    event.preventDefault();
    const picked = state.currentSuggestions[state.selectedSuggestionIndex];
    if (picked) {
      await applyGuess(getBookById(picked.bookId));
      return;
    }
  }
}

async function handleSuggestionClick(event) {
  const button = event.target.closest(".suggestion");
  if (!button) return;

  const suggestion = state.currentSuggestions[Number(button.dataset.index)];
  const book = suggestion ? getBookById(suggestion.bookId) : null;
  if (book) await applyGuess(book);
}

function handleDocumentClick(event) {
  if (!elements.guessForm.contains(event.target)) {
    closeSuggestions();
  }
}

function handleArchiveGridClick(event) {
  const button = event.target.closest(".archive-cell");
  if (!button) return;

  const bookKey = button.dataset.bookKey || "";
  renderArchiveGrid(bookKey);
  renderArchiveDetails(bookKey);
}

function handleThemeToggle() {
  const nextTheme = state.preferences.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  savePreferences();
  renderPipeline.renderPreferencesChanged({
    reason: "theme-toggle",
  });
}

function setLanguage(language) {
  const nextLanguage = language === "ml" ? "ml" : "en";
  state.preferences.language = nextLanguage;
  applyLanguageToDocument();
  renderLanguageControl();
  renderMobileLanguageToggle?.();
  savePreferences();
}

function rebuildGuessForCurrentLanguage(savedGuess) {
  if (!savedGuess?.bookId) return savedGuess;

  return compareGuess(savedGuess.bookId);
}

function refreshGuessesForCurrentLanguage() {
  if (!Array.isArray(state.guesses) || !state.guesses.length) return;

  state.guesses = state.guesses
    .map((guess) => rebuildGuessForCurrentLanguage(guess))
    .filter(Boolean);

  saveProgress();
}

function handleLanguageChange(event) {
  const value = event.target.value === "ml" ? "ml" : "en";
  setLanguage(value);
  refreshGuessesForCurrentLanguage();
  renderPipeline.renderPreferencesChanged({
    reason: "language-change",
  });
}

function renderMobileLanguageToggle() {
  const currentLanguage = getCurrentLanguage();
  const nextLanguage = currentLanguage === "ml" ? "en" : "ml";

  if (elements.mobileLanguageGlyph) {
    elements.mobileLanguageGlyph.textContent = currentLanguage === "ml" ? "A" : "അ";
  }

  if (elements.mobileLanguageToggle) {
    const label =
      nextLanguage === "ml"
        ? "Switch language to Malayalam"
        : "Switch language to English";

    elements.mobileLanguageToggle.setAttribute("aria-label", label);
    elements.mobileLanguageToggle.title =
      nextLanguage === "ml" ? "Malayalam" : "English";
  }
}

function handleMobileLanguageToggle() {
  const nextLanguage = getCurrentLanguage() === "en" ? "ml" : "en";
  setLanguage(nextLanguage);
  refreshGuessesForCurrentLanguage();
  renderPipeline.renderPreferencesChanged({
    reason: "mobile-language-toggle",
  });
}

function handleDifficultyChange(event) {
  const value = event.target.value;
  if (!CONFIG.modes[value]) return;
  state.preferences.difficulty = value;

  const clueUiState = ensureClueUiState();
  clueUiState.lastUnlockedKeys = [];
  clueUiState.lastRenderSignature = "";

  savePreferences();
  renderPipeline.renderPreferencesChanged({
    reason: "difficulty-change",
  });
  resetPuzzle(state.mode);
}

function handleModeChange(event) {
  const value = event.target.value;
  if (value !== "daily" && value !== "practice") return;

  markLifecycleStage("mode-switch", {
    from: state.mode,
    to: value,
  });

  state.mode = value;
  state.preferences.preferredMode = value;
  savePreferences();

  renderPipeline.renderModeSwitch({
    mode: value,
  });

  resetPuzzle(value);
}

function handleNextPracticePuzzle() {
  if (state.mode !== "practice") return;

  markLifecycleStage("puzzle-reset", {
    mode: "practice",
    trigger: "next-practice",
  });

  startPuzzle("practice");
  saveProgress();
  renderPipeline.renderPuzzleReset({
    mode: "practice",
    source: "next-practice",
  });
}

function handleTryPracticeRound() {
  resetPuzzle("practice");
}

function handleTryTodaysBibdle() {
  resetPuzzle("daily");
}

function bindBackdropClose(modal, onClose) {
  if (!modal) return;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) onClose();
  });
}

async function writeMergedDataToCloud(uid, mergedData) {
  const profileRef = getUserProfileRef(uid);
  if (!profileRef) return;

  await setDoc(
    profileRef,
    {
      uid,
      preferences: mergedData.preferences,
      stats: mergedData.stats,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function loadCloudDataToLocal(user) {
  if (!user?.uid) return false;

  const profileRef = getUserProfileRef(user.uid);
  if (!profileRef) return false;

  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) {
    return false;
  }

  const cloudData = sanitizeCloudProfile(snapshot.data());
  const localData = {
    preferences: getLocalPreferencesSnapshot(),
    stats: getLocalStatsSnapshot(),
  };

  const mergedData = mergeLocalAndCloudData(localData, cloudData);

  state.preferences = mergedData.preferences;
  state.stats = mergedData.stats;

  savePreferences();
  saveStats();
  await writeMergedDataToCloud(user.uid, mergedData);

  applyAccessibilityPreferences();
  initTheme();
  syncPreferenceControls();
  renderPuzzleView();
  renderStatsModal();

  return true;
}

async function syncLocalDataToCloud(user) {
  if (!user?.uid) return;

  const mergedData = {
    preferences: getLocalPreferencesSnapshot(),
    stats: getLocalStatsSnapshot(),
  };

  await writeMergedDataToCloud(user.uid, mergedData);
}

async function handleAuthStateChange(user) {
  state.auth.user = user || null;
  state.auth.ready = true;
  markLifecycleStage("auth-ready", {
    user: user
      ? {
        uid: user.uid,
        isAnonymous: !!user.isAnonymous,
      }
      : null,
  });

  if (!user) {
    state.auth.syncing = false;
    renderAuthUI();
    publishBootSnapshot({ auth: "anonymous-local" });
    return;
  }

  state.auth.syncing = true;
  renderAuthUI();
  publishBootSnapshot({ auth: "syncing" });

  try {
    const hadCloudProfile = await loadCloudDataToLocal(user);

    if (!hadCloudProfile) {
      await syncLocalDataToCloud(user);
    }
  } catch (error) {
    console.error("Auth sync failed:", error);
    if (user.isAnonymous) {
      setAuthStatus(`Playing anonymously as ${getPublicUserName(user)}`);
    } else {
      setAuthStatus("Signed in, cloud sync unavailable");
    }
    markLifecycleError("auth-ready", error, {
      user: {
        uid: user.uid,
        isAnonymous: !!user.isAnonymous,
      },
    });
  } finally {
    state.auth.syncing = false;
    renderAuthUI();
    publishBootSnapshot({ auth: "ready" });
  }
}

function initFirebaseAuth() {
  markLifecycleStage("init-services", { service: "firebase-auth" });

  if (!FIREBASE_ENABLED) {
    state.auth.ready = true;
    state.auth.enabled = false;
    renderAuthUI();
    publishBootSnapshot({ firebase: "disabled" });
    return;
  }

  try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    firebaseGoogleProvider = new GoogleAuthProvider();

    state.auth.enabled = true;
    renderAuthUI();
    publishBootSnapshot({ firebase: "initialized" });

    onAuthStateChanged(firebaseAuth, (user) => {
      handleAuthStateChange(user);
    });
  } catch (error) {
    console.error("Firebase init failed:", error);
    state.auth.ready = true;
    state.auth.enabled = false;
    renderAuthUI();
    markLifecycleError("init-services", error, { service: "firebase-auth" });
  }
}

async function handleSignIn() {
  if (!authService) {
    setAuthStatus("Sign-in unavailable");
    return;
  }

  renderPipeline.renderSyncState("sign-in-start");

  try {
    await authService.signIn();
  } catch (error) {
    handleAuthActionError("sign-in", error);
  }
}

async function handleSignOut() {
  if (!authService) {
    setAuthStatus("Playing anonymously");
    return;
  }

  renderPipeline.renderSyncState("sign-out-start");

  try {
    await authService.signOut();
  } catch (error) {
    handleAuthActionError("sign-out", error);
  }
}

function getModalRegistry() {
  return {
    help: elements.helpModal,
    settings: elements.settingsModal,
    stats: elements.statsModal,
    archive: elements.archiveModal,
    leaderboard: elements.leaderboardModal,
    postGame: elements.postGameModal,
  };
}

function createRenderPipelineApi() {
  return {
    state,
    elements,
    modalService,
    renderPuzzleView,
    renderAuthUI,
    renderStatsModal,
    renderLanguageControl,
    renderMobileLanguageToggle,
    renderThemeToggle,
    syncPreferenceControls,
    renderPostGamePanel,
    renderStatus,
    bindEmptyStateActions,
    closeSuggestions,
    closePostGamePanel,
    publishBootSnapshot,
  };
}

function resetModalScroll(modalBackdrop) {
  if (!modalBackdrop) return;

  modalBackdrop.scrollTop = 0;

  const scrollContainers = modalBackdrop.querySelectorAll(
    ".modal__content, .modal__body, .modal-content, .modal-body, [data-modal-scroll]",
  );

  scrollContainers.forEach((node) => {
    node.scrollTop = 0;
  });
}

function createModalCallbacks() {
  return {
    onOpen(modalBackdrop, options = {}) {
      const trigger = options.trigger ?? document.activeElement;
      if (!modalBackdrop) return;

      ensureUiState();
      modalBackdrop.dataset.open = "true";
      modalBackdrop.setAttribute("aria-hidden", "false");
      rememberModalTrigger(modalBackdrop, trigger);
      pushOpenModal(modalBackdrop);
      syncModalEnvironment();
      resetModalScroll(modalBackdrop);
      focusModalEntry(modalBackdrop);
      publishBootSnapshot({
        modalAction: "open",
        modalId: modalBackdrop.id,
      });
    },
    onClose(modalBackdrop, options = {}) {
      if (!modalBackdrop) return;

      const restoreFocus = options.restoreFocus !== false;

      modalBackdrop.dataset.open = "false";
      modalBackdrop.setAttribute("aria-hidden", "true");
      popOpenModal(modalBackdrop);
      syncModalEnvironment();

      if (restoreFocus) {
        restoreModalFocus(modalBackdrop);
      } else {
        clearRememberedModalTrigger(modalBackdrop);
      }

      publishBootSnapshot({
        modalAction: "close",
        modalId: modalBackdrop.id,
      });
    },
    onEscape(modalBackdrop) {
      closeModal(modalBackdrop);
    },
  };
}

function createBindingsApi() {
  return {
    elements,
    state,
    modalService,
    handlers: {
      handleGuessSubmit,
      handleGuessInput,
      handleGuessKeydown,
      handleSuggestionClick,
      handleDocumentClick,
      handleArchiveGridClick,
      handleThemeToggle,
      handleLanguageChange,
      handleMobileLanguageToggle,
      handleDifficultyChange,
      handleModeChange,
      handleReducedMotionToggle,
      handleHighContrastToggle,
      handleLargeTextToggle,
      handleSoundToggle,
      handleSignIn,
      handleSignOut,
      handleNextPracticePuzzle,
      handleTryPracticeRound,
      handleTryTodaysBibdle,
      copyResult,
      closeSuggestions,
      bindEmptyStateActions,
      openHelpModal,
      closeHelpModal,
      openSettingsModal,
      closeSettingsModal,
      openStatsModal,
      closeStatsModal,
      openArchiveModal,
      closeArchiveModal,
      openLeaderboardModal,
      closeLeaderboardModal,
      closePostGamePanel,
      handlePostGameLeaderboardOpen,
      handlePostGamePracticeStart
    },
  };
}

function bindEvents() {
  if (state.ui?.eventsBound) {
    return;
  }

  ensureUiState();

  if (!bindings) {
    throw new Error("Event bindings service is not initialized.");
  }

  bindings.bindAll();
  state.ui.eventsBound = true;
  publishBootSnapshot({ eventBinding: "complete" });
}

function handleAuthDisabled() {
  state.auth.ready = true;
  state.auth.enabled = false;
  state.auth.user = null;
  state.auth.syncing = false;
  renderPipeline.renderAuthState("disabled");
  publishBootSnapshot({ firebase: "disabled" });
}

function handleAuthInitialized(context = {}) {
  firebaseApp = context.app || null;
  firebaseAuth = context.auth || null;
  firebaseDb = context.db || null;

  state.auth.enabled = !!context.enabled;
  renderPipeline.renderAuthState("initialized");
  publishBootSnapshot({ firebase: "initialized" });
}

function handleAuthInitFailure(error) {
  console.error("Firebase init failed:", error);
  state.auth.ready = true;
  state.auth.enabled = false;
  state.auth.user = null;
  state.auth.syncing = false;
  renderPipeline.renderAuthState("init-failed");
  markLifecycleError("init-services", error, { service: "firebase-auth" });
}

function handleAuthStateSyncStart(user) {
  state.auth.user = user || null;
  state.auth.ready = true;
  state.auth.syncing = !!user;

  markLifecycleStage("auth-ready", {
    user: user
      ? {
        uid: user.uid,
        isAnonymous: !!user.isAnonymous,
      }
      : null,
  });

  renderPipeline.renderAuthState(user ? "syncing" : "anonymous-local");
  publishBootSnapshot({
    auth: user ? "syncing" : "anonymous-local",
  });
}

function handleAuthStateReady({ user, hadCloudProfile } = {}) {
  state.auth.user = user || null;
  state.auth.ready = true;
  state.auth.syncing = false;

  renderPipeline.renderAuthState("ready");
  publishBootSnapshot({
    auth: "ready",
    hadCloudProfile: !!hadCloudProfile,
  });
}

function handleAuthStateSyncError({ user, error } = {}) {
  console.error("Auth sync failed:", error);

  state.auth.user = user || null;
  state.auth.ready = true;
  state.auth.syncing = false;

  if (user?.isAnonymous) {
    setAuthStatus(`Playing anonymously as ${getPublicUserName(user)}`);
  } else {
    setAuthStatus("Signed in, cloud sync unavailable");
  }

  renderPipeline.renderAuthState("sync-error");
  markLifecycleError("auth-ready", error, {
    user: user
      ? {
        uid: user.uid,
        isAnonymous: !!user.isAnonymous,
      }
      : null,
  });
}

function handleAuthActionError(type, error) {
  console.error(`${type} failed:`, error);

  if (type === "sign-in") {
    setAuthStatus("Sign-in failed");
  }

  if (type === "sign-out") {
    setAuthStatus("Sign-out failed");
  }

  renderPipeline.renderAuthState(`${type}-error`);
  publishBootSnapshot({
    authAction: type,
    authError: error?.message || String(error),
  });
}

function initAuthLifecycle() {
  markLifecycleStage("init-services", { service: "firebase-auth" });

  authService = createAuthService({
    enabled: FIREBASE_ENABLED,
    config: FIREBASE_CONFIG,
    firebase: {
      initializeApp,
      getAuth,
      getFirestore,
      GoogleAuthProvider,
      onAuthStateChanged,
      signInAnonymously,
      signInWithPopup,
      signOut: firebaseSignOut,
      linkWithCredential,
      GoogleAuthProviderCredential: GoogleAuthProvider.credential,
    },
    hooks: {
      onDisabled: handleAuthDisabled,
      onInitialized: handleAuthInitialized,
      onInitFailure: handleAuthInitFailure,
      onAuthStateSyncStart: handleAuthStateSyncStart,
      onAuthStateReady: handleAuthStateReady,
      onAuthStateSyncError: handleAuthStateSyncError,
      onActionError: handleAuthActionError,
    },
    sync: {
      loadCloudDataToLocal,
      syncLocalDataToCloud,
    },
  });

  authUnsubscribe = authService.init();
}

function initGame() {
  markLifecycleStage("hydrate", { step: "progress-restore" });

  const restored = loadProgress(state.mode);

  if (!restored) {
    markLifecycleStage("puzzle-reset", { trigger: "boot", mode: state.mode });
    startPuzzle(state.mode);
    saveProgress();
  }

  renderPipeline.renderBootComplete({
    restored,
  });

  if (restored) {
    renderStatus("Progress restored.");
  }

  bindShareActions();
if (elements.shareBtn) {
  elements.shareBtn.textContent = "Share result";
}
if (elements.postGameCopyBtn) {
  elements.postGameCopyBtn.textContent = "Share result";
}

  publishBootSnapshot({
    progressRestored: restored,
    currentPuzzleId: state.currentPuzzle?.id || null,
  });
}

function startPuzzle(mode = state.mode) {
  state.mode = mode;
  applyModeTheme(mode);
  state.currentPuzzle = buildCurrentPuzzle(mode);
  state.guesses = [];
  state.status = "playing";

  const clueUiState = ensureClueUiState();
  clueUiState.lastUnlockedKeys = [];
  clueUiState.lastRenderSignature = "";

  syncEndStateVisibility();
  closePostGamePanel();
  resetInput();
  resetSuggestionsState();
  closeSuggestions();
  saveProgress();

  renderPipeline.renderPuzzleReset({
    mode,
    source: "startPuzzle",
  });

  publishBootSnapshot({
    action: "start-puzzle",
    mode,
    puzzleId: state.currentPuzzle?.id || null,
  });
}

function resetPuzzle(mode = state.mode) {
  markLifecycleStage("puzzle-reset", { mode });

  if (loadProgress(mode)) {
    const clueUiState = ensureClueUiState();
    clueUiState.lastUnlockedKeys = state.guesses
      .map((guess) => guess)
      .filter(Boolean)
      .length
      ? buildClueRevealState().items.filter((item) => item.unlocked).map((item) => item.key)
      : [];

    renderPipeline.renderPuzzleReset({
      mode,
      source: "resetPuzzle-restore",
    });

    publishBootSnapshot({
      action: "restore-puzzle",
      mode,
      puzzleId: state.currentPuzzle?.id || null,
    });

    return;
  }

  startPuzzle(mode);
  saveProgress();
  renderPipeline.renderPuzzleReset({
    mode,
    source: "resetPuzzle",
  });
}

function bindLifecycleEvents() {
  if (state.ui?.lifecycleEventsBound) {
    return;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopCountdownTimer();
      publishBootSnapshot({ visibility: "hidden" });
      return;
    }

    if (state.mode === "daily" && !isGameOver()) {
      startCountdownTimer();
    } else {
      updateCountdownLabel();
    }

    publishBootSnapshot({ visibility: "visible" });
  });

  ensureUiState();
  state.ui.lifecycleEventsBound = true;
}

async function bootstrapApplication() {
  ensureBootDebugSurface();

  appShell = createAppShell({
    name: "Bibdle",
    debug: BOOT_DEBUG,
    logger: bootLogger,
  });

  modalService = createModalService({
    registry: getModalRegistry(),
    onOpen: createModalCallbacks().onOpen,
    onClose: createModalCallbacks().onClose,
    onEscape: createModalCallbacks().onEscape,
    getTopmostModal,
  });

  renderPipeline = createRenderPipeline(createRenderPipelineApi());

  bindings = createBindings(createBindingsApi());

  const dependencies = {
    ...createStartupDependencies(),
    modalService,
    bindings,
    renderPipeline,
  };

  appShell.attachDependencies(dependencies);

  try {
    markLifecycleStage("hydrate", { step: "validate-boot" });

    const validation = validateBootRequirements();
    appShell.setValidation(validation);
    publishBootSnapshot({ validation });

    if (!validation.ok) {
      const message = [
        validation.missingRequired.length
          ? `Missing required DOM: ${validation.missingRequired.join(", ")}`
          : "",
        validation.contentIssues.length
          ? `Missing content: ${validation.contentIssues.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join(" | ");

      throw new Error(message || "Boot validation failed");
    }

    markLifecycleStage("hydrate", { step: "preferences" });
    loadPreferences();

    markLifecycleStage("hydrate", { step: "document-language" });
    applyLanguageToDocument();

    markLifecycleStage("hydrate", { step: "accessibility" });
    applyAccessibilityPreferences();

    markLifecycleStage("hydrate", { step: "stats" });
    loadStats();

    markLifecycleStage("hydrate", { step: "theme" });
    initTheme();

    markLifecycleStage("hydrate", { step: "controls" });
    renderPipeline.renderControls();
    renderPipeline.renderAuthState("pre-bind");

    markLifecycleStage("bind-events");
    bindEvents();
    bindLifecycleEvents();

    markLifecycleStage("init-services");
    initAuthLifecycle();

    markLifecycleStage("render");
    initGame();

    appShell.markReady();
    renderPipeline.renderBootComplete({
      restored: true,
      bootReady: true,
    });
    publishBootSnapshot({ boot: "ready" });
  } catch (error) {
    console.error("Bibdle boot failed:", error);
    markLifecycleError(appShell.getStage() || "boot", error);

    renderStatus("Bibdle could not finish booting. Check console diagnostics.");
    throw error;
  }
}

bootstrapApplication();