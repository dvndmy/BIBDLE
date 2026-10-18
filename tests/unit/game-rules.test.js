import { beforeEach, describe, expect, it } from "vitest";
import { books } from "../../js/data/books.js";
import { CONFIG } from "../../js/config.js";
import { createGameRules } from "../../js/game-rules.js";
import { createLocalizationService } from "../../js/localization-service.js";

function createRules(state) {
  const localization = createLocalizationService({
    books,
    state,
    config: CONFIG,
    elements: {},
  });
  return createGameRules({
    state,
    config: CONFIG,
    ...localization,
    getTodayPuzzleDate: () => "2026-10-17",
    ensureClueUiState: () => state.ui.clues,
    getBookDistance: (first, second) => Math.abs(first.order - second.order),
    getProximityLabel: (distance, sameTestament) => {
      if (!sameTestament) return "wrong testament";
      if (distance === 0) return "exact";
      if (distance === 1) return "very close";
      if (distance <= 3) return "near";
      return "far";
    },
    isSameSection: (first, second) => first.sectionKey === second.sectionKey,
  });
}

describe("game rules", () => {
  let state;
  let rules;

  beforeEach(() => {
    state = {
      preferences: { language: "en", difficulty: "normal" },
      currentPuzzle: {
        mode: "daily",
        verse: { book: "Genesis", reference: "Genesis 1:1" },
      },
      guesses: [],
      status: "playing",
      stats: { daily: { lastDailySolvedDate: "2026-10-17" } },
      ui: { clues: { lastUnlockedKeys: [], lastRenderSignature: "" } },
    };
    rules = createRules(state);
  });

  it("uses all difficulty guess limits and unlock schedules", () => {
    expect(rules.getMaxGuesses()).toBe(8);
    expect(rules.getHintSchedule()).toMatchObject({
      testamentAt: 1,
      sectionAt: 3,
      firstLetterAt: 7,
      referenceAt: 4,
      distanceAt: 3,
    });

    state.preferences.difficulty = "easy";
    expect(rules.getMaxGuesses()).toBe(8);
    expect(rules.getHintSchedule()).toMatchObject({
      testamentAt: 1,
      sectionAt: 3,
      firstLetterAt: 6,
      distanceAt: 1,
    });

    state.preferences.difficulty = "hard";
    expect(rules.getHintSchedule()).toMatchObject({
      testamentAt: 1,
      sectionAt: 5,
      firstLetterAt: 7,
      referenceAt: 3,
      distanceAt: null,
      distanceRequiresBookPartial: true,
    });
  });

  it("allows ten guesses only during local room rounds", () => {
    expect(rules.getMaxGuesses()).toBe(8);
    state.localGameActive = true;
    expect(rules.getMaxGuesses()).toBe(10);
    state.localGameActive = false;
    expect(rules.getMaxGuesses()).toBe(8);
  });

  it("reveals normal clues on schedule and infers matching clues early", () => {
    const noGuesses = rules.buildClueRevealState();
    expect(noGuesses.items.filter((item) => item.unlocked)).toHaveLength(0);

    state.guesses = [{
      distance: 1,
      section: { state: "correct" },
      firstLetter: { state: "correct" },
      bookResult: { state: "partial" },
    }];
    const oneGuess = rules.buildClueRevealState();
    expect(oneGuess.items.filter((item) => item.unlocked).map((item) => item.key))
      .toEqual(["testament", "section", "firstLetter"]);

    state.guesses.push({ distance: 2 });
    state.guesses.push({ distance: 3 });
    const threeGuesses = rules.buildClueRevealState();
    expect(threeGuesses.items.filter((item) => item.unlocked).map((item) => item.key))
      .toEqual(["testament", "section", "distance", "firstLetter"]);
    expect(rules.getNearestGuessDistance()).toBe(1);
    expect(rules.getHintLines().some((item) => item.isNew)).toBe(false);
  });

  it("applies easy and hard distance and section unlock rules", () => {
    state.preferences.difficulty = "easy";
    state.guesses = [{ distance: 1 }];
    expect(rules.buildClueRevealState().items.find((item) => item.key === "distance").unlocked)
      .toBe(true);

    state.preferences.difficulty = "hard";
    expect(rules.buildClueRevealState().items.find((item) => item.key === "distance").unlocked)
      .toBe(false);
    state.guesses = [{ distance: 4, bookResult: { state: "partial" } }];
    expect(rules.buildClueRevealState().items.find((item) => item.key === "distance").unlocked)
      .toBe(true);
    expect(rules.buildClueRevealState().items.find((item) => item.key === "section").unlocked)
      .toBe(false);
    state.guesses.push({}, {}, {}, {});
    expect(rules.buildClueRevealState().items.find((item) => item.key === "section").unlocked)
      .toBe(true);
  });

  it("compares canonical guesses and returns correct, partial, wrong, and solved feedback", () => {
    const exact = rules.compareGuess("Genesis");
    expect(exact).toMatchObject({
      bookId: "genesis",
      distance: 0,
      proximity: "exact",
      solved: true,
      testament: { state: "correct" },
      section: { state: "correct" },
      firstLetter: { state: "correct" },
      bookResult: { state: "correct" },
    });

    const nearby = rules.compareGuess("Exodus");
    expect(nearby).toMatchObject({
      distance: 1,
      proximity: "very close",
      solved: false,
      section: { state: "correct" },
      bookResult: { state: "partial" },
    });

    const wrongTestament = rules.compareGuess("Matthew");
    expect(wrongTestament.testament.state).toBe("wrong");
    expect(wrongTestament.proximity).toBe("wrong testament");
    expect(wrongTestament.bookResult.state).toBe("wrong");
    expect(rules.compareGuess("not a book")).toBeNull();

    state.preferences.language = "ml";
    expect(rules.compareGuess("Genesis").book).toBe("ഉല്പത്തി");
  });

  it("reports puzzle mode, daily completion, difficulty eligibility, and attempt labels", () => {
    expect(rules.isCurrentDailyPuzzle()).toBe(true);
    expect(rules.isCurrentPracticePuzzle()).toBe(false);
    expect(rules.hasCompletedTodaysDaily()).toBe(true);
    expect(rules.canChangeDifficulty()).toBe(true);
    expect(rules.isGameOver()).toBe(false);
    expect(rules.getAttemptLabel()).toBe("Start guessing");

    state.currentPuzzle.mode = "practice";
    state.guesses.push({});
    state.status = "won";
    expect(rules.isCurrentPracticePuzzle()).toBe(true);
    expect(rules.canChangeDifficulty()).toBe(false);
    expect(rules.isGameOver()).toBe(true);
    expect(rules.getAttemptLabel()).toBe("You solved it");

    state.status = "lost";
    expect(rules.getAttemptLabel()).toBe("Out of guesses");
  });
});
