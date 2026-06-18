export function formatTriviaLabel(value) {
  if (!value) return "";
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildTriviaContent(puzzle, book, helpers) {
  const {
    language,
    getLocalizedThemes,
    getLocalizedTestament,
    getLocalizedSection,
    getLocalizedBookName,
    getLocalizedValue,
    getLocalizedClue,
    getLocalizedBookIntroTitle,
    getLocalizedExplanation,
  } = helpers;

  if (!puzzle && !book) {
    return { title: "", text: "", chips: [] };
  }

  const verseThemes = getLocalizedThemes(puzzle, language);
  const bookThemes = getLocalizedThemes(book, language);
  const combinedThemes = [...new Set([...verseThemes, ...bookThemes])].slice(0, 3);

  const chips = [];

  if (book) {
    const testament = getLocalizedTestament(book, language);
    const section = getLocalizedSection(book, language);
    if (testament) chips.push(testament);
    if (section) chips.push(section);
  }

  if (combinedThemes.length) {
    chips.push(`Themes: ${combinedThemes.join(", ")}`);
  }

  if (puzzle?.difficulty) {
    chips.push(`Difficulty: ${formatTriviaLabel(puzzle.difficulty)}`);
  }

  const localizedBookName =
    getLocalizedBookName(book, language) ||
    getLocalizedValue(puzzle?.bookMl, puzzle?.book);

  const title =
    getLocalizedClue(puzzle, language) ||
    getLocalizedBookIntroTitle(book, language) ||
    `Learn more about ${localizedBookName || "this book"}`;

  const textParts = [];
  const explanation = getLocalizedExplanation(puzzle, language);
  const clue = getLocalizedClue(puzzle, language);

  if (explanation) {
    textParts.push(explanation);
  } else if (clue) {
    textParts.push(clue);
  }

  if (bookThemes.length) {
    textParts.push(
      `${localizedBookName} often emphasizes themes such as ${bookThemes
        .slice(0, 3)
        .join(", ")}.`,
    );
  } else if (verseThemes.length) {
    textParts.push(
      `This verse highlights themes such as ${verseThemes.slice(0, 3).join(", ")}.`,
    );
  }

  if (puzzle?.devotional) {
    textParts.push(puzzle.devotional);
  }

  const uniqueParts = [];
  textParts.forEach((part) => {
    const trimmed = String(part || "").trim();
    if (!trimmed) return;
    if (uniqueParts.includes(trimmed)) return;
    uniqueParts.push(trimmed);
  });

  return {
    title,
    text: uniqueParts.slice(0, 2).join(" "),
    chips,
  };
}

export function buildPostGameContent({ state, getCurrentLanguage, getBookByName, helpers }) {
  const puzzle = state.currentPuzzle?.verse;
  if (!puzzle) return null;

  const language = getCurrentLanguage();
  const book = getBookByName(puzzle.book);

  return {
    title: state.status === "won" ? "Well done" : "Game over",
    badge: state.status === "won" ? "Solved" : "Failed",
    reference: helpers.getLocalizedReference(puzzle, language),
    bookName:
      helpers.getLocalizedBookName(book, language) ||
      helpers.getLocalizedValue(puzzle.bookMl, puzzle.book),
    verseText: helpers.getLocalizedVerseText(puzzle, language),
    explanation: helpers.getLocalizedExplanation(puzzle, language),
    introTitle: helpers.getLocalizedBookIntroTitle(book, language),
    introText: helpers.getLocalizedBookIntroText(book, language),
    devotionalText: puzzle.devotional ?? book?.devotionalText ?? "",
    trivia: buildTriviaContent(puzzle, book, {
      language,
      ...helpers,
    }),
  };
}