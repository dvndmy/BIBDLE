export function createProgressStorage({
  state,
  elements,
  config,
  getPuzzleById,
  pickPuzzle,
  getTodayPuzzleDate,
  applyModeTheme,
  resetSuggestionsState,
  closeSuggestions,
} = {}) {
  function getProgressStorageKey(mode) {
    return mode === "practice" ? "practice" : "daily";
  }

  function isProgressBucketShape(value) {
    return (
      !!value &&
      typeof value === "object" &&
      ("daily" in value || "practice" in value)
    );
  }

  function readStoredProgressBuckets() {
    try {
      const raw = localStorage.getItem(config.storageKeys.progress);
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
    } catch (error) {
      console.warn("Unable to read saved progress:", error);
      return {
        daily: null,
        practice: null,
      };
    }
  }

  function writeStoredProgressBuckets(buckets) {
    try {
      localStorage.setItem(
        config.storageKeys.progress,
        JSON.stringify({
          daily: buckets?.daily ?? null,
          practice: buckets?.practice ?? null,
        }),
      );
    } catch (error) {
      console.warn("Unable to save progress:", error);
    }
  }

  function clearSavedProgress(mode = null) {
    try {
      if (!mode) {
        localStorage.removeItem(config.storageKeys.progress);
        return;
      }

      const buckets = readStoredProgressBuckets();
      const storageKey = getProgressStorageKey(mode);

      buckets[storageKey] = null;

      if (!buckets.daily && !buckets.practice) {
        localStorage.removeItem(config.storageKeys.progress);
        return;
      }

      writeStoredProgressBuckets(buckets);
    } catch (error) {
      console.warn("Unable to clear saved progress:", error);
    }
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
    const storageKey = getProgressStorageKey(
      payload.currentPuzzle?.mode || state.mode,
    );

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
        clearSavedProgress("daily");
        return false;
      }

      if (preferredKey === "practice" && buckets.practice) {
        clearSavedProgress("practice");
        return false;
      }

      return false;
    } catch (error) {
      console.error("Unable to restore saved progress:", error);
      clearSavedProgress();
      return false;
    }
  }

  return {
    clearSavedProgress,
    loadProgress,
    saveProgress,
  };
}
