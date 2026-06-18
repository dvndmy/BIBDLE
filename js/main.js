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

import {books} from "./data/books.js";
import {verses} from "./data/verses.js";

import {
  createAppShell,
  createBootLogger,
  createBootStateSnapshot,
} from "./app/bootstrap.js";

import {createRenderPipeline} from "./core/dom/render-orchestrator.js";
import {createModalService} from "./core/dom/modal-controller.js";
import {createBindings} from "./core/dom/bindings-registry.js";
import {
  clearBusyState,
  escapeHtml,
  hasRenderableMarkup,
  hasTextContent,
  isNonEmptyArray,
  renderBusyInto,
  renderEmptyState,
  renderInto,
  renderLoadingBlock,
  renderRetryButtonMarkup,
  renderSurfaceEmptyState,
  renderSurfaceLoadingState,
  renderWhen,
  setHidden,
  showWhen,
  showWhenHasItems,
  showWhenHasText,
} from "./core/dom/ui-render-utils.js";

import {createAuthService} from "./core/auth/auth-client.js";

import {
  createModalHelpers,
  createPreferenceUpdater,
  createToggleHandler,
  renderPlacementCard,
} from "./shared/ui-refactor-helpers.js";

import {createGameTransitions} from "./shared/game-transitions.js";

import {
  computeModeStatsSummary as buildModeStatsSummary,
} from "./features/stats/stats-read-models.js";

import {
  computeArchiveSummary as buildArchiveSummary,
  formatArchiveAverage as formatArchiveAverageValue,
  buildArchiveBarsViewModel,
  buildArchiveGridViewModel,
  buildArchiveDetailsViewModel,
} from "./features/archive/archive-read-models.js";

import {
  clampAchievementProgress as clampAchievementProgressValue,
  getAchievementCategoryLabel as getAchievementCategoryLabelValue,
  getAchievementCategoryDescription as getAchievementCategoryDescriptionValue,
  getAchievementCategoryOrder as getAchievementCategoryOrderValue,
  getAchievementDescriptionForUi as getAchievementDescriptionForUiValue,
  formatAchievementProgressText as formatAchievementProgressTextValue,
  getAchievementStatusCopy as getAchievementStatusCopyValue,
  buildAchievementCardViewModel,
  getClosestIncompleteAchievements as getClosestIncompleteAchievementsValue,
  buildAchievementCategoryGroups,
} from "./features/achievements/achievement-read-models.js";

import {
  formatTriviaLabel as formatTriviaLabelValue,
  buildTriviaContent as buildTriviaContentValue,
  buildPostGameContent,
} from "./features/postgame/postgame-read-models.js";

import {createPuzzleSurface} from "./features/puzzle/puzzle-surface.js";
import {createStatsSurface} from "./features/stats/stats-surface.js";
import {createPostGameSurface} from "./features/postgame/postgame-surface.js";
import {createArchiveSurface} from "./features/archive/archive-surface.js";
import {createLeaderboardSurface} from "./features/leaderboard/leaderboard-surface.js";

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

let puzzleSurface = null;
let statsSurface = null;
let postGameSurface = null;
let archiveSurface = null;
let leaderboardSurface = null;
let gameTransitions = null;

const STATS_SCHEMA_VERSION = 2;

const ACHIEVEMENT_CATEGORIES = {
  streak: "streak",
  accuracy: "accuracy",
  bibleKnowledge: "bible-knowledge",
  rare: "rare",
};

const ACHIEVEMENT_GROUPS = {
  streak: "streak",
  accuracy: "accuracy",
  oldTestamentKnowledge: "old-testament-knowledge",
  newTestamentKnowledge: "new-testament-knowledge",
  rare: "rare",
  meta: "meta",
};

const BOOK_GROUP_KEYS = {
  PENTATEUCH: "pentateuch",
  HISTORICAL: "historical-books",
  WISDOM: "wisdom-books",
  MAJOR_PROPHETS: "major-prophets",
  MINOR_PROPHETS: "minor-prophets",
  GOSPELS: "gospels",
  PAULINE_EPISTLES: "pauline-epistles",
  GENERAL_EPISTLES: "general-epistles",
  OLD_TESTAMENT_ALL: "old-testament-all",
  NEW_TESTAMENT_ALL: "new-testament-all",
};

const ACHIEVEMENTS = [
  {
    id: "first-step",
    label: "First Step",
    category: ACHIEVEMENT_CATEGORIES.streak,
    group: ACHIEVEMENT_GROUPS.streak,
    family: "streak",
    description: "Get 1 verse correct.",
    kind: "total-correct",
    threshold: 1,
    imageKey: "first-step",
  },
  {
    id: "daily-bread",
    label: "Daily Bread",
    category: ACHIEVEMENT_CATEGORIES.streak,
    group: ACHIEVEMENT_GROUPS.streak,
    family: "streak",
    description: "Get 3 correct days in a row.",
    kind: "daily-streak",
    threshold: 3,
    imageKey: "daily-bread",
  },
  {
    id: "faithful-reader",
    label: "Faithful Reader",
    category: ACHIEVEMENT_CATEGORIES.streak,
    group: ACHIEVEMENT_GROUPS.streak,
    family: "streak",
    description: "Reach a 7-day streak.",
    kind: "daily-streak",
    threshold: 7,
    imageKey: "faithful-reader",
  },
  {
    id: "forty-days",
    label: "Forty Days in the Wilderness",
    category: ACHIEVEMENT_CATEGORIES.streak,
    group: ACHIEVEMENT_GROUPS.streak,
    family: "streak",
    description: "Reach a 40-day streak.",
    kind: "daily-streak",
    threshold: 40,
    imageKey: "forty-days",
  },
  {
    id: "year-of-wisdom",
    label: "Year of Wisdom",
    category: ACHIEVEMENT_CATEGORIES.streak,
    group: ACHIEVEMENT_GROUPS.streak,
    family: "streak",
    description: "Reach a 365-day streak.",
    kind: "daily-streak",
    threshold: 365,
    imageKey: "year-of-wisdom",
  },
  {
    id: "davids-aim",
    label: "David's Aim",
    category: ACHIEVEMENT_CATEGORIES.accuracy,
    group: ACHIEVEMENT_GROUPS.accuracy,
    family: "accuracy",
    description: "Guess the correct book on the first try.",
    kind: "first-try-total",
    threshold: 1,
    imageKey: "davids-aim",
  },
  {
    id: "sharp-as-a-sword",
    label: "Sharp as a Sword",
    category: ACHIEVEMENT_CATEGORIES.accuracy,
    group: ACHIEVEMENT_GROUPS.accuracy,
    family: "accuracy",
    description: "Get 5 first-try correct answers.",
    kind: "first-try-total",
    threshold: 5,
    imageKey: "sharp-as-a-sword",
  },
  {
    id: "prophet-level-accuracy",
    label: "Prophet-Level Accuracy",
    category: ACHIEVEMENT_CATEGORIES.accuracy,
    group: ACHIEVEMENT_GROUPS.accuracy,
    family: "accuracy",
    description: "Get 25 first-try correct answers.",
    kind: "first-try-total",
    threshold: 25,
    imageKey: "prophet-level-accuracy",
  },
  {
    id: "unshaken",
    label: "Unshaken",
    category: ACHIEVEMENT_CATEGORIES.accuracy,
    group: ACHIEVEMENT_GROUPS.accuracy,
    family: "accuracy",
    description: "Get 100 first-try correct answers.",
    kind: "first-try-total",
    threshold: 100,
    imageKey: "unshaken",
  },
  {
    id: "student-of-moses",
    label: "Student of Moses",
    category: ACHIEVEMENT_CATEGORIES.bibleKnowledge,
    group: ACHIEVEMENT_GROUPS.oldTestamentKnowledge,
    family: "knowledge",
    description: "Correctly identify verses from all five books of the Pentateuch.",
    kind: "book-group-complete",
    targetGroup: BOOK_GROUP_KEYS.PENTATEUCH,
    imageKey: "student-of-moses",
  },
  {
    id: "historian",
    label: "Historian",
    category: ACHIEVEMENT_CATEGORIES.bibleKnowledge,
    group: ACHIEVEMENT_GROUPS.oldTestamentKnowledge,
    family: "knowledge",
    description: "Correctly identify verses from all Historical Books.",
    kind: "book-group-complete",
    targetGroup: BOOK_GROUP_KEYS.HISTORICAL,
    imageKey: "historian",
  },
  {
    id: "poet",
    label: "Poet",
    category: ACHIEVEMENT_CATEGORIES.bibleKnowledge,
    group: ACHIEVEMENT_GROUPS.oldTestamentKnowledge,
    family: "knowledge",
    description: "Correctly identify verses from all Wisdom Books.",
    kind: "book-group-complete",
    targetGroup: BOOK_GROUP_KEYS.WISDOM,
    imageKey: "poet",
  },
  {
    id: "major-prophet",
    label: "Major Prophet",
    category: ACHIEVEMENT_CATEGORIES.bibleKnowledge,
    group: ACHIEVEMENT_GROUPS.oldTestamentKnowledge,
    family: "knowledge",
    description: "Correctly identify verses from all five Major Prophets.",
    kind: "book-group-complete",
    targetGroup: BOOK_GROUP_KEYS.MAJOR_PROPHETS,
    imageKey: "major-prophet",
  },
  {
    id: "minor-prophet",
    label: "Minor Prophet",
    category: ACHIEVEMENT_CATEGORIES.bibleKnowledge,
    group: ACHIEVEMENT_GROUPS.oldTestamentKnowledge,
    family: "knowledge",
    description: "Correctly identify verses from all twelve Minor Prophets.",
    kind: "book-group-complete",
    targetGroup: BOOK_GROUP_KEYS.MINOR_PROPHETS,
    imageKey: "minor-prophet",
  },
  {
    id: "gospel-expert",
    label: "Gospel Expert",
    category: ACHIEVEMENT_CATEGORIES.bibleKnowledge,
    group: ACHIEVEMENT_GROUPS.newTestamentKnowledge,
    family: "knowledge",
    description: "Correctly identify verses from all four Gospels.",
    kind: "book-group-complete",
    targetGroup: BOOK_GROUP_KEYS.GOSPELS,
    imageKey: "gospel-expert",
  },
  {
    id: "acts-specialist",
    label: "Acts Specialist",
    category: ACHIEVEMENT_CATEGORIES.bibleKnowledge,
    group: ACHIEVEMENT_GROUPS.newTestamentKnowledge,
    family: "knowledge",
    description: "Correctly identify 3 verses from the Book of Acts.",
    kind: "book-count",
    targetBookId: "acts",
    threshold: 3,
    imageKey: "acts-specialist",
  },
  {
    id: "pauls-apprentice",
    label: "Paul's Apprentice",
    category: ACHIEVEMENT_CATEGORIES.bibleKnowledge,
    group: ACHIEVEMENT_GROUPS.newTestamentKnowledge,
    family: "knowledge",
    description: "Correctly identify verses from all thirteen Pauline Epistles.",
    kind: "book-group-complete",
    targetGroup: BOOK_GROUP_KEYS.PAULINE_EPISTLES,
    imageKey: "pauls-apprentice",
  },
  {
    id: "general-epistle-scholar",
    label: "General Epistle Scholar",
    category: ACHIEVEMENT_CATEGORIES.bibleKnowledge,
    group: ACHIEVEMENT_GROUPS.newTestamentKnowledge,
    family: "knowledge",
    description: "Correctly identify verses from all seven General Epistles.",
    kind: "book-group-complete",
    targetGroup: BOOK_GROUP_KEYS.GENERAL_EPISTLES,
    imageKey: "general-epistle-scholar",
  },
  {
    id: "apocalypse-survivor",
    label: "Apocalypse Survivor",
    category: ACHIEVEMENT_CATEGORIES.bibleKnowledge,
    group: ACHIEVEMENT_GROUPS.newTestamentKnowledge,
    family: "knowledge",
    description: "Correctly identify 3 verses from Revelation.",
    kind: "book-count",
    targetBookId: "revelation",
    threshold: 3,
    imageKey: "apocalypse-survivor",
  },
  {
    id: "biblical-scholar",
    label: "Biblical Scholar",
    category: ACHIEVEMENT_CATEGORIES.rare,
    group: ACHIEVEMENT_GROUPS.meta,
    family: "rare",
    description: "Earn every Bible Knowledge achievement.",
    kind: "meta-knowledge-complete",
    imageKey: "biblical-scholar",
  },
  {
    id: "walking-encyclopedia",
    label: "Walking Encyclopedia",
    category: ACHIEVEMENT_CATEGORIES.rare,
    group: ACHIEVEMENT_GROUPS.rare,
    family: "rare",
    description: "Get 100 correct answers.",
    kind: "total-correct",
    threshold: 100,
    imageKey: "walking-encyclopedia",
  },
  {
    id: "inspired",
    label: "Inspired",
    category: ACHIEVEMENT_CATEGORIES.rare,
    group: ACHIEVEMENT_GROUPS.rare,
    family: "rare",
    description: "Get 10 first-try correct answers in a row.",
    kind: "consecutive-first-try",
    threshold: 10,
    imageKey: "inspired",
  },
  {
    id: "the-scribe",
    label: "The Scribe",
    category: ACHIEVEMENT_CATEGORIES.rare,
    group: ACHIEVEMENT_GROUPS.rare,
    family: "rare",
    description: "Get 500 correct answers.",
    kind: "total-correct",
    threshold: 500,
    imageKey: "the-scribe",
  },
  {
    id: "scholar-of-the-scriptures",
    label: "Scholar of the Scriptures",
    category: ACHIEVEMENT_CATEGORIES.rare,
    group: ACHIEVEMENT_GROUPS.rare,
    family: "rare",
    description: "Get 1,000 correct answers.",
    kind: "total-correct",
    threshold: 1000,
    imageKey: "scholar-of-the-scriptures",
  },
  {
    id: "covenant-keeper",
    label: "Covenant Keeper",
    category: ACHIEVEMENT_CATEGORIES.rare,
    group: ACHIEVEMENT_GROUPS.rare,
    family: "knowledge",
    description: "Correctly identify verses from every Old Testament book.",
    kind: "book-group-complete",
    targetGroup: BOOK_GROUP_KEYS.OLD_TESTAMENT_ALL,
    imageKey: "covenant-keeper",
  },
  {
    id: "witness-of-the-word",
    label: "Witness of the Word",
    category: ACHIEVEMENT_CATEGORIES.rare,
    group: ACHIEVEMENT_GROUPS.rare,
    family: "knowledge",
    description: "Correctly identify verses from every New Testament book.",
    kind: "book-group-complete",
    targetGroup: BOOK_GROUP_KEYS.NEW_TESTAMENT_ALL,
    imageKey: "witness-of-the-word",
  },
];

const ACHIEVEMENT_MAP = ACHIEVEMENTS.reduce((acc, achievement) => {
  acc[achievement.id] = achievement;
  return acc;
}, {});

const KNOWLEDGE_ACHIEVEMENT_IDS = ACHIEVEMENTS.filter(
  (achievement) => achievement.category === ACHIEVEMENT_CATEGORIES.bibleKnowledge,
).map((achievement) => achievement.id);

const LEGACY_STREAK_BADGE_ID_MAP = {
  "streak-1": "first-step",
  "streak-3": "daily-bread",
  "streak-7": "faithful-reader",
  "streak-40": "forty-days",
  "streak-365": "year-of-wisdom",
  firstStep: "first-step",
  dailyBread: "daily-bread",
  faithfulReader: "faithful-reader",
  fortyDays: "forty-days",
  yearOfWisdom: "year-of-wisdom",
  "first-step": "first-step",
  "daily-bread": "daily-bread",
  "faithful-reader": "faithful-reader",
  "forty-days": "forty-days",
  "year-of-wisdom": "year-of-wisdom",
};

const STREAK_BADGES = [
  { id: "first-step", label: "First Step", streak: 1 },
  { id: "daily-bread", label: "Daily Bread", streak: 3 },
  { id: "faithful-reader", label: "Faithful Reader", streak: 7 },
  { id: "forty-days", label: "Forty Days in the Wilderness", streak: 40 },
  { id: "year-of-wisdom", label: "Year of Wisdom", streak: 365 },
];

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
    version: 2,
    earned: {},
    counters: createDefaultAchievementCounters(),
    lastAwarded: [],
  };
}

function createDefaultStats() {
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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeNonNegativeInt(value, fallback = 0) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function sanitizeSerializableTimestamp(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

function sanitizeGuessDistribution(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const output = {};

  Object.entries(value).forEach(([key, count]) => {
    const safeCount = sanitizeNonNegativeInt(count, 0);
    if (safeCount > 0) {
      output[key] = safeCount;
    }
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

function normalizeBookIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getBookAchievementId(book) {
  if (!book) return "";
  return normalizeBookIdentifier(
    book.id || book.slug || book.key || getBookStatsKey?.(book) || book.name || book.book,
  );
}

function buildAchievementBookIndex() {
  const index = {};

  (Array.isArray(books) ? books : []).forEach((book) => {
    const id = getBookAchievementId(book);
    if (!id) return;
    index[id] = book;
  });

  return index;
}

function getAchievementBookIndex() {
  if (!state.ui) state.ui = {};
  if (!state.ui.achievementBookIndex) {
    state.ui.achievementBookIndex = buildAchievementBookIndex();
  }
  return state.ui.achievementBookIndex;
}

function getAchievementBookById(bookId) {
  return getAchievementBookIndex()[normalizeBookIdentifier(bookId)] || null;
}

function getBookSectionLabel(book) {
  return String(book?.section || book?.division || book?.category || "")
    .trim()
    .toLowerCase();
}

function isPaulineBook(book) {
  const id = getBookAchievementId(book);
  return [
    "romans",
    "1-corinthians",
    "2-corinthians",
    "galatians",
    "ephesians",
    "philippians",
    "colossians",
    "1-thessalonians",
    "2-thessalonians",
    "1-timothy",
    "2-timothy",
    "titus",
    "philemon",
  ].includes(id);
}

function isGeneralEpistleBook(book) {
  const id = getBookAchievementId(book);
  return [
    "hebrews",
    "james",
    "1-peter",
    "2-peter",
    "1-john",
    "2-john",
    "3-john",
    "jude",
  ].includes(id);
}

function isBookInGroup(book, groupKey) {
  if (!book) return false;

  const testament = String(book.testament || "")
    .trim()
    .toLowerCase();

  const section = getBookSectionLabel(book);
  const id = getBookAchievementId(book);

  const isOldTestament =
    testament === "old" || testament === "old testament";

  const isNewTestament =
    testament === "new" || testament === "new testament";

  switch (groupKey) {
    case BOOK_GROUP_KEYS.PENTATEUCH:
      return isOldTestament && section === "pentateuch";

    case BOOK_GROUP_KEYS.HISTORICAL:
      return isOldTestament && (
        section === "historical" ||
        section === "historical books" ||
        section === "history"
      );

    case BOOK_GROUP_KEYS.WISDOM:
      return isOldTestament && (
        section === "wisdom" ||
        section === "wisdom books" ||
        section === "poetry"
      );

    case BOOK_GROUP_KEYS.MAJOR_PROPHETS:
      return isOldTestament && (
        section === "major prophets" ||
        section === "major prophet"
      );

    case BOOK_GROUP_KEYS.MINOR_PROPHETS:
      return isOldTestament && (
        section === "minor prophets" ||
        section === "minor prophet"
      );

    case BOOK_GROUP_KEYS.GOSPELS:
      return isNewTestament && (
        section === "gospels" ||
        ["matthew", "mark", "luke", "john"].includes(id)
      );

    case BOOK_GROUP_KEYS.PAULINE_EPISTLES:
      return isNewTestament && isPaulineBook(book);

    case BOOK_GROUP_KEYS.GENERAL_EPISTLES:
      return isNewTestament && isGeneralEpistleBook(book);

    case BOOK_GROUP_KEYS.OLD_TESTAMENT_ALL:
      return isOldTestament;

    case BOOK_GROUP_KEYS.NEW_TESTAMENT_ALL:
      return isNewTestament;

    default:
      return false;
  }
}

function getBooksForAchievementGroup(groupKey) {
  return (Array.isArray(books) ? books : []).filter((book) =>
    isBookInGroup(book, groupKey),
  );
}

function getSolvedBookIds() {
  const bookStats = ensureStatsSchema().bookStats || {};
  const solvedIds = new Set();

  Object.entries(bookStats).forEach(([key, entry]) => {
    if ((entry?.solves || 0) > 0) {
      solvedIds.add(normalizeBookIdentifier(key));
    }
  });

  return solvedIds;
}

function getSolvedBookCount(bookId) {
  const stats = ensureStatsSchema();
  const normalizedId = normalizeBookIdentifier(bookId);
  const entry = stats.bookStats?.[normalizedId];
  return sanitizeNonNegativeInt(entry?.solves, 0);
}

function getAchievementProgressSnapshot() {
  const stats = ensureStatsSchema();
  const solvedBookIds = getSolvedBookIds();
  const solvedGroups = {};

  Object.values(BOOK_GROUP_KEYS).forEach((groupKey) => {
    const groupBookIds = getBooksForAchievementGroup(groupKey).map((book) =>
      getBookAchievementId(book),
    );
    solvedGroups[groupKey] = {
      total: groupBookIds.length,
      solved: groupBookIds.filter((id) => solvedBookIds.has(id)).length,
      solvedIds: groupBookIds.filter((id) => solvedBookIds.has(id)),
      requiredIds: groupBookIds,
    };
  });

  return {
    totalCorrect: stats.achievements.counters.totalCorrect || 0,
    dailyCorrect: stats.achievements.counters.dailyCorrect || 0,
    practiceCorrect: stats.achievements.counters.practiceCorrect || 0,
    firstTryCorrect: stats.achievements.counters.firstTryCorrect || 0,
    consecutiveFirstTryCorrect:
      stats.achievements.counters.consecutiveFirstTryCorrect || 0,
    currentDailyStreak: stats.daily.currentStreak || 0,
    solvedBookIds,
    solvedGroups,
    actsSolvedCount: getSolvedBookCount("acts"),
    revelationSolvedCount: getSolvedBookCount("revelation"),
  };
}

function sanitizeAchievementCounters(value) {
  const defaults = createDefaultAchievementCounters();
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    totalCorrect: sanitizeNonNegativeInt(source.totalCorrect, defaults.totalCorrect),
    dailyCorrect: sanitizeNonNegativeInt(source.dailyCorrect, defaults.dailyCorrect),
    practiceCorrect: sanitizeNonNegativeInt(source.practiceCorrect, defaults.practiceCorrect),
    firstTryCorrect: sanitizeNonNegativeInt(source.firstTryCorrect, defaults.firstTryCorrect),
    consecutiveFirstTryCorrect: sanitizeNonNegativeInt(
      source.consecutiveFirstTryCorrect,
      defaults.consecutiveFirstTryCorrect,
    ),
  };
}

function sanitizeAchievements(value) {
  const defaults = createDefaultAchievements();
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  const rawEarned =
    source.earned && typeof source.earned === "object" && !Array.isArray(source.earned)
      ? source.earned
      : {};

  const earned = Object.entries(rawEarned).reduce((acc, [id, entry]) => {
    const normalizedId = LEGACY_STREAK_BADGE_ID_MAP[id] || id;
    const achievement = ACHIEVEMENT_MAP[normalizedId];
    if (!achievement) return acc;

    const safeEntry =
      entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};

    acc[normalizedId] = {
      earnedAt: sanitizeSerializableTimestamp(safeEntry.earnedAt) || null,
      mode:
        safeEntry.mode === "daily" || safeEntry.mode === "practice"
          ? safeEntry.mode
          : null,
      source: typeof safeEntry.source === "string" ? safeEntry.source : null,
      context:
        safeEntry.context && typeof safeEntry.context === "object" && !Array.isArray(safeEntry.context)
          ? { ...safeEntry.context }
          : {},
    };

    return acc;
  }, {});

  const lastAwarded = Array.isArray(source.lastAwarded)
    ? source.lastAwarded
      .map((item) => {
        const normalizedId =
          LEGACY_STREAK_BADGE_ID_MAP[item?.id] || item?.id || null;
        const achievement = normalizedId ? ACHIEVEMENT_MAP[normalizedId] : null;
        if (!achievement) return null;

        return {
          id: normalizedId,
          earnedAt: sanitizeSerializableTimestamp(item.earnedAt) || null,
          mode:
            item.mode === "daily" || item.mode === "practice" ? item.mode : null,
          source: typeof item.source === "string" ? item.source : null,
          context:
            item.context && typeof item.context === "object" && !Array.isArray(item.context)
              ? { ...item.context }
              : {},
        };
      })
      .filter(Boolean)
    : [];

  return {
    ...source,
    version: sanitizeNonNegativeInt(source.version, defaults.version) || defaults.version,
    earned,
    counters: sanitizeAchievementCounters(source.counters),
    lastAwarded,
  };
}

function sanitizeDailyStats(value) {
  const defaults = createDefaultDailyStats();
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    ...defaults,
    ...source,
    played: sanitizeNonNegativeInt(source.played, defaults.played),
    won: sanitizeNonNegativeInt(source.won, defaults.won),
    lost: sanitizeNonNegativeInt(source.lost, defaults.lost),
    currentStreak: sanitizeNonNegativeInt(source.currentStreak, defaults.currentStreak),
    bestStreak: sanitizeNonNegativeInt(source.bestStreak, defaults.bestStreak),
    guessDistribution: sanitizeGuessDistribution(source.guessDistribution),
    lastDailySolvedDate:
      typeof source.lastDailySolvedDate === "string" || source.lastDailySolvedDate === null
        ? source.lastDailySolvedDate
        : defaults.lastDailySolvedDate,
    earnedBadges: sanitizeEarnedBadges(source.earnedBadges),
  };
}

function sanitizePracticeStats(value) {
  const defaults = createDefaultPracticeStats();
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    ...defaults,
    ...source,
    played: sanitizeNonNegativeInt(source.played, defaults.played),
    won: sanitizeNonNegativeInt(source.won, defaults.won),
    lost: sanitizeNonNegativeInt(source.lost, defaults.lost),
    guessDistribution: sanitizeGuessDistribution(source.guessDistribution),
  };
}

function normalizeStatsShape(saved) {
  const defaults = createDefaultStats();
  const source =
    saved && typeof saved === "object" && !Array.isArray(saved) ? deepClone(saved) : {};

  const hasNestedShape =
    source.daily &&
    typeof source.daily === "object" &&
    !Array.isArray(source.daily);

  const legacyDailySource = hasNestedShape ? source.daily : source;
  const legacyPracticeSource =
    source.practice && typeof source.practice === "object" && !Array.isArray(source.practice)
      ? source.practice
      : defaults.practice;

  const normalized = {
    ...defaults,
    ...source,
    version: STATS_SCHEMA_VERSION,
    daily: sanitizeDailyStats(legacyDailySource),
    practice: sanitizePracticeStats(legacyPracticeSource),
    bookStats: sanitizeBookStats(source.bookStats),
    achievements: sanitizeAchievements(source.achievements),
    meta: {
      ...(source.meta && typeof source.meta === "object" && !Array.isArray(source.meta)
        ? source.meta
        : defaults.meta),
      updatedAt: sanitizeSerializableTimestamp(source.meta?.updatedAt),
    },
  };

  const legacyEarnedBadges = [
    ...(Array.isArray(source.earnedBadges) ? source.earnedBadges : []),
    ...(Array.isArray(source.daily?.earnedBadges) ? source.daily.earnedBadges : []),
    ...(Array.isArray(normalized.daily.earnedBadges) ? normalized.daily.earnedBadges : []),
  ];

  legacyEarnedBadges.forEach((legacyId) => {
    const normalizedId = LEGACY_STREAK_BADGE_ID_MAP[legacyId];
    if (!normalizedId || normalized.achievements.earned[normalizedId]) return;

    normalized.achievements.earned[normalizedId] = {
      earnedAt: null,
      mode: "daily",
      source: "legacy-streak-badge",
      context: {},
    };
  });

  normalized.daily.earnedBadges = Array.from(
    new Set(
      Object.keys(normalized.achievements.earned)
        .filter((id) => ACHIEVEMENT_MAP[id]?.family === "streak")
        .concat(
          legacyEarnedBadges
            .map((legacyId) => LEGACY_STREAK_BADGE_ID_MAP[legacyId] || legacyId)
            .filter((id) => ACHIEVEMENT_MAP[id]?.family === "streak"),
        ),
    ),
  );

  normalized.achievements.version = 2;
  normalized.achievements.counters = sanitizeAchievementCounters(
    normalized.achievements.counters,
  );
  normalized.achievements.lastAwarded = Array.isArray(normalized.achievements.lastAwarded)
    ? normalized.achievements.lastAwarded
    : [];

  return normalized;
}

function touchStatsMeta(stats) {
  if (!stats.meta || typeof stats.meta !== "object" || Array.isArray(stats.meta)) {
    stats.meta = { updatedAt: null };
  }

  stats.meta.updatedAt = new Date().toISOString();
  stats.version = STATS_SCHEMA_VERSION;
  return stats;
}

function ensureStatsSchema() {
  state.stats = normalizeStatsShape(state.stats);
  return state.stats;
}

function syncLegacyBadgeFieldsFromAchievements() {
  const stats = ensureStatsSchema();
  stats.daily.earnedBadges = Array.from(
    new Set(
      Object.keys(stats.achievements.earned).filter(
        (id) => ACHIEVEMENT_MAP[id]?.family === "streak",
      ),
    ),
  );
}

function getAchievementById(id) {
  return ACHIEVEMENT_MAP[id] || null;
}

function getEarnedAchievementsMap() {
  return ensureStatsSchema().achievements.earned || {};
}

function hasEarnedAchievement(id) {
  return !!getEarnedAchievementsMap()[id];
}

function getAchievementImagePath(achievement) {
  const imageKey = achievement?.imageKey || achievement?.id;
  if (!imageKey) return "";
  return `assets/achievements/${imageKey}.png`;
}

function getEarnedAchievementIds() {
  return Object.keys(getEarnedAchievementsMap());
}

function getAchievementDefinitionList(ids = []) {
  return ids
    .map((id) => getAchievementById(id))
    .filter(Boolean);
}

function buildAchievementAwardRecord(achievement, context = {}) {
  return {
    earnedAt: new Date().toISOString(),
    mode: state.mode === "daily" || state.mode === "practice" ? state.mode : null,
    source: "achievement-engine",
    context: { ...context },
  };
}

function recordAchievementEarned(achievement, context = {}) {
  if (!achievement) return null;

  if (!state.stats || typeof state.stats !== "object") {
    state.stats = createDefaultStats();
  }

  if (!state.stats.achievements || typeof state.stats.achievements !== "object") {
    state.stats.achievements = createDefaultAchievements();
  }

  if (!state.stats.achievements.earned || typeof state.stats.achievements.earned !== "object") {
    state.stats.achievements.earned = {};
  }

  if (!Array.isArray(state.stats.achievements.lastAwarded)) {
    state.stats.achievements.lastAwarded = [];
  }

  if (state.stats.achievements.earned[achievement.id]) {
    return null;
  }

  const record = buildAchievementAwardRecord(achievement, context);
  state.stats.achievements.earned[achievement.id] = record;
  state.stats.achievements.lastAwarded.push({
    id: achievement.id,
    ...record,
  });

  syncLegacyBadgeFieldsFromAchievements();

  return {
    ...achievement,
    earned: true,
    ...record,
  };
}

function evaluateAchievementCompletion(achievement, snapshot) {
  if (!achievement) return { complete: false, progress: 0, target: 0, context: {} };

  switch (achievement.kind) {
    case "daily-streak": {
      const current = snapshot.currentDailyStreak || 0;
      const target = achievement.threshold || 0;
      return {
        complete: current >= target,
        progress: current,
        target,
        context: { streakLength: current },
      };
    }

    case "first-try-total": {
      const current = snapshot.firstTryCorrect || 0;
      const target = achievement.threshold || 0;
      return {
        complete: current >= target,
        progress: current,
        target,
        context: { firstTryCorrect: current },
      };
    }

    case "total-correct": {
      const current = snapshot.totalCorrect || 0;
      const target = achievement.threshold || 0;
      return {
        complete: current >= target,
        progress: current,
        target,
        context: { totalCorrect: current },
      };
    }

    case "consecutive-first-try": {
      const current = snapshot.consecutiveFirstTryCorrect || 0;
      const target = achievement.threshold || 0;
      return {
        complete: current >= target,
        progress: current,
        target,
        context: { consecutiveFirstTryCorrect: current },
      };
    }

    case "book-group-complete": {
      const group = snapshot.solvedGroups[achievement.targetGroup] || {
        solved: 0,
        total: 0,
        solvedIds: [],
        requiredIds: [],
      };

      return {
        complete: group.total > 0 && group.solved >= group.total,
        progress: group.solved,
        target: group.total,
        context: {
          group: achievement.targetGroup,
          solved: group.solved,
          total: group.total,
          solvedIds: group.solvedIds,
        },
      };
    }

    case "book-count": {
      const current =
        achievement.targetBookId === "acts"
          ? snapshot.actsSolvedCount
          : achievement.targetBookId === "revelation"
            ? snapshot.revelationSolvedCount
            : getSolvedBookCount(achievement.targetBookId);
      const target = achievement.threshold || 0;

      return {
        complete: current >= target,
        progress: current,
        target,
        context: {
          bookId: achievement.targetBookId,
          solves: current,
        },
      };
    }

    case "meta-knowledge-complete": {
      const earnedKnowledgeCount = KNOWLEDGE_ACHIEVEMENT_IDS.filter((id) =>
        hasEarnedAchievement(id),
      ).length;

      return {
        complete: earnedKnowledgeCount >= KNOWLEDGE_ACHIEVEMENT_IDS.length,
        progress: earnedKnowledgeCount,
        target: KNOWLEDGE_ACHIEVEMENT_IDS.length,
        context: {
          earnedKnowledgeCount,
          requiredKnowledgeCount: KNOWLEDGE_ACHIEVEMENT_IDS.length,
        },
      };
    }

    default:
      return { complete: false, progress: 0, target: 0, context: {} };
  }
}

function computeAchievementsToAward() {
  const snapshot = getAchievementProgressSnapshot();
  const newlyEarned = [];

  const orderedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
    if (a.family === b.family) {
      const aThreshold = Number.isFinite(a.threshold) ? a.threshold : Number.MAX_SAFE_INTEGER;
      const bThreshold = Number.isFinite(b.threshold) ? b.threshold : Number.MAX_SAFE_INTEGER;

      if (aThreshold !== bThreshold) {
        return aThreshold - bThreshold;
      }

      return a.label.localeCompare(b.label);
    }

    return a.family.localeCompare(b.family);
  });

  orderedAchievements.forEach((achievement) => {
    if (hasEarnedAchievement(achievement.id)) return;

    const evaluation = evaluateAchievementCompletion(achievement, snapshot);
    if (!evaluation.complete) return;

    const awarded = recordAchievementEarned(achievement, evaluation.context);
    if (awarded) {
      newlyEarned.push(awarded);
    }
  });

  if (newlyEarned.length) {
    syncLegacyBadgeFieldsFromAchievements();
  }

  return newlyEarned;
}

function getLastAwardedAchievements() {
  const stats = ensureStatsSchema();
  const list = Array.isArray(stats.achievements.lastAwarded)
    ? stats.achievements.lastAwarded
    : [];

  return list
    .map((item) => {
      const achievement = getAchievementById(item.id);
      if (!achievement) return null;
      return {
        ...achievement,
        earned: true,
        earnedAt: item.earnedAt || null,
        mode: item.mode || null,
        source: item.source || null,
        context:
          item.context && typeof item.context === "object" && !Array.isArray(item.context)
            ? { ...item.context }
            : {},
      };
    })
    .filter(Boolean);
}

function clearLastAwardedAchievements() {
  if (!state.stats || typeof state.stats !== "object") {
    state.stats = createDefaultStats();
  }

  if (!state.stats.achievements || typeof state.stats.achievements !== "object") {
    state.stats.achievements = createDefaultAchievements();
  }

  state.stats.achievements.lastAwarded = [];
}

function getNewlyEarnedAchievements(options = {}) {
  const family = options.family || null;
  const list = getLastAwardedAchievements();

  return family
    ? list.filter((achievement) => achievement.family === family)
    : list;
}

function getAchievementsByFamily(family) {
  return ACHIEVEMENTS.filter((achievement) => achievement.family === family);
}

function clampAchievementProgress(progress, target) {
  return clampAchievementProgressValue(progress, target);
}

function getAchievementEvaluation(achievement) {
  return evaluateAchievementCompletion(
    achievement,
    getAchievementProgressSnapshot(),
  );
}

function shouldTreatAchievementAsEarned(achievement, evaluation = null) {
  const computedEvaluation = evaluation || getAchievementEvaluation(achievement);
  return hasEarnedAchievement(achievement.id) || computedEvaluation.complete;
}

function getAchievementStatusCopy(achievement, evaluation = null) {
  return getAchievementStatusCopyValue({
    achievement,
    evaluation: evaluation || getAchievementEvaluation(achievement),
    shouldTreatAchievementAsEarned,
  });
}

function getAchievementDescriptionForUi(achievement) {
  return getAchievementDescriptionForUiValue(achievement);
}

function formatAchievementProgressText(achievement, evaluation) {
  return formatAchievementProgressTextValue(
    achievement,
    evaluation,
    getAchievementBookById,
  );
}

function buildAchievementCardMarkup(achievement, options = {}) {
  if (!achievement) return "";

  const evaluation = options.evaluation || getAchievementEvaluation(achievement);
  const isEarned =
    options.isEarned === true ||
    shouldTreatAchievementAsEarned(achievement, evaluation);

  const title = options.title || achievement.label || "";
  const description =
    options.description || getAchievementDescriptionForUi(achievement);
  const progressText =
    options.progressText || formatAchievementProgressText(achievement, evaluation);
  const status =
    options.status || getAchievementStatusCopy(achievement, evaluation);

  const viewModel = buildAchievementCardViewModel(achievement, {
    evaluation,
    isEarned,
    title,
    description,
    progressText,
    status,
  });

  const imagePath = getAchievementImagePath(achievement);

  return `
    <article class="achievement-card ${viewModel.isEarned ? "is-earned" : "is-locked"
    }" ${viewModel.isEarned ? "" : 'aria-disabled="true"'}>
      <div class="achievement-card__media" aria-hidden="true">
        ${imagePath
      ? `<img class="achievement-card__image" src="${escapeHtml(imagePath)}" alt="">`
      : '<div class="achievement-card__media-slot">Badge image</div>'
    }
      </div>
      <div class="achievement-card__content">
        <h3 class="achievement-card__title">${escapeHtml(viewModel.title)}</h3>
        ${description
      ? `<p class="achievement-card__description">${escapeHtml(viewModel.description)}</p>`
      : ""
    }
        ${progressText
      ? `<p class="achievement-card__progress-text">${escapeHtml(viewModel.progressText)}</p>`
      : ""
    }
        <div class="achievement-card__status" aria-label="${escapeHtml(
      viewModel.status.label,
    )}">
          <span class="achievement-card__status-icon" aria-hidden="true">${escapeHtml(
      viewModel.status.icon,
    )}</span>
          <span class="achievement-card__status-text">${escapeHtml(
      viewModel.status.label,
    )}</span>
        </div>
      </div>
      <div class="achievement-card__progress">
        <div
          class="achievement-progress__track"
          role="progressbar"
          aria-label="${escapeHtml(viewModel.progressLabel)}"
          aria-valuemin="0"
          aria-valuenow="${viewModel.ariaValueNow}"
          aria-valuemax="${viewModel.progressState.target > 0
      ? viewModel.progressState.target
      : Math.max(viewModel.progressState.progress, 1)
    }"
        >
          <span
            class="achievement-progress__fill"
            style="width: ${viewModel.progressState.percent}%"
          ></span>
        </div>
      </div>
    </article>
  `;
}

function getClosestIncompleteAchievements(limit = 3) {
  return getClosestIncompleteAchievementsValue(ACHIEVEMENTS, {
    limit,
    getAchievementEvaluation,
    shouldTreatAchievementAsEarned,
  });
}

function getAchievementCategoryLabel(category) {
  return getAchievementCategoryLabelValue(category, ACHIEVEMENT_CATEGORIES);
}

function getAchievementCategoryDescription(category) {
  return getAchievementCategoryDescriptionValue(category, ACHIEVEMENT_CATEGORIES);
}

function getAchievementCategoryOrder(category) {
  return getAchievementCategoryOrderValue(category, ACHIEVEMENT_CATEGORIES);
}

function compareAchievementsForStatsModal(a, b) {
  const aEarned = shouldTreatAchievementAsEarned(a, getAchievementEvaluation(a));
  const bEarned = shouldTreatAchievementAsEarned(b, getAchievementEvaluation(b));

  if (aEarned !== bEarned) return aEarned ? -1 : 1;

  const aThreshold = Number.isFinite(a.threshold)
    ? a.threshold
    : Number.MAX_SAFE_INTEGER;
  const bThreshold = Number.isFinite(b.threshold)
    ? b.threshold
    : Number.MAX_SAFE_INTEGER;

  if (aThreshold !== bThreshold) return aThreshold - bThreshold;

  return a.label.localeCompare(b.label);
}

function buildAchievementCategoryGroupMarkup(category, achievements) {
  if (!isNonEmptyArray(achievements)) return "";

  const title = getAchievementCategoryLabel(category);
  const description = getAchievementCategoryDescription(category);

  const cardsMarkup = achievements
    .sort(compareAchievementsForStatsModal)
    .map((achievement) =>
      buildAchievementCardMarkup(achievement, {
        evaluation: getAchievementEvaluation(achievement),
      }),
    )
    .join("");

  return `
    <section class="achievement-group" aria-labelledby="achievement-group-${escapeHtml(
    category,
  )}">
      <div class="achievement-group__header">
        <h3 class="achievement-group__title" id="achievement-group-${escapeHtml(
    category,
  )}">${escapeHtml(title)}</h3>
        ${description ? `<p class="achievement-group__meta">${escapeHtml(description)}</p>` : ""}
      </div>
      <div class="achievement-group__list">
        ${cardsMarkup}
      </div>
    </section>
  `;
}

function reconcileAchievementsWithStats() {
  const stats = ensureStatsSchema();
  const reconciledEarned = {
    ...(stats.achievements?.earned && typeof stats.achievements.earned === "object"
      ? stats.achievements.earned
      : {}),
  };

  const awardedIds = [];

  const orderedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
    if (a.family === b.family) {
      const aThreshold = Number.isFinite(a.threshold) ? a.threshold : Number.MAX_SAFE_INTEGER;
      const bThreshold = Number.isFinite(b.threshold) ? b.threshold : Number.MAX_SAFE_INTEGER;

      if (aThreshold !== bThreshold) {
        return aThreshold - bThreshold;
      }

      return a.label.localeCompare(b.label);
    }

    return a.family.localeCompare(b.family);
  });

  orderedAchievements.forEach((achievement) => {
    const evaluation = evaluateAchievementCompletion(achievement, getAchievementProgressSnapshot());

    if (!evaluation.complete) {
      return;
    }

    if (!reconciledEarned[achievement.id]) {
      reconciledEarned[achievement.id] = {
        earnedAt: new Date().toISOString(),
        mode: null,
        source: "achievement-reconcile",
        context: { ...evaluation.context },
      };
      awardedIds.push(achievement.id);
    }
  });

  stats.achievements.earned = reconciledEarned;
  syncLegacyBadgeFieldsFromAchievements();

  return awardedIds;
}

function getEarnedBadgeIds() {
  return getEarnedAchievementIds().filter(
    (id) => getAchievementById(id)?.family === "streak",
  );
}

function awardStreakBadges() {
  return computeAchievementsToAward().filter(
    (achievement) => achievement.family === "streak",
  );
}

function computeNewlyEarnedBadges() {
  return getNewlyEarnedAchievements({ family: "streak" }).map(toLegacyBadgeShape);
}

function toLegacyBadgeShape(achievement) {
  return {
    id: achievement.id,
    label: achievement.label,
    earned: true,
  };
}

function updateAchievementCountersForCompletion(outcome, mode, guessCount) {
  const stats = ensureStatsSchema();
  const counters = stats.achievements.counters;
  const isWin = outcome === "won";
  const isFirstTryWin = isWin && guessCount === 1;

  if (isWin) {
    counters.totalCorrect += 1;

    if (mode === "daily") {
      counters.dailyCorrect += 1;
    } else if (mode === "practice") {
      counters.practiceCorrect += 1;
    }

    if (isFirstTryWin) {
      counters.firstTryCorrect += 1;
      counters.consecutiveFirstTryCorrect += 1;
    } else {
      counters.consecutiveFirstTryCorrect = 0;
    }

    return;
  }

  if (outcome === "lost") {
    counters.consecutiveFirstTryCorrect = 0;
  }
}

function canUseClipboardWrite() {
  return !!navigator.clipboard?.writeText && !!window.isSecureContext;
}

async function copyTextToClipboard(text) {
  if (!canUseClipboardWrite()) {
    throw new Error("clipboard-unavailable");
  }

  await navigator.clipboard.writeText(text);
}

function getShareUrl() {
  return "https://dvndmy.github.io/BIBDLE";
}

function getSharePayload() {
  const text = buildShareText();
  return {
    title: "Catholic Bibdle",
    text,
  };
}

function canUseNativeShare(payload = getSharePayload()) {
  if (typeof navigator.share !== "function") {
    return false;
  }

  if (typeof navigator.canShare === "function") {
    try {
      return navigator.canShare({
        title: payload.title,
        text: payload.text,
      });
    } catch {
      return false;
    }
  }

  return true;
}

function bindShareActions() {
  if (state.ui?.shareActionsBound) {
    return;
  }

  if (elements.shareBtn) {
    elements.shareBtn.addEventListener("click", shareResult);
  }

  if (elements.copyBtn) {
    elements.copyBtn.addEventListener("click", copyResult);
  }

  if (elements.postGameShareBtn) {
    elements.postGameShareBtn.addEventListener("click", shareResult);
  }

  if (elements.postGameCopyOnlyBtn) {
    elements.postGameCopyOnlyBtn.addEventListener("click", copyResult);
  }

  if (
    elements.postGameCopyBtn &&
    !elements.postGameShareBtn &&
    !elements.postGameCopyOnlyBtn
  ) {
    elements.postGameCopyBtn.addEventListener("click", shareResult);
  }

  state.ui.shareActionsBound = true;
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
  stats: createDefaultStats(),
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
  copyBtn: document.getElementById("copyBtn"),
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
  statsModalAchievements: document.getElementById("statsModalAchievements"),
  postGameNewAchievementsSection: document.getElementById("postGameNewAchievementsSection"),
  postGameNewAchievements: document.getElementById("postGameNewAchievements"),
  postGameClosestAchievementsSection: document.getElementById("postGameClosestAchievementsSection"),
  postGameClosestAchievements: document.getElementById("postGameClosestAchievements"),
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
  postGameShareBtn: document.getElementById("postGameShareBtn"),
  postGameCopyOnlyBtn: document.getElementById("postGameCopyOnlyBtn"),
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
    renderPuzzleView: (...args) => puzzleSurface?.renderPuzzleView?.(...args),
    renderStatsModal: (...args) => statsSurface?.renderStatsModal?.(...args),
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

const LOCALIZED_FIELD_MAP = {
  bookName: { en: "name", ml: "nameMl" },
  testament: { en: "testament", ml: "testamentMl" },
  section: { en: "section", ml: "sectionMl" },
  bookIntroTitle: { en: "bookIntroTitle", ml: "bookIntroTitleMl" },
  bookIntroText: { en: "bookIntroText", ml: "bookIntroTextMl" },
  reference: { en: "reference", ml: "referenceMl" },
  verseText: { en: "text", ml: "textMl" },
  clue: { en: "clue", ml: "clueMl" },
  explanation: { en: "explanation", ml: "explanationMl" },
};

function getLocalizedFieldValue(item, fieldKey, language = getCurrentLanguage()) {
  if (!item) return "";

  const fieldConfig = LOCALIZED_FIELD_MAP[fieldKey];
  if (!fieldConfig) return "";

  const requestedLanguage = language === "ml" ? "ml" : "en";
  const fallbackLanguage = requestedLanguage === "ml" ? "en" : "ml";

  return getLocalizedValue(
    item[fieldConfig[requestedLanguage]],
    item[fieldConfig[fallbackLanguage]]
  );
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

function buildBookLookupIndex() {
  const byId = new Map();
  const byNormalizedName = new Map();
  const aliasesByBookId = new Map();

  if (!Array.isArray(books) || !books.length) {
    return {
      byId,
      byNormalizedName,
      aliasesByBookId,
    };
  }

  books.forEach((book) => {
    if (!book?.id) {
      return;
    }

    byId.set(book.id, book);

    const aliases = [];
    const seenAliases = new Set();

    const addAlias = (label, source) => {
      const value = getSafeString(label);
      const normalized = normalizeBookName(value);

      if (!value || !normalized || seenAliases.has(normalized)) {
        return;
      }

      const alias = {
        value,
        normalized,
        source,
        bookId: book.id,
      };

      seenAliases.add(normalized);
      aliases.push(alias);

      if (!byNormalizedName.has(normalized)) {
        byNormalizedName.set(normalized, book);
      }
    };

    addAlias(book.normalizedName, 'normalized');
    addAlias(book.name, 'en');
    addAlias(book.nameMl, 'ml');

    aliasesByBookId.set(book.id, aliases);
  });

  return {
    byId,
    byNormalizedName,
    aliasesByBookId,
  };
}

function getBookLookupIndex() {
  if (!state.ui) {
    state.ui = {};
  }

  if (!state.ui.bookLookupIndex) {
    state.ui.bookLookupIndex = buildBookLookupIndex();
  }

  return state.ui.bookLookupIndex;
}

function getLocalizedBookName(book, language = getCurrentLanguage()) {
  return getLocalizedFieldValue(book, "bookName", language);
}

function getLocalizedTestament(book, language = getCurrentLanguage()) {
  return getLocalizedFieldValue(book, "testament", language);
}

function getLocalizedSection(book, language = getCurrentLanguage()) {
  return getLocalizedFieldValue(book, "section", language);
}

function getLocalizedBookIntroTitle(book, language = getCurrentLanguage()) {
  return getLocalizedFieldValue(book, "bookIntroTitle", language);
}

function getLocalizedBookIntroText(book, language = getCurrentLanguage()) {
  return getLocalizedFieldValue(book, "bookIntroText", language);
}

function getLocalizedReference(verse, language = getCurrentLanguage()) {
  return getLocalizedFieldValue(verse, "reference", language);
}

function getLocalizedVerseText(verse, language = getCurrentLanguage()) {
  return getLocalizedFieldValue(verse, "verseText", language);
}

function getLocalizedClue(verse, language = getCurrentLanguage()) {
  return getLocalizedFieldValue(verse, "clue", language);
}

function getLocalizedExplanation(verse, language = getCurrentLanguage()) {
  return getLocalizedFieldValue(verse, "explanation", language);
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
  if (!book?.id) {
    return [];
  }

  const { aliasesByBookId } = getBookLookupIndex();
  return aliasesByBookId.get(book.id) ?? [];
}

function getBookById(bookId) {
  if (!bookId) {
    return null;
  }

  const { byId } = getBookLookupIndex();
  return byId.get(bookId) ?? null;
}

function getCanonicalBookId(input) {
  if (!input) {
    return '';
  }

  if (typeof input === 'object' && input.id) {
    return input.id;
  }

  const byName = getBookByName(input);
  return byName?.id ?? '';
}

function getBookByName(name) {
  const normalized = normalizeBookName(name);
  if (!normalized) {
    return null;
  }

  const { byNormalizedName } = getBookLookupIndex();
  return byNormalizedName.get(normalized) ?? null;
}

function isBookAlreadyGuessed(bookId) {
  return state.guesses.some((guess) => guess.bookId === bookId);
}

function getSuggestionCandidates(query, language = getCurrentLanguage()) {
  const normalizedQuery = normalizeBookName(query);
  if (!normalizedQuery) {
    return [];
  }

  const { aliasesByBookId } = getBookLookupIndex();
  const ranked = [];

  books.forEach((book) => {
    if (!book?.id || isBookAlreadyGuessed(book.id)) {
      return;
    }

    const aliases = aliasesByBookId.get(book.id) ?? [];
    const matchingAliases = aliases.filter((alias) =>
      alias.normalized.includes(normalizedQuery)
    );

    if (!matchingAliases.length) {
      return;
    }

    const exactMatch = matchingAliases.some(
      (alias) => alias.normalized === normalizedQuery
    );
    const startsWithMatch = matchingAliases.some((alias) =>
      alias.normalized.startsWith(normalizedQuery)
    );
    const matchedMl = matchingAliases.some((alias) => alias.source === 'ml');
    const matchedEn = matchingAliases.some(
      (alias) => alias.source === 'en' || alias.source === 'normalized'
    );

    if (language === 'en') {
      if (!matchedEn) {
        return;
      }

      ranked.push({
        bookId: book.id,
        primaryLabel: getLocalizedBookName(book, 'en'),
        secondaryLabel: '',
        matchSource: 'en',
        score: exactMatch ? 0 : startsWithMatch ? 1 : 2,
      });

      return;
    }

    ranked.push({
      bookId: book.id,
      primaryLabel: getLocalizedBookName(book, 'ml'),
      secondaryLabel:
        getLocalizedBookName(book, 'ml') !== getLocalizedBookName(book, 'en')
          ? getLocalizedBookName(book, 'en')
          : '',
      matchSource: matchedMl ? 'ml' : 'en',
      score: exactMatch ? 0 : startsWithMatch ? 1 : 2,
    });
  });

  return ranked
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }

      if (language === 'ml' && a.matchSource !== b.matchSource) {
        return a.matchSource === 'ml' ? -1 : 1;
      }

      return a.primaryLabel.localeCompare(
        b.primaryLabel,
        language === 'ml' ? 'ml' : 'en'
      );
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
  const local = normalizeStatsShape(localStats);
  const cloud = normalizeStatsShape(cloudStats);

  const localDaily = local.daily || {};
  const cloudDaily = cloud.daily || {};
  const localPractice = local.practice || {};
  const cloudPractice = cloud.practice || {};
  const localAchievements = local.achievements || {};
  const cloudAchievements = cloud.achievements || {};
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
    bookStats: mergeBookStatsMap(local.bookStats, cloud.bookStats),
    achievements: {
      ...localAchievements,
      ...cloudAchievements,
      earned: {
        ...(localAchievements.earned && typeof localAchievements.earned === "object"
          ? localAchievements.earned
          : {}),
        ...(cloudAchievements.earned && typeof cloudAchievements.earned === "object"
          ? cloudAchievements.earned
          : {}),
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
      updatedAt:
        [local.meta?.updatedAt, cloud.meta?.updatedAt]
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
    return { rank: null, ...entry };
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

    const match = rankedDocs.find((doc) => doc.uid === uid || doc.id === uid);

    if (match) return { ...entry, rank: match.rank };
  } catch (error) {
    console.error("Rank derivation failed", error);
  }

  return { rank: null, ...entry };
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

function renderAfterAuthStateChange(reason = "auth-state-change") {
  renderPipeline.renderSyncState(reason);
  renderPipeline.renderPuzzleSurface(reason);
  renderPipeline.renderStatsSurface(reason);
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

async function ensureLeaderboardViewerUser() {
  if (!state.auth.enabled || !firebaseAuth) return null;

  const existingUser = state.auth.user ?? firebaseAuth.currentUser ?? null;
  if (existingUser?.uid) {
    return existingUser;
  }

  try {
    const credential = await signInAnonymously(firebaseAuth);
    const user = credential?.user ?? firebaseAuth.currentUser ?? null;

    if (user?.uid) {
      state.auth.user = user;
      state.auth.ready = true;
      return user;
    }

    return null;
  } catch (error) {
    console.error("Anonymous sign-in for leaderboard failed", error);
    return null;
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
  const normalized = touchStatsMeta(ensureStatsSchema());

  const payload = {
    version: normalized.version,
    daily: {
      played: normalized.daily.played,
      won: normalized.daily.won,
      lost: normalized.daily.lost,
      currentStreak: normalized.daily.currentStreak,
      bestStreak: normalized.daily.bestStreak,
      guessDistribution: normalized.daily.guessDistribution,
      lastDailySolvedDate: normalized.daily.lastDailySolvedDate,
      earnedBadges: Array.isArray(normalized.daily.earnedBadges)
        ? normalized.daily.earnedBadges
        : [],
    },
    practice: {
      played: normalized.practice.played,
      won: normalized.practice.won,
      lost: normalized.practice.lost,
      guessDistribution: normalized.practice.guessDistribution,
    },
    bookStats:
      normalized.bookStats &&
        typeof normalized.bookStats === "object" &&
        !Array.isArray(normalized.bookStats)
        ? normalized.bookStats
        : {},
    achievements: sanitizeAchievements(normalized.achievements),
    meta: {
      updatedAt: normalized.meta?.updatedAt || null,
    },
  };

  try {
    localStorage.setItem(CONFIG.storageKeys.stats, JSON.stringify(payload));
  } catch { }

  syncCurrentStateToCloudIfSignedIn();
}

function loadStats() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKeys.stats);

    if (!raw) {
      state.stats = createDefaultStats();
      reconcileAchievementsWithStats();
      return;
    }

    const saved = JSON.parse(raw);
    state.stats = normalizeStatsShape(saved);
    reconcileAchievementsWithStats();
  } catch {
    state.stats = createDefaultStats();
    reconcileAchievementsWithStats();
  }
}

function hasRecordedDailyResult(date) {
  return state.stats.daily.lastDailySolvedDate === date;
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

  ensureStatsSchema();
  clearLastAwardedAchievements();

  const mode = state.currentPuzzle.mode;
  const guessCount = state.guesses.length;

  if (mode === "daily") {
    const completionDate = state.currentPuzzle.date;
    if (completionDate && hasRecordedDailyResult(completionDate)) return;

    state.stats.daily.played += 1;

    if (outcome === "won") {
      state.stats.daily.won += 1;

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
    } else if (outcome === "lost") {
      state.stats.daily.lost += 1;

      if (completionDate) {
        state.stats.daily.currentStreak = 0;
        state.stats.daily.lastDailySolvedDate = completionDate;
      }
    }

    updateAchievementCountersForCompletion(outcome, "daily", guessCount);
    updateBookStats(outcome);

    if (outcome === "won") {
      computeAchievementsToAward();
    }

    syncLegacyBadgeFieldsFromAchievements();
    saveStats();

    await submitDailyResultToLeaderboard({
      result: outcome,
      guesses: outcome === "won" ? guessCount : null,
      dateKey: completionDate || getDailyDateKey(),
      puzzleId: getDailyPuzzleId(),
    });

    return;
  }

  if (mode === "practice") {
    state.stats.practice.played += 1;

    if (outcome === "won") {
      state.stats.practice.won += 1;

      state.stats.practice.guessDistribution[guessCount] =
        (state.stats.practice.guessDistribution[guessCount] ?? 0) + 1;
    } else if (outcome === "lost") {
      state.stats.practice.lost += 1;
    }

    updateAchievementCountersForCompletion(outcome, "practice", guessCount);

    if (outcome === "won") {
      updateBookStats(outcome);
      computeAchievementsToAward();
    }

    syncLegacyBadgeFieldsFromAchievements();
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




function renderStatus(message = "Guess the book from the verse above.") {
  elements.statusLine.textContent = message;
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
        postGameSurface.loadPostGameLeaderboardRank();
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

function computeModeStatsSummary(mode = "daily") {
  return buildModeStatsSummary(state.stats, mode, 8);
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

function renderStatsSection(stats, container) {
  if (!container) return;

  const distribution = stats?.guessDistribution || {};
  const attempts = Array.from({ length: 8 }, (_, index) => {
    const attempt = index + 1;
    return {
      attempt,
      count: Number(distribution[attempt] || distribution[String(attempt)] || 0),
    };
  });

  const maxCount = attempts.reduce((max, entry) => Math.max(max, entry.count), 0);

  const markup = attempts
    .map(({ attempt, count }) => {
      const widthPercent =
        maxCount > 0 && count > 0 ? Math.max((count / maxCount) * 100, 8) : 0;

      return `
        <div class="guess-distribution-row">
          <div class="guess-distribution-label">${attempt}</div>
          <div class="guess-distribution-bar-wrap">
            <div class="guess-distribution-bar">
              <div
                class="guess-distribution-bar-fill"
                style="width: ${widthPercent}%"
                aria-hidden="true"
              ></div>
            </div>
            <div class="guess-distribution-value">${count}</div>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = markup;
  container.hidden = false;
  container.removeAttribute("aria-hidden");
  container.style.display = "block";
  container.style.visibility = "visible";
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
    }, bindEmptyStateActions);
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
  return formatTriviaLabelValue(value);
}

function buildTriviaContent(puzzle, book) {
  return buildTriviaContentValue(puzzle, book, {
    language: getCurrentLanguage(),
    getLocalizedThemes,
    getLocalizedTestament,
    getLocalizedSection,
    getLocalizedBookName,
    getLocalizedValue,
    getLocalizedClue,
    getLocalizedBookIntroTitle,
    getLocalizedExplanation,
  });
}

function renderTriviaSection(content) {
  const {
    postGameTriviaSection,
    postGameTriviaTitle,
    postGameTriviaText,
    postGameTriviaChips,
  } = elements;

  if (!postGameTriviaSection || !postGameTriviaTitle || !postGameTriviaText || !postGameTriviaChips) return;

  const hasTitle = hasTextContent(content?.title);
  const hasText = hasTextContent(content?.text);
  const hasChips = isNonEmptyArray(content?.chips);
  const hasTrivia = hasTitle || hasText || hasChips;

  showWhen(postGameTriviaSection, true);

  if (!hasTrivia) {
    postGameTriviaTitle.textContent = 'Book trivia';
    postGameTriviaText.textContent = '';

    renderSurfaceEmptyState(postGameTriviaChips, {
      title: 'No trivia available',
      body: 'This book does not have extra trivia to show yet.',
      compact: true,
      showMarker: true,
      tone: 'empty',
    });
    return;
  }

  postGameTriviaTitle.textContent = content.title || 'Learn more';
  postGameTriviaText.textContent = content.text || '';

  const chipsMarkup = content.chips
    .map((chip) => `<span class="postgame-chip ui-chip">${escapeHtml(chip)}</span>`)
    .join('');

  if (chipsMarkup) {
    renderWhen(postGameTriviaChips, true, chipsMarkup);
    return;
  }

  renderSurfaceEmptyState(postGameTriviaChips, {
    title: 'No extra trivia points',
    body: 'There is a short summary for this book, but no additional trivia tags yet.',
    compact: true,
    showMarker: true,
    tone: 'empty',
  });
}

function getPostGameContent() {
  return buildPostGameContent({
    state,
    getCurrentLanguage,
    getBookByName,
    helpers: {
      getLocalizedReference,
      getLocalizedBookName,
      getLocalizedValue,
      getLocalizedVerseText,
      getLocalizedExplanation,
      getLocalizedBookIntroTitle,
      getLocalizedBookIntroText,
      getLocalizedThemes,
      getLocalizedTestament,
      getLocalizedSection,
      getLocalizedClue,
    },
  });
}

function computeArchiveSummary() {
  return buildArchiveSummary({
    books,
    getBookStats,
    getLocalizedTestament,
    getLocalizedSection,
    language: getCurrentLanguage(),
  });
}

function formatArchiveAverage(totalAttempts, solveCount) {
  return formatArchiveAverageValue(totalAttempts, solveCount);
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
  postGameSurface?.closePostGamePanel?.();
  openLeaderboardModal(trigger);
}

function handlePostGamePracticeStart() {
  resetPuzzle("practice");
}

function closeLeaderboardModal() {
  modalHelpers.closeModal("leaderboard");
}

function openArchiveModal(trigger = document.activeElement) {
  if (!elements.archiveModal) return;

  const selectedBook = books.find((book) => {
    const entry = getBookStats(book);
    return entry && entry.plays > 0;
  }) ?? null;

  const selectedKey = selectedBook ? getBookStatsKey(selectedBook) : null;
  archiveSurface.renderArchiveSummary();
  archiveSurface.renderArchiveGrid(selectedKey);
  archiveSurface.renderArchiveDetails(selectedKey);

  modalHelpers.openModal("archive", { trigger });
}

function closeArchiveModal() {
  modalHelpers.closeModal("archive");
}

async function openLeaderboardModal(trigger = document.activeElement) {
  if (!elements.leaderboardModal) return;

  modalHelpers.openModal("leaderboard", { trigger });
  await leaderboardSurface.loadLeaderboard();
}


function getDailyStreakBadges() {
  return STREAK_BADGES.map((badge) => ({
    ...badge,
    earned: hasEarnedAchievement(badge.id),
  }));
}

function renderPostGameBadges(container, achievements) {
  if (!container) return;

  if (!isNonEmptyArray(achievements)) {
    renderInto(container, "", {
      visible: false,
    });
    return;
  }

  const markup = achievements
    .map((entry) =>
      buildAchievementCardMarkup(entry.achievement || entry, {
        evaluation: entry.evaluation || getAchievementEvaluation(entry.achievement || entry),
        isEarned: false,
      }),
    )
    .join("");

  renderInto(container, markup, {
    visible: hasRenderableMarkup(markup),
  });
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

  showWhen(elements.postGameNextBtn, state.mode === "practice");
  showWhen(elements.postGamePracticeBtn, state.mode === "daily");

  renderTriviaSection(content.trivia);
  renderPostGameStats(state.mode);

  if (elements.postGameNewAchievements && elements.postGameNewAchievementsSection) {
    const newlyEarnedAchievements = getNewlyEarnedAchievements();
    const hasNewAchievements = isNonEmptyArray(newlyEarnedAchievements);

    showWhen(elements.postGameNewAchievementsSection, hasNewAchievements);

    if (hasNewAchievements) {
      renderPostGameNewAchievements(
        elements.postGameNewAchievements,
        newlyEarnedAchievements,
      );
    } else {
      renderInto(elements.postGameNewAchievements, "", {
        visible: false,
      });
    }
  }

  if (elements.postGameClosestAchievements && elements.postGameClosestAchievementsSection) {
    const closestAchievements = getClosestIncompleteAchievements(3);
    const hasClosestAchievements = isNonEmptyArray(closestAchievements);

    showWhen(elements.postGameClosestAchievementsSection, hasClosestAchievements);

    if (hasClosestAchievements) {
      renderPostGameClosestAchievements(
        elements.postGameClosestAchievements,
        closestAchievements,
      );
    } else {
      renderInto(elements.postGameClosestAchievements, "", {
        visible: false,
      });
    }
  }

  if (state.mode === "daily") {
    showWhen(elements.postGameLeaderboardSection, true);
    ensureLeaderboardViewerUser();
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
    const query = elements.guessInput?.value?.trim();

    if (!query) {
      closeSuggestions();
      return;
    }

    renderSurfaceEmptyState(
      elements.autocomplete,
      {
        title: "No matching books",
        body: "Try another spelling or a different Bible book name.",
        compact: true,
        showMarker: true,
        tone: "empty",
        actions: renderRetryButtonMarkup("Keep typing", "focus-guess-input"),
      },
      bindEmptyStateActions,
    );

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
          class="suggestion${active ? ' is-active' : ''}"
          role="option"
          aria-selected="${active}"
          data-index="${index}"
        >
          <span class="suggestion-primary">${escapeHtml(suggestion.primaryLabel)}</span>
          ${suggestion.secondaryLabel
          ? `<span class="suggestion-secondary">${escapeHtml(suggestion.secondaryLabel)}</span>`
          : ''
        }
        </button>
      `;
    })
    .join('');

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



function getDefaultStatusMessage(status = state.status) {
  const language = getCurrentLanguage();
  const puzzle = state.currentPuzzle?.verse;

  if (!puzzle) {
    return "Guess the book from the verse above.";
  }

  if (status === "won") {
    return `Correct! ${getLocalizedValue(puzzle.book, puzzle.bookMl)} — ${getLocalizedReference(puzzle, language)}.`;
  }

  if (status === "lost") {
    return `Out of guesses — the answer was ${getLocalizedValue(puzzle.book, puzzle.bookMl)} — ${getLocalizedReference(puzzle, language)}.`;
  }

  const clueState = buildClueRevealState();
  const newHintCount = clueState.newlyUnlockedKeys.length;

  if (newHintCount > 0 && state.guesses.length > 0) {
    return `${newHintCount} new ${newHintCount === 1 ? "clue" : "clues"} unlocked. Review the clue panel above.`;
  }

  return "Guess the book from the verse above.";
}

function refreshAfterGuess(message) {
  puzzleSurface.renderAfterGuessOutcome({
    status: state.status,
    message,
    animateLatest: true,
    renderHints: state.status !== "won" && state.status !== "lost",
    renderProximity: state.status !== "won" && state.status !== "lost",
    renderPostGame: true,
  });
}

function renderGuessTransitionResult(result) {
  if (!result) return;

  if (result.type === "guess-rejected") {
    if (result.reason === "invalid") {
      handleInvalidGuess();
      return;
    }

    if (result.reason === "duplicate") {
      handleDuplicateGuess(result.match);
      return;
    }

    return;
  }

  if (
    result.type === "guess-solved" ||
    result.type === "guess-lost" ||
    result.type === "guess-incorrect"
  ) {
    const message =
      result.message || getDefaultStatusMessage(result.messageType || result.status);

    puzzleSurface.renderAfterGuessOutcome({
      status: result.status,
      message,
      animateLatest: !!result.animateLatest,
      renderHints: !!result.renderHints,
      renderProximity: !!result.renderProximity,
      renderPostGame: !!result.renderPostGame,
    });
  }
}

async function applyGuess(rawGuess) {
  if (isGameOver()) {
    puzzleSurface.renderPuzzleView();
    return;
  }

  const result = await gameTransitions.applyGuess(rawGuess);
  renderGuessTransitionResult(result);
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
  const statusLabel = solved
    ? "Solved"
    : state.status === "lost"
      ? "Lost"
      : "In progress";
  const guessCount = state.guesses.length;
  const guessWord = guessCount === 1 ? "guess" : "guesses";
  const modeLabel = state.mode === "daily" ? "Daily" : "Practice";
  const difficultyLabel =
    typeof state.preferences?.difficulty === "string"
      ? state.preferences.difficulty.charAt(0).toUpperCase() +
      state.preferences.difficulty.slice(1)
      : "Normal";
  const currentStreak = Number.isFinite(state.stats?.daily?.currentStreak)
    ? state.stats.daily.currentStreak
    : 0;
  const streakLine =
    state.mode === "daily" && currentStreak > 1
      ? `Streak: ${currentStreak} days 🔥\n`
      : "";
  const dateLine = state.mode === "daily" ? state.currentPuzzle?.date || getTodayPuzzleDate() : "practice";
  const summary = buildShareSummary();
  const playUrl = getShareUrl();

  return `✝️ Catholic Bibdle ✝️
${modeLabel} · ${dateLine}
${statusLabel} in ${guessCount} ${guessWord}
${difficultyLabel} mode
${streakLine}${summary}
Play: ${playUrl}`;
}

async function shareResult() {
  const payload = getSharePayload();

  if (canUseNativeShare(payload)) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
      });
      renderStatus("Result shared.");
      return true;
    } catch (error) {
      const shareWasCancelled =
        error?.name === "AbortError" || error?.name === "NotAllowedError";

      if (shareWasCancelled) {
        renderStatus("Share cancelled.");
        return false;
      }

      try {
        await copyTextToClipboard(payload.text);
        renderStatus("Native share failed, so the result was copied instead.");
        return true;
      } catch {
        renderStatus("Sharing is unavailable in this browser.");
        return false;
      }
    }
  }

  try {
    await copyTextToClipboard(payload.text);
    renderStatus("Result copied to clipboard.");
    return true;
  } catch {
    renderStatus("Sharing and clipboard copy are unavailable in this browser.");
    return false;
  }
}

async function copyResult() {
  try {
    await copyTextToClipboard(buildShareText());
    renderStatus("Result copied to clipboard.");
    return true;
  } catch {
    renderStatus("Clipboard access is unavailable in this browser.");
    return false;
  }
}

function setModalOpen(modal, isOpen) {
  setModalOpenState(modal, isOpen);
}

const modalHelpers = createModalHelpers({
  elements,
  modalService,
  fallbackOpen: (modal, options) => setModalOpenState(modal, true, options),
  fallbackClose: (modal, options) => setModalOpenState(modal, false, options)
});

const helpModalControls = modalHelpers.createModalPair("help");
const settingsModalControls = modalHelpers.createModalPair("settings", () => {
  syncSettingsControls();
});
const statsModalControls = modalHelpers.createModalPair(
  "stats",
  (...args) => statsSurface?.renderStatsModal?.(...args),
);

function openHelpModal(trigger = document.activeElement) {
  helpModalControls.open(trigger);
}

function closeHelpModal() {
  helpModalControls.close();
}

function openSettingsModal(trigger = document.activeElement) {
  if (!elements.settingsModal) return;
  settingsModalControls.open(trigger);
}

function closeSettingsModal() {
  settingsModalControls.close();
}

function openStatsModal(trigger = document.activeElement) {
  if (!elements.statsModal) return;
  statsModalControls.open(trigger);
}

function closeStatsModal() {
  statsModalControls.close();
}

function closePostGamePanel() {
  postGameSurface?.closePostGamePanel?.();
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
  document.documentElement.classList.toggle("reduced-motion", !!state.preferences.reducedAnimation);
  document.documentElement.classList.toggle("high-contrast", !!state.preferences.highContrast);
  document.documentElement.classList.toggle("large-text", !!state.preferences.largeText);
}

const updatePreference = createPreferenceUpdater({
  state,
  savePreferences,
  renderPipeline,
  applyAccessibilityPreferences
});

const handleReducedMotionToggle = createToggleHandler(
  updatePreference,
  "reducedAnimation",
  "reduced-motion-toggle"
);

const handleHighContrastToggle = createToggleHandler(
  updatePreference,
  "highContrast",
  "high-contrast-toggle"
);

const handleLargeTextToggle = createToggleHandler(
  updatePreference,
  "largeText",
  "large-text-toggle"
);

const handleSoundToggle = createToggleHandler(
  updatePreference,
  "sound",
  "sound-toggle"
);

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
  archiveSurface.renderArchiveGrid(bookKey);
  archiveSurface.renderArchiveDetails(bookKey);
}

function handleThemeToggle() {
  const nextTheme = state.preferences.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  updatePreference("theme", nextTheme, "theme-toggle");
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
  renderPipeline.renderPreferencesChanged({ reason: "language-change" });
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
  renderPipeline.renderPreferencesChanged({ reason: "mobile-language-toggle" });
}

function handleDifficultyChange(event) {
  const value = event.target.value;
  if (!CONFIG.modes[value]) return;

  state.preferences.difficulty = value;

  const clueUiState = ensureClueUiState();
  clueUiState.lastUnlockedKeys = [];
  clueUiState.lastRenderSignature = "";

  savePreferences();
  renderPipeline.renderPreferencesChanged("difficulty-change");

  const result = gameTransitions.resetPuzzle(state.mode);
  renderPuzzleLifecycleResult(result, { source: "difficulty-change" });
}

function handleModeChange(event) {
  const value = event.target.value;
  if (value !== "daily" && value !== "practice") return;

  markLifecycleStage("mode-switch", { from: state.mode, to: value });
  state.preferences.preferredMode = value;
  savePreferences();

  renderPipeline.renderModeSwitch(value);

  const result = gameTransitions.handleModeSwitch(value);
  renderPuzzleLifecycleResult(result, { source: "mode-switch" });
}

function handleNextPracticePuzzle() {
  if (state.mode !== "practice") return;

  const result = gameTransitions.handleNextPracticePuzzle();
  renderPuzzleLifecycleResult(result, { source: "next-practice" });
}

function handleTryPracticeRound() {
  const result = gameTransitions.handleTryPracticeRound();
  renderPuzzleLifecycleResult(result, { source: "try-practice" });
}

function handleTryTodaysBibdle() {
  const result = gameTransitions.handleTryTodaysBibdle();
  renderPuzzleLifecycleResult(result, { source: "today-bibdle" });
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
  puzzleSurface.renderPuzzleView();
  statsSurface.renderStatsModal();

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
    renderPuzzleView: (...args) => puzzleSurface?.renderPuzzleView?.(...args),
    renderAuthUI,
    renderStatsModal: (...args) => statsSurface?.renderStatsModal?.(...args),
    renderLanguageControl,
    renderMobileLanguageToggle,
    renderThemeToggle,
    syncPreferenceControls,
    renderPostGamePanel: (...args) => postGameSurface?.renderPostGamePanel?.(...args),
    renderStatus,
    bindEmptyStateActions,
    closeSuggestions,
    closePostGamePanel: (...args) => postGameSurface?.closePostGamePanel?.(...args),
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
      shareResult,
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

  publishBootSnapshot({ firebase: "disabled" });
  renderAfterAuthStateChange("auth-disabled");
}

function handleAuthInitialized(context) {
  firebaseApp = context.app ?? null;
  firebaseAuth = context.auth ?? null;
  firebaseDb = context.db ?? null;
  state.auth.enabled = !!context.enabled;

  publishBootSnapshot({ firebase: "initialized" });
  renderAfterAuthStateChange("auth-initialized");
}

function handleAuthInitFailure(error) {
  console.error("Firebase init failed", error);

  state.auth.ready = true;
  state.auth.enabled = false;
  state.auth.user = null;
  state.auth.syncing = false;

  markLifecycleError("init-services", error, { service: "firebase-auth" });
  renderAfterAuthStateChange("auth-init-failed");
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

function handleAuthStateReady({ user, hadCloudProfile }) {
  state.auth.user = user ?? null;
  state.auth.ready = true;
  state.auth.syncing = false;

  publishBootSnapshot({
    auth: "ready",
    hadCloudProfile: !!hadCloudProfile,
    user: user
      ? { uid: user.uid, isAnonymous: !!user.isAnonymous }
      : null,
  });

  renderAfterAuthStateChange("auth-ready");
}

function handleAuthStateSyncError({ user, error }) {
  console.error("Auth sync failed", error);

  state.auth.user = user ?? null;
  state.auth.ready = true;
  state.auth.syncing = false;

  if (user?.isAnonymous) {
    setAuthStatus(`Playing anonymously as ${getPublicUserName(user)}`);
  } else {
    setAuthStatus("Signed in, cloud sync unavailable");
  }

  markLifecycleError("auth-ready", error, {
    user: user ? { uid: user.uid, isAnonymous: !!user.isAnonymous } : null,
  });

  renderAfterAuthStateChange("auth-sync-error");
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

  const result = gameTransitions.resetPuzzle(state.mode);
  const restored = !!result?.restored;

  renderPuzzleLifecycleResult(result, {
    source: restored ? "boot-restore" : "boot-start",
  });

  if (restored) {
    renderStatus("Progress restored.");
  }

  bindShareActions();

  if (elements.shareBtn) {
    elements.shareBtn.textContent = "Share result";
    elements.shareBtn.hidden = true;
  }

  if (elements.copyBtn) {
    elements.copyBtn.textContent = "Copy result";
    elements.copyBtn.hidden = true;
  }

  if (elements.postGameShareBtn) {
    elements.postGameShareBtn.textContent = "Share result";
    elements.postGameShareBtn.hidden = true;
  }

  if (elements.postGameCopyOnlyBtn) {
    elements.postGameCopyOnlyBtn.textContent = "Copy result";
    elements.postGameCopyOnlyBtn.hidden = true;
  }

  if (
    elements.postGameCopyBtn &&
    !elements.postGameShareBtn &&
    !elements.postGameCopyOnlyBtn
  ) {
    elements.postGameCopyBtn.textContent = "Share result";
  }

  publishBootSnapshot({
    progressRestored: restored,
    currentPuzzleId: state.currentPuzzle?.id ?? null,
  });
}

function renderPuzzleLifecycleResult(result, options = {}) {
  if (!result) return;

  const source = options.source || result.type || "puzzle-lifecycle";

  postGameSurface?.closePostGamePanel?.();

  if (
    result.type === "puzzle-reset" ||
    result.type === "puzzle-restored" ||
    result.type === "next-practice-puzzle" ||
    result.type === "puzzle-started"
  ) {
    renderPipeline.renderPuzzleReset(result.mode, {
      source,
      restored: !!result.restored,
    });
  }
}

function startPuzzle(mode = state.mode) {
  const result = gameTransitions.startPuzzle(mode);
  renderPuzzleLifecycleResult(result, { source: "startPuzzle" });
}

function resetPuzzle(mode = state.mode) {
  const result = gameTransitions.resetPuzzle(mode);
  renderPuzzleLifecycleResult(result, {
    source: result.restored ? "resetPuzzle-restore" : "resetPuzzle",
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

function initializeRenderSurfaces() {
  statsSurface = createStatsSurface({
    elements,
    ACHIEVEMENTS,
    ACHIEVEMENT_CATEGORIES,
    computeModeStatsSummary,
    getAchievementEvaluation,
    shouldTreatAchievementAsEarned,
    getAchievementCategoryOrder,
    buildAchievementCategoryGroupMarkup,
    buildAchievementCardMarkup,
    getNewlyEarnedAchievements,
    getClosestIncompleteAchievements,
    isNonEmptyArray,
    hasRenderableMarkup,
    renderInto,
  });

  leaderboardSurface = createLeaderboardSurface({
    state,
    elements,
    bindEmptyStateActions,
    formatLeaderboardTime,
    renderPlacementCard,
    escapeHtml,
    renderInto,
    clearBusyState,
    renderSurfaceEmptyState,
    renderSurfaceLoadingState,
    renderRetryButtonMarkup,
    fetchDailyGlobalStats,
    fetchLeaderboardTopEntries,
    fetchCurrentUserRank,
    getDailyDateKey,
    isLeaderboardAvailable: () => !!state.auth.enabled && !!firebaseDb,
  });

  archiveSurface = createArchiveSurface({
    elements,
    books,
    getCurrentLanguage,
    computeArchiveSummary,
    buildArchiveBarsViewModel,
    buildArchiveGridViewModel,
    buildArchiveDetailsViewModel,
    getBookStats,
    getBookStatsKey,
    getArchiveCellState,
    getArchiveCellStateLabel,
    getArchiveCellAriaLabel,
    getAverageAttemptsForBook,
    getLocalizedBookName,
    getLocalizedTestament,
    getLocalizedSection,
    renderInto,
    renderEmptyState,
    escapeHtml,
  });

  postGameSurface = createPostGameSurface({
    state,
    elements,
    getFirebaseAuth: () => firebaseAuth,
    getFirebaseDb: () => firebaseDb,
    bindEmptyStateActions,
    isGameOver,
    getPostGameContent,
    getNewlyEarnedAchievements,
    getClosestIncompleteAchievements,
    isNonEmptyArray,
    showWhen,
    renderWhen,
    renderInto,
    clearBusyState,
    renderSurfaceEmptyState,
    renderSurfaceLoadingState,
    renderRetryButtonMarkup,
    setModalOpenState,
    fetchCurrentUserRank,
    getDailyDateKey,
    renderPostGameNewAchievements: (...args) =>
      statsSurface.renderPostGameNewAchievements(...args),
    renderPostGameClosestAchievements: (...args) =>
      statsSurface.renderPostGameClosestAchievements(...args),
    renderPostGameStats,
  });

  puzzleSurface = createPuzzleSurface({
    state,
    elements,
    applyLanguageToDocument,
    applyModeTheme,
    renderLanguageControl,
    renderMobileLanguageToggle,
    publishBootSnapshot,
    renderStatus,
    getDefaultStatusMessage,
    syncEndStateVisibility,
    syncPreferenceControls,
    saveProgress,
    isGameOver,
    getCurrentLanguage,
    getLocalizedVerseText,
    formatDate,
    startCountdownTimer,
    stopCountdownTimer,
    getHintLines,
    getAttemptLabel,
    renderEmptyGuessRows,
    renderGuessRow,
    getProximityDescription,
    hasCompletedTodaysDaily,
    showWhen,
    renderPostGamePanel: (...args) => postGameSurface.renderPostGamePanel(...args),
    buildClueRevealState,
  });
}

function initializeGameTransitions() {
  gameTransitions = createGameTransitions({
    state,
    CONFIG,
    ensureClueUiState,
    buildClueRevealState,
    getLocalizedBookName,
    getCurrentLanguage,
    getBookByName,
    getBookById,
    isBookAlreadyGuessed,
    compareGuess,
    getMaxGuesses,
    getTodayPuzzleDate,
    pickPuzzle,
    saveProgress,
    clearSavedProgress,
    loadProgress,
    restoreProgressPayload,
    canRestoreSavedPracticePuzzle,
    readStoredProgressBuckets,
    writeStoredProgressBuckets,
    getProgressStorageKey,
    applyModeTheme,
    resetInput,
    resetSuggestionsState,
    closeSuggestions,
    syncEndStateVisibility,
    recordPuzzleCompletion,
    markLifecycleStage,
    publishBootSnapshot,
  });
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

  initializeRenderSurfaces();

  initializeGameTransitions();

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