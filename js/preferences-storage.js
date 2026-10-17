export function createPreferencesStorage({
  state,
  config,
  getSystemTheme,
  getCurrentLanguage,
  syncCurrentStateToCloudIfSignedIn,
} = {}) {
  function savePreferences() {
    const payload = {
      theme: state.preferences.theme,
      difficulty: state.preferences.difficulty,
      preferredMode: state.preferences.preferredMode,
      language: getCurrentLanguage(),
      sound: state.preferences.sound,
      reducedAnimation: state.preferences.reducedAnimation,
      highContrast: state.preferences.highContrast,
      largeText: state.preferences.largeText,
    };

    try {
      localStorage.setItem(
        config.storageKeys.preferences,
        JSON.stringify(payload),
      );
    } catch (error) {
      console.warn("Unable to save preferences:", error);
    }

    syncCurrentStateToCloudIfSignedIn();
  }

  function loadPreferences() {
    const defaults = {
      theme: getSystemTheme(),
      difficulty: "normal",
      preferredMode: "daily",
      language: "en",
      sound: false,
      reducedAnimation: false,
      highContrast: false,
      largeText: false,
    };

    try {
      const raw = localStorage.getItem(config.storageKeys.preferences);

      if (!raw) {
        state.preferences = defaults;
        state.mode = defaults.preferredMode;
        return;
      }

      const saved = JSON.parse(raw);

      state.preferences = {
        theme:
          saved?.theme === "light" || saved?.theme === "dark"
            ? saved.theme
            : defaults.theme,
        difficulty:
          saved?.difficulty && config.modes[saved.difficulty]
            ? saved.difficulty
            : defaults.difficulty,
        preferredMode:
          saved?.preferredMode === "practice"
            ? "practice"
            : defaults.preferredMode,
        language: saved?.language === "ml" ? "ml" : defaults.language,
        sound: typeof saved?.sound === "boolean" ? saved.sound : defaults.sound,
        reducedAnimation:
          typeof saved?.reducedAnimation === "boolean"
            ? saved.reducedAnimation
            : defaults.reducedAnimation,
        highContrast:
          typeof saved?.highContrast === "boolean"
            ? saved.highContrast
            : defaults.highContrast,
        largeText:
          typeof saved?.largeText === "boolean"
            ? saved.largeText
            : defaults.largeText,
      };
    } catch (error) {
      console.warn("Unable to load preferences; using defaults:", error);
      state.preferences = defaults;
    }

    state.mode = state.preferences.preferredMode;
  }

  return {
    loadPreferences,
    savePreferences,
  };
}
