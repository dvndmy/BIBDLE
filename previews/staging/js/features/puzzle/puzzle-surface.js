export function createPuzzleSurface(deps) {
  const {
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
    renderPostGamePanel,
    buildClueRevealState,  } = deps;

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
  showWhen(elements.copyBtn, gameOver);
  showWhen(elements.postGameShareBtn, gameOver);
  showWhen(elements.postGameCopyOnlyBtn, gameOver);
  showWhen(elements.postGameCopyBtn, false);

  showWhen(elements.tryPracticeBtn, completedCurrentDaily);
  showWhen(elements.nextPracticeBtn, completedCurrentPractice);
  showWhen(elements.todayBibdleBtn, inPracticeMode && !completedTodaysDaily);
}

function renderAfterGuessOutcome({
  status = state.status,
  message = getDefaultStatusMessage(status),
  animateLatest = false,
  renderHints = status !== "won" && status !== "lost",
  renderProximity = status !== "won" && status !== "lost",
  renderPostGame = true,
}) {
  syncEndStateVisibility();

  if (renderHints) {
    renderHintBlock();
  }

  renderGuessRows(animateLatest);

  if (renderProximity) {
    renderProximityLine();
  }

  syncPreferenceControls();
  syncActionButtons();

  if (renderPostGame) {
    renderPostGamePanel();
  }

  renderStatus(message);
  saveProgress();
}

function renderPuzzleView() {
  applyLanguageToDocument();
  applyModeTheme(state.mode);
  renderLanguageControl();
  renderMobileLanguageToggle();
  renderPuzzleCard();

  if (state.status === "won") {
    renderAfterGuessOutcome({
      status: "won",
      message: getDefaultStatusMessage("won"),
      animateLatest: false,
      renderHints: false,
      renderProximity: false,
      renderPostGame: true,
    });
    publishBootSnapshot?.({ renderStatus: "won" });
    return;
  }

  if (state.status === "lost") {
    renderAfterGuessOutcome({
      status: "lost",
      message: getDefaultStatusMessage("lost"),
      animateLatest: false,
      renderHints: false,
      renderProximity: false,
      renderPostGame: true,
    });
    publishBootSnapshot?.({ renderStatus: "lost" });
    return;
  }

  renderAfterGuessOutcome({
    status: "playing",
    message: getDefaultStatusMessage("playing"),
    animateLatest: false,
    renderHints: true,
    renderProximity: true,
    renderPostGame: true,
  });

  publishBootSnapshot?.({
    renderStatus: state.guesses.length > 0 && buildClueRevealState().newlyUnlockedKeys.length > 0
      ? "new-clues"
      : "playing",
  });
}

  return {
    renderPuzzleView,
    renderAfterGuessOutcome,
    renderPuzzleCard,
    renderHintBlock,
    renderGuessRows,
    renderProximityLine,
    syncActionButtons,
  };
}