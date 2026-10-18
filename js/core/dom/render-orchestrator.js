export function createRenderPipeline({
  state,
  elements,
  modalService,
  renderPuzzleView,
  renderAuthUI,
  renderStatsModal,
  renderLanguageControl,
  renderMobileLanguageToggle,
  renderThemeToggle,
  syncPreferenceControls,
  renderPostGamePanel,
  renderStatus,
  bindEmptyStateActions,
  closeSuggestions,
  closePostGamePanel,
  publishBootSnapshot,
}) {
  function assertRenderable() {
    return !!state && !!elements && typeof renderPuzzleView === "function";
  }

  function renderControls() {
    document.documentElement.setAttribute(
      "data-mode",
      state?.mode === "practice" ? "practice" : "daily",
    );
    syncPreferenceControls?.();
    renderLanguageControl?.();
    renderMobileLanguageToggle?.();
    renderThemeToggle?.();
  }

  function publish(payload) {
    publishBootSnapshot?.(payload);
  }

  function renderAuthState(reason = "auth-update") {
    renderAuthUI?.();
    publish({ renderAuthState: reason });
  }

  function renderPuzzleSurface(reason = "puzzle-surface") {
    if (!assertRenderable()) return;
    renderPuzzleView();
    renderPostGamePanel?.();
    publish({ renderPuzzleSurface: reason });
  }

  function renderStatsSurface(reason = "stats-surface") {
    renderStatsModal?.();
    bindEmptyStateActions?.(document);
    publish({ renderStatsSurface: reason });
  }

  function renderBootComplete({ restored = false, bootReady = false } = {}) {
    renderControls();
    renderAuthState("boot-complete");
    renderPuzzleSurface(restored ? "boot-restored" : "boot-new");
    renderStatsSurface("boot-complete");
    publish({ bootRender: "complete", restored, bootReady });
  }

  function renderPuzzleReset(modeOrOptions = state?.mode, options = {}) {
    const config = typeof modeOrOptions === "object" && modeOrOptions
      ? modeOrOptions
      : { ...options, mode: modeOrOptions };
    const mode = config.mode ?? state?.mode;
    const source = config.source || "puzzle-reset";

    closeSuggestions?.();
    closePostGamePanel?.();
    renderControls();
    renderPuzzleSurface(source);
    renderStatsSurface(source);
    publish({ renderTransition: "puzzle-reset", mode, source });
  }

  function renderModeSwitch(modeOrOptions = {}) {
    const mode = typeof modeOrOptions === "string"
      ? modeOrOptions
      : modeOrOptions.mode ?? state?.mode;
    renderControls();
    renderStatus?.("");
    publish({ renderTransition: "mode-switch", mode });
  }

  function renderPreferencesChanged(reasonOrOptions = {}) {
    const reason = typeof reasonOrOptions === "string"
      ? reasonOrOptions
      : reasonOrOptions.reason || "preferences-changed";
    renderControls();
    renderPuzzleSurface(reason);
    publish({ renderTransition: "preferences-changed", reason });
  }

  function renderSyncState(reason = "sync-state") {
    renderAuthState(reason);
    publish({ renderTransition: "sync-state", reason });
  }

  function closeAllTransientUi() {
    modalService?.closeAll?.({
      restoreFocus: false,
    });
  }

  return {
    closeAllTransientUi,
    renderAuthState,
    renderBootComplete,
    renderControls,
    renderModeSwitch,
    renderPreferencesChanged,
    renderPuzzleReset,
    renderPuzzleSurface,
    renderStatsSurface,
    renderSyncState
  };
}