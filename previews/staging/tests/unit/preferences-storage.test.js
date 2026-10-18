// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "../../js/config.js";
import { createPreferencesStorage } from "../../js/preferences-storage.js";

describe("preferences storage", () => {
  let state;
  let getSystemTheme;
  let getCurrentLanguage;
  let syncCurrentStateToCloudIfSignedIn;
  let storage;

  beforeEach(() => {
    localStorage.clear();
    state = {
      mode: "daily",
      preferences: {},
    };
    getSystemTheme = vi.fn(() => "dark");
    getCurrentLanguage = vi.fn(() => state.preferences.language || "en");
    syncCurrentStateToCloudIfSignedIn = vi.fn();
    storage = createPreferencesStorage({
      state,
      config: CONFIG,
      getSystemTheme,
      getCurrentLanguage,
      syncCurrentStateToCloudIfSignedIn,
    });
  });

  it("loads defaults when storage is empty", () => {
    storage.loadPreferences();

    expect(state.mode).toBe("daily");
    expect(state.preferences).toEqual({
      theme: "dark",
      difficulty: "normal",
      preferredMode: "daily",
      language: "en",
      sound: false,
      reducedAnimation: false,
      highContrast: false,
      largeText: false,
    });
  });

  it("loads valid preferences and safely migrates missing language values", () => {
    localStorage.setItem(CONFIG.storageKeys.preferences, JSON.stringify({
      theme: "light",
      difficulty: "hard",
      preferredMode: "practice",
      sound: true,
      highContrast: true,
    }));

    storage.loadPreferences();

    expect(state.mode).toBe("practice");
    expect(state.preferences).toMatchObject({
      theme: "light",
      difficulty: "hard",
      preferredMode: "practice",
      language: "en",
      sound: true,
      highContrast: true,
      reducedAnimation: false,
      largeText: false,
    });
  });

  it("sanitizes invalid values and recovers from corrupt JSON", () => {
    localStorage.setItem(CONFIG.storageKeys.preferences, JSON.stringify({
      theme: "neon",
      difficulty: "impossible",
      preferredMode: "unknown",
      language: "fr",
      sound: "yes",
      reducedAnimation: 1,
      highContrast: false,
      largeText: true,
    }));
    storage.loadPreferences();
    expect(state.preferences).toMatchObject({
      theme: "dark",
      difficulty: "normal",
      preferredMode: "daily",
      language: "en",
      sound: false,
      reducedAnimation: false,
      highContrast: false,
      largeText: true,
    });

    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(CONFIG.storageKeys.preferences, "{invalid");
    storage.loadPreferences();
    expect(state.preferences.language).toBe("en");
    expect(warning).toHaveBeenCalledWith(
      "Unable to load preferences; using defaults:",
      expect.any(SyntaxError),
    );
  });

  it("persists the established preference keys and starts cloud synchronization", () => {
    state.preferences = {
      theme: "light",
      difficulty: "easy",
      preferredMode: "practice",
      language: "ml",
      sound: true,
      reducedAnimation: true,
      highContrast: true,
      largeText: false,
    };
    storage.savePreferences();

    expect(JSON.parse(localStorage.getItem(CONFIG.storageKeys.preferences)))
      .toEqual(state.preferences);
    expect(syncCurrentStateToCloudIfSignedIn).toHaveBeenCalledOnce();
  });

  it("reports storage write failures but still attempts cloud sync", () => {
    state.preferences = {
      theme: "dark",
      difficulty: "normal",
      preferredMode: "daily",
      language: "en",
    };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    });

    storage.savePreferences();

    expect(warning).toHaveBeenCalledWith(
      "Unable to save preferences:",
      expect.any(DOMException),
    );
    expect(syncCurrentStateToCloudIfSignedIn).toHaveBeenCalledOnce();
  });
});
