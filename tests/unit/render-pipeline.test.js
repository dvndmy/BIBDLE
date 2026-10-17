// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { createRenderPipeline } from "../../js/render-pipeline.js";

describe("render pipeline", () => {
  it("coordinates boot rendering in dependency order and publishes readiness", () => {
    const calls = [];
    const pipeline = createRenderPipeline({
      state: { mode: "daily" },
      elements: {},
      renderPuzzleView: () => calls.push("puzzle"),
      renderAuthUI: () => calls.push("auth"),
      renderStatsModal: () => calls.push("stats"),
      renderLanguageControl: () => calls.push("language"),
      renderMobileLanguageToggle: () => calls.push("mobile-language"),
      renderThemeToggle: () => calls.push("theme"),
      syncPreferenceControls: () => calls.push("preferences"),
      renderPostGamePanel: () => calls.push("post-game"),
      bindEmptyStateActions: () => calls.push("empty-actions"),
      publishBootSnapshot: vi.fn((snapshot) => calls.push(snapshot)),
    });

    pipeline.renderBootComplete({ restored: true, bootReady: true });

    expect(calls).toEqual([
      "preferences",
      "language",
      "mobile-language",
      "theme",
      "auth",
      { renderAuthState: "boot-complete" },
      "puzzle",
      "post-game",
      { renderPuzzleSurface: "boot-restored" },
      "stats",
      "empty-actions",
      { renderStatsSurface: "boot-complete" },
      {
        bootRender: "complete",
        restored: true,
        bootReady: true,
      },
    ]);
  });

  it("closes transient interfaces on puzzle reset and handles optional surfaces", () => {
    const closeSuggestions = vi.fn();
    const closePostGamePanel = vi.fn();
    const closeAll = vi.fn();
    const renderPuzzleView = vi.fn();
    const renderStatus = vi.fn();
    const pipeline = createRenderPipeline({
      state: { mode: "practice" },
      elements: {},
      modalService: { closeAll },
      renderPuzzleView,
      closeSuggestions,
      closePostGamePanel,
      renderStatus,
    });

    pipeline.renderPuzzleReset({ mode: "practice", source: "next-puzzle" });
    pipeline.renderModeSwitch({ mode: "daily" });
    pipeline.closeAllTransientUi();
    pipeline.renderPuzzleSurface();

    expect(closeSuggestions).toHaveBeenCalledOnce();
    expect(closePostGamePanel).toHaveBeenCalledOnce();
    expect(renderPuzzleView).toHaveBeenCalledTimes(2);
    expect(renderStatus).toHaveBeenCalledWith("");
    expect(closeAll).toHaveBeenCalledWith({ restoreFocus: false });
  });
});
