export function createGameRules({
  state,
  config,
  getCurrentLanguage,
  getLocalizedReference,
  getBookByName,
  getLocalizedBookName,
  getLocalizedTestament,
  getLocalizedSection,
  getLocalizedFirstLetter,
  getTodayPuzzleDate,
  ensureClueUiState,
  getBookDistance,
  getProximityLabel,
  isSameSection,
} = {}) {
  function getMaxGuesses() {
    if (state.localGameActive) return 10;
    return (
      config.modes[state.preferences.difficulty]?.maxGuesses ??
      config.modes.normal.maxGuesses
    );
  }

  function getCurrentModeConfig() {
    return config.modes[state.preferences.difficulty] ?? config.modes.normal;
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

  function getReferenceWithoutBookName(
    verse,
    language = getCurrentLanguage(),
  ) {
    const localizedReference = getLocalizedReference(verse, language);
    const targetBook = getBookByName(verse?.book);

    if (!localizedReference || !targetBook) {
      return localizedReference || "";
    }

    const localizedBookName = getLocalizedBookName(targetBook, language);
    if (!localizedBookName) {
      return localizedReference;
    }

    const escapedBookName = localizedBookName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const withoutBook = localizedReference
      .replace(new RegExp(`^${escapedBookName}\\s*`, "i"), "")
      .trim();

    return withoutBook || localizedReference;
  }

  function getNearestGuessDistance() {
    if (!Array.isArray(state.guesses) || !state.guesses.length) {
      return null;
    }

    const distances = state.guesses
      .map((guess) =>
        typeof guess?.distance === "number" ? guess.distance : null,
      )
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
    return state.guesses.some(
      (guess) => guess?.firstLetter?.state === "correct",
    );
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
          Number.isInteger(schedule.testamentAt) &&
          guessCount >= schedule.testamentAt,
        value: `It is in the ${getLocalizedTestament(target, language)}`,
        lockedText: Number.isInteger(schedule.testamentAt)
          ? `Unlocks after guess ${schedule.testamentAt}.`
          : "Not available in this mode.",
        reason: guessCount >= schedule.testamentAt ? "scheduled" : "locked",
      },
      {
        key: "section",
        label: language === "ml" ? "വിഭാഗം" : "Section",
        unlocked:
          (Number.isInteger(schedule.sectionAt) &&
            guessCount >= schedule.sectionAt) ||
          hasCorrectSectionGuess(),
        value: `It is in the ${getLocalizedSection(target, language)} section`,
        lockedText: Number.isInteger(schedule.sectionAt)
          ? `Unlocks after guess ${schedule.sectionAt}, or earlier if you identify the section.`
          : "Not available in this mode.",
        reason: hasCorrectSectionGuess()
          ? "inferred"
          : guessCount >= schedule.sectionAt
            ? "scheduled"
            : "locked",
      },
      {
        key: "distance",
        label: language === "ml" ? "ദൂരം" : "Nearest distance",
        unlocked:
          distanceEligibleByRule && typeof nearestDistance === "number",
        value: `Nearest guess: ${nearestDistance} ${nearestDistance === 1 ? "book" : "books"} away`,
        lockedText: schedule.distanceRequiresBookPartial
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
          Number.isInteger(schedule.referenceAt) &&
          guessCount >= schedule.referenceAt,
        value: `Reference: ${getReferenceWithoutBookName(state.currentPuzzle.verse, language)}`,
        lockedText: Number.isInteger(schedule.referenceAt)
          ? `Unlocks after guess ${schedule.referenceAt}.`
          : "Not available in this mode.",
        reason: guessCount >= schedule.referenceAt ? "scheduled" : "locked",
      },
      {
        key: "firstLetter",
        label: language === "ml" ? "ആദ്യക്ഷരം" : "First letter",
        unlocked:
          (Number.isInteger(schedule.firstLetterAt) &&
            guessCount >= schedule.firstLetterAt) ||
          hasCorrectFirstLetterGuess(),
        value: `Its first letter is ${getLocalizedFirstLetter(target, language)}.`,
        lockedText: Number.isInteger(schedule.firstLetterAt)
          ? `Unlocks after guess ${schedule.firstLetterAt}, or earlier if you identify the first letter.`
          : "Not available in this mode.",
        reason: hasCorrectFirstLetterGuess()
          ? "inferred"
          : guessCount >= schedule.firstLetterAt
            ? "scheduled"
            : "locked",
      },
    ];

    const unlockedKeys = items
      .filter((item) => item.unlocked)
      .map((item) => item.key);
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
      "Old Testament": [
        "pentateuch",
        "historical-books",
        "wisdom-books",
        "major-prophets",
        "minor-prophets",
      ],
      "New Testament": [
        "gospels",
        "historical-books",
        "pauline-letters",
        "general-epistles",
        "revelation",
      ],
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
    const guess =
      typeof guessInput === "object" ? guessInput : getBookByName(guessInput);

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

  return {
    buildClueRevealState,
    canChangeDifficulty,
    compareGuess,
    getAttemptLabel,
    getCurrentModeConfig,
    getHintLines,
    getHintSchedule,
    getMaxGuesses,
    getNearestGuessDistance,
    getReferenceWithoutBookName,
    hasBookPartialGuess,
    hasCompletedTodaysDaily,
    hasCorrectFirstLetterGuess,
    hasCorrectSectionGuess,
    isAdjacentSection,
    isCurrentDailyPuzzle,
    isCurrentPracticePuzzle,
    isGameOver,
  };
}
