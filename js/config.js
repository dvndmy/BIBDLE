export const CONFIG = {
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

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC8Mo3GyKwFLvJU5npB_ZwlApJkDqnRrMY",
  authDomain: "bibdle-db7ae.firebaseapp.com",
  projectId: "bibdle-db7ae",
  storageBucket: "bibdle-db7ae.firebasestorage.app",
  messagingSenderId: "278845724002",
  appId: "1:278845724002:web:0842b72515b58791d0883b",
};

export const FIREBASE_ENABLED =
  FIREBASE_CONFIG.apiKey !== "REPLACE_ME" &&
  FIREBASE_CONFIG.projectId !== "REPLACE_ME";
