function isElement(node) {
  return node instanceof HTMLElement;
}

function closest(target, selector) {
  return isElement(target) ? target.closest(selector) : null;
}

function runIfMatch(target, selector, callback, event, options = {}) {
  const match = closest(target, selector);
  if (!match) return false;

  if (options.preventDefault) {
    event.preventDefault();
  }

  callback(match, event);
  return true;
}

export function createBindings({ elements, state, modalService, handlers }) {
  let bound = false;

  function bindGameplay() {
    elements.guessForm?.addEventListener("submit", handlers.handleGuessSubmit);
    elements.guessInput?.addEventListener("input", handlers.handleGuessInput);
    elements.guessInput?.addEventListener("keydown", handlers.handleGuessKeydown);
    elements.autocomplete?.addEventListener("click", handlers.handleSuggestionClick);
    elements.archiveGrid?.addEventListener("click", handlers.handleArchiveGridClick);
  }

  function bindControls() {
    elements.themeToggle?.addEventListener("click", handlers.handleThemeToggle);
    elements.languageSelect?.addEventListener("change", handlers.handleLanguageChange);
    elements.difficultySelect?.addEventListener("change", handlers.handleDifficultyChange);
    elements.modeSelect?.addEventListener("change", handlers.handleModeChange);
    elements.reducedMotionToggle?.addEventListener("change", handlers.handleReducedMotionToggle);
    elements.highContrastToggle?.addEventListener("change", handlers.handleHighContrastToggle);
    elements.largeTextToggle?.addEventListener("change", handlers.handleLargeTextToggle);
    elements.soundToggle?.addEventListener("change", handlers.handleSoundToggle);
    elements.settingsBtn?.addEventListener("click", (event) => handlers.openSettingsModal(event.currentTarget));
  }

  function getDelegatedActions(target, event) {
    return [
      { selector: "#helpBtn", run: (match) => handlers.openHelpModal(event.currentTarget ?? match) },
      { selector: "#closeHelpBtn", run: () => handlers.closeHelpModal() },
      { selector: "#settingsBtn", run: (match) => handlers.openSettingsModal(match) },
      { selector: "#closeSettingsBtn", run: () => handlers.closeSettingsModal() },
      { selector: "#statsBtn", run: (match) => handlers.openStatsModal(match) },
      { selector: "#closeStatsBtn", run: () => handlers.closeStatsModal() },
      { selector: "#archiveBtn", run: (match) => handlers.openArchiveModal(match) },
      { selector: "#closeArchiveBtn", run: () => handlers.closeArchiveModal() },
      { selector: "#leaderboardBtn", preventDefault: true, run: (match) => handlers.openLeaderboardModal(match) },
      { selector: "#closeLeaderboardBtn", run: () => handlers.closeLeaderboardModal() },
      { selector: "#todayBibdleBtn", preventDefault: true, run: () => handlers.handleTryTodaysBibdle() },
      { selector: "#tryPracticeBtn", preventDefault: true, run: () => handlers.handleTryPracticeRound() },
      { selector: "#postGameLeaderboardBtn", preventDefault: true, run: () => handlers.handlePostGameLeaderboardOpen() },
      { selector: "#postGameCopyOnlyBtn", run: () => handlers.copyResult() },
      { selector: "#shareBtn", run: () => handlers.shareResult() },
      { selector: "#postGameShareBtn", run: () => handlers.shareResult() },
      { selector: "#copyBtn", run: () => handlers.copyResult() },
      { selector: "#signInBtn", run: () => handlers.handleSignIn() },
      { selector: "#signOutBtn", run: () => handlers.handleSignOut() },
      { selector: "#mobileLanguageToggle", run: () => handlers.handleMobileLanguageToggle() },
      { selector: "#nextPracticeBtn, #postGameNextBtn", run: () => handlers.handleNextPracticePuzzle() },
      { selector: "#postGamePracticeBtn", run: () => handlers.handlePostGamePracticeStart() },
      { selector: "#postGameCloseBtn", run: () => handlers.closePostGamePanel() }
    ];
  }

  function handleDelegatedClick(event) {
    const target = event.target;
    if (!isElement(target)) return;

    const guessForm = elements.guessForm;
    if (guessForm && !guessForm.contains(target)) {
      handlers.handleDocumentClick(event);
    }

    const emptyAction = closest(target, "[data-empty-action]");
    if (emptyAction) return;

    const actions = getDelegatedActions(target, event);
    for (const action of actions) {
      const handled = runIfMatch(
        target,
        action.selector,
        (match) => action.run(match, event),
        event,
        { preventDefault: !!action.preventDefault }
      );

      if (handled) return;
    }
  }

  function bindDocumentDelegation() {
    document.addEventListener("click", handleDelegatedClick);
  }

  function bindModalDelegation() {
    modalService?.bindGlobalHandlers?.();
  }

  function bindAll() {
    if (bound || state.ui?.bindingsBound) return;

    bindGameplay();
    bindControls();
    bindDocumentDelegation();
    bindModalDelegation();
    handlers.bindEmptyStateActions?.(document);

    bound = true;
    if (!state.ui) state.ui = {};
    state.ui.bindingsBound = true;
  }

  return {
    bindAll
  };
}