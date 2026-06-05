function isElement(node) {
    return node instanceof HTMLElement;
}

function closest(target, selector) {
    return isElement(target) ? target.closest(selector) : null;
}

export function createBindings({
    elements,
    state,
    modalService,
    handlers,
} = {}) {
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
        elements.settingsBtn?.addEventListener("click", (event) => { handlers.openSettingsModal(event.currentTarget); });
    }

    function handleDelegatedClick(event) {
        const target = event.target;
        if (!isElement(target)) return;

        const guessForm = elements.guessForm;
        if (guessForm && !guessForm.contains(target)) {
            handlers.handleDocumentClick(event);
        }

        const emptyAction = closest(target, "[data-empty-action]");
        if (emptyAction) {
            return;
        }

        if (closest(target, "#helpBtn")) {
            handlers.openHelpModal(event.currentTarget || target);
            return;
        }

        if (closest(target, "#closeHelpBtn")) {
            handlers.closeHelpModal();
            return;
        }

        if (closest(target, "#settingsBtn")) {
            handlers.openSettingsModal(target);
            return;
        }

        if (closest(target, "#closeSettingsBtn")) {
            handlers.closeSettingsModal();
            return;
        }

        if (closest(target, "#statsBtn")) {
            handlers.openStatsModal(target);
            return;
        }

        if (closest(target, "#closeStatsBtn")) {
            handlers.closeStatsModal();
            return;
        }

        if (closest(target, "#archiveBtn")) {
            handlers.openArchiveModal(target);
            return;
        }

        if (closest(target, "#closeArchiveBtn")) {
            handlers.closeArchiveModal();
            return;
        }

        if (closest(target, "#leaderboardBtn")) {
            event.preventDefault();
            handlers.openLeaderboardModal(target);
            return;
        }

        if (closest(target, "#closeLeaderboardBtn")) {
            handlers.closeLeaderboardModal();
            return;
        }

        if (closest(target, "#todayBibdleBtn")) {
            event.preventDefault();
            handlers.handleTryTodaysBibdle();
            return;
        }

        if (closest(target, "#tryPracticeBtn")) {
            event.preventDefault();
            handlers.handleTryPracticeRound();
            return;
        }

        if (closest(target, "#postGameLeaderboardBtn")) {
            event.preventDefault();
            handlers.handlePostGameLeaderboardOpen();
            return;
        }

        if (closest(target, "#postGameCopyBtn")) {
            handlers.copyResult();
            return;
        }

        if (closest(target, "#shareBtn")) {
            handlers.copyResult();
            return;
        }

        if (closest(target, "#signInBtn")) {
            handlers.handleSignIn();
            return;
        }

        if (closest(target, "#signOutBtn")) {
            handlers.handleSignOut();
            return;
        }

        if (closest(target, "#mobileLanguageToggle")) {
            handlers.handleMobileLanguageToggle();
            return;
        }

        if (closest(target, "#nextPracticeBtn") || closest(target, "#postGameNextBtn")) {
            handlers.handleNextPracticePuzzle();
            return;
        }

        if (closest(target, "#postGamePracticeBtn")) {
            handlers.handlePostGamePracticeStart();
            return;
        }
        
        if (closest(target, "#postGameCloseBtn")) {
            handlers.closePostGamePanel();
            return;
        }
    }

    function bindDocumentDelegation() {
        document.addEventListener("click", handleDelegatedClick);
    }

    function bindModalDelegation() {
        modalService?.bindGlobalHandlers?.();
    }

    function bindAll() {
        if (bound || state.ui?.bindingsBound) {
            return;
        }

        bindGameplay();
        bindControls();
        bindDocumentDelegation();
        bindModalDelegation();
        handlers.bindEmptyStateActions(document);

        bound = true;
        if (!state.ui) state.ui = {};
        state.ui.bindingsBound = true;
    }

    return {
        bindAll,
    };
}