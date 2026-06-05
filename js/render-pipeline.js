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
} = {}) {
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

  function renderAuthState(reason = "auth-update") {
    renderAuthUI?.();
    publishBootSnapshot?.({
      renderAuthState: reason,
    });
  }

  function renderPuzzleSurface(reason = "puzzle-surface") {
    if (!assertRenderable()) return;
    renderPuzzleView();
    renderPostGamePanel?.();
    publishBootSnapshot?.({
      renderPuzzleSurface: reason,
    });
  }

  function renderStatsSurface(reason = "stats-surface") {
    renderStatsModal?.();
    bindEmptyStateActions?.(document);
    publishBootSnapshot?.({
      renderStatsSurface: reason,
    });
  }

  function renderBootComplete({ restored = false, bootReady = false } = {}) {
    renderControls();
    renderAuthState("boot-complete");
    renderPuzzleSurface(restored ? "boot-restored" : "boot-new");
    renderStatsSurface("boot-complete");

    publishBootSnapshot?.({
      bootRender: "complete",
      restored,
      bootReady,
    });
  }

  function renderPuzzleReset({ mode = state?.mode, source = "puzzle-reset" } = {}) {
    closeSuggestions?.();
    closePostGamePanel?.();
    renderControls();
    renderPuzzleSurface(source);
    renderStatsSurface(source);

    publishBootSnapshot?.({
      renderTransition: "puzzle-reset",
      mode,
      source,
    });
  }

  function renderModeSwitch({ mode = state?.mode } = {}) {
    renderControls();
    renderStatus?.("");
    publishBootSnapshot?.({
      renderTransition: "mode-switch",
      mode,
    });
  }

  function renderPreferencesChanged({ reason = "preferences-changed" } = {}) {
    renderControls();
    renderPuzzleSurface(reason);
    publishBootSnapshot?.({
      renderTransition: "preferences-changed",
      reason,
    });
  }

  function renderSyncState(reason = "sync-state") {
    renderAuthState(reason);
    publishBootSnapshot?.({
      renderTransition: "sync-state",
      reason,
    });
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
    renderSyncState,
  };
}