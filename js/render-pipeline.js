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
  publishBootSnapshot
}) {
  function assertRenderable() {
    return !!state && !!elements && typeof renderPuzzleView === "function";
  }

  function renderControls() {
    document.documentElement.setAttribute("data-mode", state?.mode === "practice" ? "practice" : "daily");
    syncPreferenceControls?.();
    renderLanguageControl?.();
    renderMobileLanguageToggle?.();
    renderThemeToggle?.();
  }

  function publish(type, payload = {}) {
    publishBootSnapshot?.(type, payload);
  }

  function renderAuthState(reason = "auth-update") {
    renderAuthUI?.();
    publish("renderAuthState", { reason });
  }

  function renderPuzzleSurface(reason = "puzzle-surface") {
    if (!assertRenderable()) return;
    renderPuzzleView?.();
    renderPostGamePanel?.();
    publish("renderPuzzleSurface", { reason });
  }

  function renderStatsSurface(reason = "stats-surface") {
    renderStatsModal?.();
    bindEmptyStateActions?.(document);
    publish("renderStatsSurface", { reason });
  }

  function runTransition({
    reason,
    mode = state?.mode,
    renderPuzzle = true,
    renderStats = false,
    renderAuth = false,
    closeTransient = false,
    statusMessage = null,
    publishType = "renderTransition",
    extra = {}
  }) {
    if (closeTransient) {
      closeSuggestions?.();
      closePostGamePanel?.();
    }

    renderControls();

    if (statusMessage) {
      renderStatus?.(statusMessage);
    }

    if (renderAuth) {
      renderAuthState(reason);
    }

    if (renderPuzzle) {
      renderPuzzleSurface(reason);
    }

    if (renderStats) {
      renderStatsSurface(reason);
    }

    publish(publishType, { reason, mode, ...extra });
  }

  function renderBootComplete(restored = false, bootReady = false) {
    runTransition({
      reason: restored ? "boot-restored" : "boot-new",
      renderPuzzle: true,
      renderStats: true,
      renderAuth: true,
      publishType: "bootRender",
      extra: { complete: true, restored, bootReady }
    });
  }

  function renderPuzzleReset({ mode = state?.mode, source = "puzzle-reset" } = {}) {
    runTransition({
      reason: source,
      mode,
      closeTransient: true,
      renderPuzzle: true,
      renderStats: true
    });
  }

  function renderModeSwitch({ mode = state?.mode } = {}) {
    runTransition({
      reason: "mode-switch",
      mode,
      renderPuzzle: false,
      renderStats: false,
      publishType: "renderTransition"
    });
  }

  function renderPreferencesChanged({ reason = "preferences-changed" } = {}) {
    runTransition({
      reason,
      renderPuzzle: true,
      renderStats: false
    });
  }

  function renderSyncState({ reason = "sync-state" } = {}) {
    runTransition({
      reason,
      renderPuzzle: false,
      renderStats: false,
      renderAuth: true
    });
  }

  function closeAllTransientUi() {
    modalService?.closeAll?.({ restoreFocus: false });
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