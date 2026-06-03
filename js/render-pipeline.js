export function createRenderPipeline({
  state,
  elements,
  renderPuzzleView,
  renderAuthUI,
  renderStatsModal,
  syncPreferenceControls,
  renderLanguageControl,
  renderMobileLanguageToggle,
} = {}) {
  function assertRenderable() {
    return !!state && !!elements && typeof renderPuzzleView === "function";
  }

  function renderStartupShell() {
    if (!assertRenderable()) return;

    syncPreferenceControls?.();
    renderLanguageControl?.();
    renderMobileLanguageToggle?.();
    renderAuthUI?.();
  }

  function renderStartupView() {
    if (!assertRenderable()) return;

    renderStartupShell();
    renderPuzzleView();

    if (typeof renderStatsModal === "function") {
      renderStatsModal();
    }
  }

  return {
    renderStartupShell,
    renderStartupView,
  };
}