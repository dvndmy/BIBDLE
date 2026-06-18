export function createGameTransitions(deps) {
  const {
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
  } = deps;

  function buildCurrentPuzzle(mode = "daily") {
    const puzzle = pickPuzzle(mode);
    return {
      id: puzzle.id,
      date: mode === "daily" ? getTodayPuzzleDate() : null,
      mode,
      verse: puzzle,
    };
  }

  function restoreSavedPuzzle(mode) {
    const restored = loadProgress(mode);
    if (!restored) {
      return {
        restored: false,
        reason: "no-saved-progress",
      };
    }

    const clueUiState = ensureClueUiState();
    clueUiState.lastUnlockedKeys = state.guesses
      .map((guess) => guess)
      .filter(Boolean).length
      ? buildClueRevealState()
          .items
          .filter((item) => item.unlocked)
          .map((item) => item.key)
      : [];

    syncEndStateVisibility();

    return {
      restored: true,
      reason: "saved-progress-restored",
      mode: state.mode,
      puzzleId: state.currentPuzzle?.id ?? null,
    };
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
    resetInput();
    resetSuggestionsState();
    closeSuggestions();
    saveProgress();

    return {
      type: "puzzle-started",
      mode,
      puzzleId: state.currentPuzzle?.id ?? null,
    };
  }

  function resetPuzzle(mode = state.mode) {
    markLifecycleStage?.("puzzle-reset", { mode });

    const restoreResult = restoreSavedPuzzle(mode);
    if (restoreResult.restored) {
      publishBootSnapshot?.({
        action: "restore-puzzle",
        mode,
        puzzleId: state.currentPuzzle?.id ?? null,
      });

      return {
        type: "puzzle-restored",
        mode,
        puzzleId: state.currentPuzzle?.id ?? null,
        restored: true,
      };
    }

    const started = startPuzzle(mode);
    saveProgress();

    return {
      type: "puzzle-reset",
      mode,
      puzzleId: started.puzzleId,
      restored: false,
    };
  }

  async function completeSolvedGuess() {
    state.status = "won";
    await recordPuzzleCompletion("won");

    return {
      type: "guess-solved",
      status: "won",
      messageType: "won",
      animateLatest: true,
      renderHints: false,
      renderProximity: false,
      renderPostGame: true,
    };
  }

  async function completeLostGuess() {
    state.status = "lost";
    await recordPuzzleCompletion("lost");

    return {
      type: "guess-lost",
      status: "lost",
      messageType: "lost",
      animateLatest: true,
      renderHints: false,
      renderProximity: false,
      renderPostGame: true,
    };
  }

  function completeIncorrectGuess(match) {
    const clueState = buildClueRevealState();
    const newHintCount = clueState.newlyUnlockedKeys.length;
    const nearestDistance = (() => {
      const distances = state.guesses
        .map((guess) => (typeof guess?.distance === "number" ? guess.distance : null))
        .filter((distance) => distance !== null);
      if (!distances.length) return null;
      return Math.min(...distances);
    })();

    const bookName = getLocalizedBookName(match, getCurrentLanguage());
    let message = `${bookName} added. Use the colors and clues for your next guess.`;

    if (newHintCount > 0) {
      message = `${bookName} added. ${newHintCount} new clue${newHintCount === 1 ? "" : "s"} unlocked.`;
    } else if (typeof nearestDistance === "number" && nearestDistance >= 0) {
      message = `${bookName} added. Your nearest guess so far is ${nearestDistance} ${nearestDistance === 1 ? "book" : "books"} away.`;
    }

    return {
      type: "guess-incorrect",
      status: "playing",
      message,
      animateLatest: true,
      renderHints: true,
      renderProximity: true,
      renderPostGame: true,
    };
  }

  function validateGuess(rawGuess) {
    const match =
      typeof rawGuess === "object" ? rawGuess : getBookByName(rawGuess);

    if (!match) {
      return { ok: false, reason: "invalid" };
    }

    if (isBookAlreadyGuessed(match.id)) {
      return { ok: false, reason: "duplicate", match };
    }

    const result = compareGuess(match);
    if (!result) {
      return { ok: false, reason: "compare-failed", match };
    }

    return { ok: true, match, result };
  }

  async function applyGuess(rawGuess) {
    const validation = validateGuess(rawGuess);

    if (!validation.ok) {
      return {
        type: "guess-rejected",
        reason: validation.reason,
        match: validation.match ?? null,
      };
    }

    const { match, result } = validation;

    state.guesses.push(result);
    resetInput();
    resetSuggestionsState();
    closeSuggestions();

    if (result.solved) {
      return completeSolvedGuess();
    }

    if (state.guesses.length >= getMaxGuesses()) {
      return completeLostGuess();
    }

    saveProgress();
    return completeIncorrectGuess(match);
  }

  function handleModeSwitch(nextMode) {
    state.mode = nextMode;
    return resetPuzzle(nextMode);
  }

  function handleTryPracticeRound() {
    return resetPuzzle("practice");
  }

  function handleTryTodaysBibdle() {
    return resetPuzzle("daily");
  }

  function handleNextPracticePuzzle() {
    markLifecycleStage?.("puzzle-reset", {
      mode: "practice",
      trigger: "next-practice",
    });

    const result = startPuzzle("practice");
    saveProgress();

    return {
      ...result,
      type: "next-practice-puzzle",
      source: "next-practice",
    };
  }

  return {
    applyGuess,
    resetPuzzle,
    startPuzzle,
    handleModeSwitch,
    handleTryPracticeRound,
    handleTryTodaysBibdle,
    handleNextPracticePuzzle,
  };
}