// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "../../js/config.js";
import { createProgressStorage } from "../../js/progress-storage.js";

describe("progress storage", () => {
  let state;
  let guessInput;
  let storage;
  let puzzle;
  let applyModeTheme;
  let resetSuggestionsState;
  let closeSuggestions;

  beforeEach(() => {
    localStorage.clear();
    puzzle = { id: "genesis-1-1", book: "Genesis" };
    state = {
      mode: "daily",
      currentPuzzle: { id: puzzle.id, date: "2026-10-17", mode: "daily" },
      guesses: [],
      status: "playing",
    };
    guessInput = { value: "" };
    applyModeTheme = vi.fn();
    resetSuggestionsState = vi.fn();
    closeSuggestions = vi.fn();
    storage = createProgressStorage({
      state,
      elements: { guessInput },
      config: CONFIG,
      getPuzzleById: vi.fn((id) => id === puzzle.id ? puzzle : null),
      pickPuzzle: vi.fn(() => puzzle),
      getTodayPuzzleDate: () => "2026-10-17",
      applyModeTheme,
      resetSuggestionsState,
      closeSuggestions,
    });
  });

  it("saves daily and practice progress in separate compatible buckets", () => {
    state.guesses = [{ bookId: "exodus" }];
    guessInput.value = "Ex";
    storage.saveProgress();

    state.mode = "practice";
    state.currentPuzzle = { id: puzzle.id, date: null, mode: "practice" };
    state.guesses = [];
    guessInput.value = "";
    storage.saveProgress();

    const buckets = JSON.parse(localStorage.getItem(CONFIG.storageKeys.progress));
    expect(Object.keys(buckets).sort()).toEqual(["daily", "practice"]);
    expect(buckets.daily).toMatchObject({
      mode: "daily",
      guesses: [{ bookId: "exodus" }],
      inputDraft: "Ex",
    });
    expect(buckets.practice).toMatchObject({
      mode: "practice",
      currentPuzzle: { id: puzzle.id, mode: "practice" },
    });
  });

  it("restores daily and practice states, guess drafts, and UI state", () => {
    const daily = {
      mode: "daily",
      currentPuzzle: { id: puzzle.id, date: "2026-10-17", mode: "daily" },
      guesses: [{ bookId: "exodus" }],
      status: "playing",
      inputDraft: "Exodus",
    };
    localStorage.setItem(CONFIG.storageKeys.progress, JSON.stringify({ daily }));

    expect(storage.loadProgress("daily")).toBe(true);
    expect(state).toMatchObject({
      mode: "daily",
      currentPuzzle: { id: puzzle.id, date: "2026-10-17", mode: "daily" },
      guesses: [{ bookId: "exodus" }],
      status: "playing",
    });
    expect(guessInput.value).toBe("Exodus");
    expect(applyModeTheme).toHaveBeenCalledWith("daily");
    expect(resetSuggestionsState).toHaveBeenCalledOnce();
    expect(closeSuggestions).toHaveBeenCalledOnce();

    const practice = {
      mode: "practice",
      currentPuzzle: { id: puzzle.id, date: null, mode: "practice" },
      guesses: [],
      status: "won",
      inputDraft: "",
    };
    localStorage.setItem(CONFIG.storageKeys.progress, JSON.stringify({ practice }));
    expect(storage.loadProgress("practice")).toBe(true);
    expect(state.mode).toBe("practice");
    expect(state.currentPuzzle.date).toBeNull();
    expect(state.status).toBe("won");
  });

  it("restores legacy single-puzzle payloads and normalizes unknown status", () => {
    localStorage.setItem(CONFIG.storageKeys.progress, JSON.stringify({
      mode: "daily",
      currentPuzzle: { id: puzzle.id, mode: "daily", date: "2026-10-17" },
      guesses: [],
      status: "unexpected",
    }));

    expect(storage.loadProgress("daily")).toBe(true);
    expect(state.mode).toBe("daily");
    expect(state.status).toBe("playing");
  });

  it("rejects stale daily and missing practice puzzles without discarding the other mode", () => {
    localStorage.setItem(CONFIG.storageKeys.progress, JSON.stringify({
      daily: {
        currentPuzzle: { id: puzzle.id, date: "2026-10-16", mode: "daily" },
      },
      practice: {
        currentPuzzle: { id: "missing", mode: "practice" },
      },
    }));

    expect(storage.loadProgress("daily")).toBe(false);
    expect(JSON.parse(localStorage.getItem(CONFIG.storageKeys.progress)))
      .toMatchObject({ daily: null, practice: { currentPuzzle: { id: "missing" } } });
    expect(storage.loadProgress("practice")).toBe(false);
    expect(localStorage.getItem(CONFIG.storageKeys.progress)).toBeNull();
  });

  it("clears only the selected mode or all saved progress", () => {
    localStorage.setItem(CONFIG.storageKeys.progress, JSON.stringify({
      daily: { mode: "daily" },
      practice: { mode: "practice" },
    }));

    storage.clearSavedProgress("daily");
    expect(JSON.parse(localStorage.getItem(CONFIG.storageKeys.progress)))
      .toEqual({ daily: null, practice: { mode: "practice" } });
    storage.clearSavedProgress();
    expect(localStorage.getItem(CONFIG.storageKeys.progress)).toBeNull();
  });

  it("reports storage failures and retains usable defaults for malformed JSON", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(CONFIG.storageKeys.progress, "{broken");
    expect(storage.loadProgress()).toBe(false);
    expect(warning).toHaveBeenCalledWith(
      "Unable to read saved progress:",
      expect.any(SyntaxError),
    );

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    });
    storage.saveProgress();
    expect(warning).toHaveBeenCalledWith(
      "Unable to save progress:",
      expect.any(DOMException),
    );
  });
});
