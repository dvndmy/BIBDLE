export function createLocalizationService({
  books = [],
  state,
  config,
  elements,
} = {}) {
  function getCurrentLanguage() {
    return state.preferences?.language === "ml" ? "ml" : "en";
  }

  function getSafeString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function getLocalizedValue(primary, fallback) {
    return getSafeString(primary) || getSafeString(fallback) || "";
  }

  function getLocalizedFirstLetter(book, language = getCurrentLanguage()) {
    if (!book) return "";

    const localizedName = getLocalizedBookName(book, language);
    const displayName = getSafeString(localizedName).replace(/^[123]\s*/, "").trim();

    if (!displayName) return "";

    const locale = language === "ml" ? "ml-IN" : "en-US";
    return displayName.charAt(0).toLocaleUpperCase(locale);
  }

  function normalizeBookName(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "");
  }

  function getLocalizedBookName(book, language = getCurrentLanguage()) {
    if (!book) return "";
    return language === "ml"
      ? getLocalizedValue(book.nameMl, book.name)
      : getLocalizedValue(book.name, book.nameMl);
  }

  function getLocalizedTestament(book, language = getCurrentLanguage()) {
    if (!book) return "";
    return language === "ml"
      ? getLocalizedValue(book.testamentMl, book.testament)
      : getLocalizedValue(book.testament, book.testamentMl);
  }

  function getLocalizedSection(book, language = getCurrentLanguage()) {
    if (!book) return "";
    return language === "ml"
      ? getLocalizedValue(book.sectionMl, book.section)
      : getLocalizedValue(book.section, book.sectionMl);
  }

  function getLocalizedBookIntroTitle(book, language = getCurrentLanguage()) {
    if (!book) return "";
    return language === "ml"
      ? getLocalizedValue(book.bookIntroTitleMl, book.bookIntroTitle)
      : getLocalizedValue(book.bookIntroTitle, book.bookIntroTitleMl);
  }

  function getLocalizedBookIntroText(book, language = getCurrentLanguage()) {
    if (!book) return "";
    return language === "ml"
      ? getLocalizedValue(book.bookIntroTextMl, book.bookIntroText)
      : getLocalizedValue(book.bookIntroText, book.bookIntroTextMl);
  }

  function getLocalizedReference(verse, language = getCurrentLanguage()) {
    if (!verse) return "";
    return language === "ml"
      ? getLocalizedValue(verse.referenceMl, verse.reference)
      : getLocalizedValue(verse.reference, verse.referenceMl);
  }

  function getLocalizedVerseText(verse, language = getCurrentLanguage()) {
    if (!verse) return "";
    return language === "ml"
      ? getLocalizedValue(verse.textMl, verse.text)
      : getLocalizedValue(verse.text, verse.textMl);
  }

  function getLocalizedClue(verse, language = getCurrentLanguage()) {
    if (!verse) return "";
    return language === "ml"
      ? getLocalizedValue(verse.clueMl, verse.clue)
      : getLocalizedValue(verse.clue, verse.clueMl);
  }

  function getLocalizedExplanation(verse, language = getCurrentLanguage()) {
    if (!verse) return "";
    return language === "ml"
      ? getLocalizedValue(verse.explanationMl, verse.explanation)
      : getLocalizedValue(verse.explanation, verse.explanationMl);
  }

  function getLocalizedThemes(item, language = getCurrentLanguage()) {
    const englishThemes = Array.isArray(item?.themes)
      ? item.themes
      : Array.isArray(item?.bookThemes)
        ? item.bookThemes
        : [];

    const malayalamThemes = Array.isArray(item?.themesMl)
      ? item.themesMl
      : Array.isArray(item?.bookThemesMl)
        ? item.bookThemesMl
        : [];

    const source = language === "ml" ? malayalamThemes : englishThemes;
    const fallback = language === "ml" ? englishThemes : [];

    return (source.length ? source : fallback).filter(
      (value) => typeof value === "string" && value.trim().length > 0,
    );
  }

  function getBookAliases(book) {
    if (!book) return [];
    const aliases = new Map();

    const addAlias = (label, source) => {
      const value = getSafeString(label);
      const normalized = normalizeBookName(value);
      if (!value || !normalized) return;
      aliases.set(normalized, {
        value,
        normalized,
        source,
        bookId: book.id,
      });
    };

    addAlias(book.name, "en");
    addAlias(book.nameMl, "ml");

    return Array.from(aliases.values());
  }

  function getBookById(bookId) {
    return books.find((book) => book.id === bookId) ?? null;
  }

  function getCanonicalBookId(input) {
    if (!input) return "";
    if (typeof input === "object" && input.id) return input.id;
    const byName = getBookByName(input);
    return byName?.id || "";
  }

  function getBookByName(name) {
    const normalized = normalizeBookName(name);

    return books.find((book) => {
      if (normalizeBookName(book.normalizedName) === normalized) return true;
      return getBookAliases(book).some((alias) => alias.normalized === normalized);
    }) ?? null;
  }

  function isBookAlreadyGuessed(bookId) {
    return state.guesses.some((guess) => guess.bookId === bookId);
  }

  function getSuggestionCandidates(query, language = getCurrentLanguage()) {
    const normalizedQuery = normalizeBookName(query);
    if (!normalizedQuery) return [];

    const ranked = [];

    books.forEach((book) => {
      const aliases = getBookAliases(book);
      const matchingAliases = aliases.filter((alias) =>
        alias.normalized.includes(normalizedQuery),
      );

      if (!matchingAliases.length || isBookAlreadyGuessed(book.id)) return;

      const exactMatch = matchingAliases.some(
        (alias) => alias.normalized === normalizedQuery,
      );
      const startsWithMatch = matchingAliases.some((alias) =>
        alias.normalized.startsWith(normalizedQuery),
      );
      const matchedMl = matchingAliases.some((alias) => alias.source === "ml");
      const matchedEn = matchingAliases.some((alias) => alias.source === "en");

      if (language === "en") {
        if (!matchedEn) return;

        ranked.push({
          bookId: book.id,
          primaryLabel: getLocalizedBookName(book, "en"),
          secondaryLabel: "",
          matchSource: "en",
          score: exactMatch ? 0 : startsWithMatch ? 1 : 2,
        });
        return;
      }

      const primaryLabel = getLocalizedBookName(book, "ml");
      const englishLabel = getLocalizedBookName(book, "en");

      ranked.push({
        bookId: book.id,
        primaryLabel,
        secondaryLabel: primaryLabel !== englishLabel ? englishLabel : "",
        matchSource: matchedMl ? "ml" : "en",
        score: exactMatch ? 0 : startsWithMatch ? 1 : 2,
      });
    });

    return ranked
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        if (language === "ml" && a.matchSource !== b.matchSource) {
          return a.matchSource === "ml" ? -1 : 1;
        }
        return a.primaryLabel.localeCompare(
          b.primaryLabel,
          language === "ml" ? "ml" : "en",
        );
      })
      .slice(0, config.ui.maxSuggestions);
  }

  function applyLanguageToDocument() {
    const language = getCurrentLanguage();
    document.documentElement.lang = language;
    document.documentElement.setAttribute("lang-mode", language);
  }

  function renderLanguageControl() {
    if (elements.languageSelect) {
      elements.languageSelect.value = getCurrentLanguage();
    }
  }

  function getDisplayBookNameFromGuess(guess) {
    const book = getBookById(guess?.bookId);
    return getLocalizedBookName(book, getCurrentLanguage()) || guess?.book || "";
  }

  return {
    applyLanguageToDocument,
    getBookAliases,
    getBookById,
    getBookByName,
    getCanonicalBookId,
    getCurrentLanguage,
    getDisplayBookNameFromGuess,
    getLocalizedBookIntroText,
    getLocalizedBookIntroTitle,
    getLocalizedBookName,
    getLocalizedClue,
    getLocalizedExplanation,
    getLocalizedFirstLetter,
    getLocalizedReference,
    getLocalizedSection,
    getLocalizedTestament,
    getLocalizedThemes,
    getLocalizedValue,
    getLocalizedVerseText,
    getSafeString,
    getSuggestionCandidates,
    isBookAlreadyGuessed,
    normalizeBookName,
    renderLanguageControl,
  };
}
