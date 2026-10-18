// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { books } from "../../js/data/books.js";
import { verses } from "../../js/data/verses.js";
import { CONFIG } from "../../js/config.js";
import { createLocalizationService } from "../../js/localization-service.js";

describe("localization and book search", () => {
  let state;
  let elements;
  let service;

  beforeEach(() => {
    state = {
      preferences: { language: "en" },
      guesses: [],
    };
    elements = { languageSelect: { value: "" } };
    service = createLocalizationService({ books, state, config: CONFIG, elements });
  });

  it("normalizes Unicode names, punctuation, and zero-width characters", () => {
    expect(service.normalizeBookName(" 1 Corinthians ")).toBe("1corinthians");
    expect(service.normalizeBookName("Genesis\u200B")).toBe("genesis");
    expect(service.normalizeBookName("ഉല്പത്തി")).toBe(
      service.normalizeBookName("ഉല്പത്തി"),
    );
    expect(service.getBookByName("GENESIS")?.id).toBe("genesis");
    expect(service.getBookByName("ഉല്പത്തി")?.id).toBe("genesis");
  });

  it("uses the selected language and safely falls back to available content", () => {
    const genesis = service.getBookById("genesis");
    const verse = verses.find((item) => item.bookId === "genesis");

    expect(service.getLocalizedBookName(genesis, "en")).toBe("Genesis");
    expect(service.getLocalizedBookName(genesis, "ml")).toBe("ഉല്പത്തി");
    expect(service.getLocalizedBookIntroText(genesis, "en")).toBe(
      genesis.bookIntroText,
    );
    expect(service.getLocalizedBookIntroText(genesis, "ml")).toBe(
      genesis.bookIntroTextMl,
    );
    expect(service.getLocalizedThemes(genesis, "en")).toEqual(genesis.bookThemes);
    expect(service.getLocalizedThemes(genesis, "ml")).toEqual(genesis.bookThemesMl);
    expect(service.getLocalizedReference(verse, "ml")).toBe(verse.referenceMl);
    expect(
      service.getLocalizedValue("", "English fallback"),
    ).toBe("English fallback");
    expect(
      service.getLocalizedBookIntroText(
        { bookIntroText: "English only" },
        "ml",
      ),
    ).toBe("English only");
    expect(service.getLocalizedBookName(null, "en")).toBe("");
  });

  it("normalizes malformed theme data and uses English themes as Malayalam fallback", () => {
    expect(
      service.getLocalizedThemes(
        { themes: [" Creation ", "", 5], themesMl: [] },
        "ml",
      ),
    ).toEqual([" Creation "]);
    expect(service.getLocalizedThemes({ themes: "invalid" }, "en")).toEqual([]);
  });

  it("ranks and localizes suggestions while enforcing canonical duplicate protection", () => {
    const englishSuggestions = service.getSuggestionCandidates("gen", "en");
    expect(englishSuggestions[0]).toMatchObject({
      bookId: "genesis",
      primaryLabel: "Genesis",
      secondaryLabel: "",
      matchSource: "en",
      score: 1,
    });

    const malayalamSuggestions = service.getSuggestionCandidates("Genesis", "ml");
    expect(malayalamSuggestions[0]).toMatchObject({
      bookId: "genesis",
      primaryLabel: "ഉല്പത്തി",
      secondaryLabel: "Genesis",
      matchSource: "en",
    });

    state.guesses.push({ bookId: "genesis" });
    expect(
      service.getSuggestionCandidates("Genesis", "ml").some(
        (suggestion) => suggestion.bookId === "genesis",
      ),
    ).toBe(false);
    expect(service.isBookAlreadyGuessed("genesis")).toBe(true);
    expect(service.getCanonicalBookId("ഉല്പത്തി")).toBe("genesis");
    expect(service.getCanonicalBookId({ id: "genesis" })).toBe("genesis");
    expect(service.getCanonicalBookId("unknown")).toBe("");
  });

  it("caps suggestions and updates document and visible language controls", () => {
    expect(service.getSuggestionCandidates("a", "en")).toHaveLength(
      CONFIG.ui.maxSuggestions,
    );

    state.preferences.language = "ml";
    service.applyLanguageToDocument();
    service.renderLanguageControl();

    expect(document.documentElement.lang).toBe("ml");
    expect(document.documentElement.getAttribute("lang-mode")).toBe("ml");
    expect(elements.languageSelect.value).toBe("ml");
    expect(service.getDisplayBookNameFromGuess({ bookId: "genesis" })).toBe(
      "ഉല്പത്തി",
    );
  });
});
