// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBindings } from "../../js/bindings.js";

describe("event bindings", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="guessForm"><input id="guessInput"><div id="autocomplete"></div></form>
      <button id="helpBtn"><span>Help</span></button>
      <button id="settingsBtn"></button>
      <div id="archiveGrid"></div>
    `;
  });

  it("binds gameplay, controls, and delegated actions only once", () => {
    const handlerNames = [
      "handleGuessSubmit",
      "handleGuessInput",
      "handleGuessKeydown",
      "handleSuggestionClick",
      "handleArchiveGridClick",
      "handleThemeToggle",
      "handleLanguageChange",
      "handleDifficultyChange",
      "handleModeChange",
      "handleReducedMotionToggle",
      "handleHighContrastToggle",
      "handleLargeTextToggle",
      "handleSoundToggle",
      "handleDocumentClick",
      "openHelpModal",
      "closeHelpModal",
      "openSettingsModal",
      "closeSettingsModal",
      "bindEmptyStateActions",
    ];
    const handlers = Object.fromEntries(
      handlerNames.map((name) => [name, vi.fn()]),
    );
    const state = { ui: {} };
    const bindGlobalHandlers = vi.fn();
    const bindings = createBindings({
      elements: {
        guessForm: document.getElementById("guessForm"),
        guessInput: document.getElementById("guessInput"),
        autocomplete: document.getElementById("autocomplete"),
        archiveGrid: document.getElementById("archiveGrid"),
        settingsBtn: document.getElementById("settingsBtn"),
      },
      state,
      modalService: { bindGlobalHandlers },
      handlers,
    });

    bindings.bindAll();
    bindings.bindAll();
    document.getElementById("guessInput")
      .dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("#helpBtn span").click();

    expect(state.ui.bindingsBound).toBe(true);
    expect(bindGlobalHandlers).toHaveBeenCalledOnce();
    expect(handlers.bindEmptyStateActions).toHaveBeenCalledOnce();
    expect(handlers.handleGuessInput).toHaveBeenCalledOnce();
    expect(handlers.openHelpModal).toHaveBeenCalledOnce();
  });
});
