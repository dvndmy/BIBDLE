export function formatArchiveAverage(totalAttempts, solveCount) {
  if (!solveCount) return "—";
  return (totalAttempts / solveCount).toFixed(1);
}

export function computeArchiveSummary({ books, getBookStats, getLocalizedTestament, getLocalizedSection, language }) {
  const safeBooks = Array.isArray(books) ? books : [];
  const totalBooks = safeBooks.length;

  const solvedBooks = safeBooks.filter((book) => {
    const entry = getBookStats(book);
    return entry && entry.solves > 0;
  }).length;

  const completionPercentage =
    totalBooks > 0 ? Math.round((solvedBooks / totalBooks) * 100) : 0;

  const testamentSummary = safeBooks.reduce((acc, book) => {
    const label = getLocalizedTestament(book, language);
    if (!acc[label]) {
      acc[label] = { total: 0, solved: 0, totalAttempts: 0, solveCount: 0 };
    }

    acc[label].total += 1;

    const entry = getBookStats(book);
    if (entry && entry.solves > 0) {
      acc[label].solved += 1;
      acc[label].totalAttempts += entry.totalAttempts;
      acc[label].solveCount += entry.solves;
    }

    return acc;
  }, {});

  const sectionSummary = safeBooks.reduce((acc, book) => {
    const label = getLocalizedSection(book, language);
    if (!acc[label]) {
      acc[label] = { total: 0, solved: 0, totalAttempts: 0, solveCount: 0 };
    }

    acc[label].total += 1;

    const entry = getBookStats(book);
    if (entry && entry.solves > 0) {
      acc[label].solved += 1;
      acc[label].totalAttempts += entry.totalAttempts;
      acc[label].solveCount += entry.solves;
    }

    return acc;
  }, {});

  return {
    totalBooks,
    solvedBooks,
    completionPercentage,
    testamentSummary,
    sectionSummary,
  };
}

export function buildArchiveBarsViewModel(summaryObj) {
  return Object.entries(summaryObj || {}).map(([label, value]) => {
    const percentage = value.total > 0 ? (value.solved / value.total) * 100 : 0;

    return {
      label,
      solved: value.solved,
      total: value.total,
      average: formatArchiveAverage(value.totalAttempts, value.solveCount),
      percentage,
    };
  });
}

export function buildArchiveGridViewModel({
  books,
  selectedBookKey,
  language,
  getBookStats,
  getBookStatsKey,
  getArchiveCellState,
  getArchiveCellStateLabel,
  getArchiveCellAriaLabel,
  getAverageAttemptsForBook,
  getLocalizedBookName,
  getLocalizedTestament,
  getLocalizedSection,
}) {
  return (Array.isArray(books) ? books : []).map((book) => {
    const entry = getBookStats(book);
    const key = getBookStatsKey(book);
    const stateClass = getArchiveCellState(book);
    const stateLabel = getArchiveCellStateLabel(book);
    const average = getAverageAttemptsForBook(book);

    const metaLine =
      entry && entry.solves > 0
        ? `Best ${entry.bestAttempts ?? "—"} · Avg ${average ? average.toFixed(1) : "—"}`
        : entry && entry.plays > 0
        ? `Played ${entry.plays} · Unsolved`
        : `${getLocalizedTestament(book, language)} · ${getLocalizedSection(book, language)}`;

    return {
      key,
      order: book.order,
      isSelected: selectedBookKey === key,
      stateClass,
      stateLabel,
      ariaLabel: getArchiveCellAriaLabel(book),
      bookName: getLocalizedBookName(book, language),
      metaLine,
    };
  });
}

export function buildArchiveDetailsViewModel({
  book,
  language,
  getBookStats,
  getAverageAttemptsForBook,
  getArchiveCellStateLabel,
  getLocalizedBookName,
  getLocalizedTestament,
  getLocalizedSection,
}) {
  if (!book) return null;

  const entry = getBookStats(book);
  const average = getAverageAttemptsForBook(book);
  const solved = entry?.solves ?? 0;
  const plays = entry?.plays ?? 0;
  const bestAttempts = entry?.bestAttempts ?? "—";
  const lastSolvedDate = entry?.lastSolvedDate ?? "Not yet solved";
  const stateLabel = getArchiveCellStateLabel(book);

  return {
    title: getLocalizedBookName(book, language),
    subtitle: `${getLocalizedTestament(book, language)} · ${getLocalizedSection(book, language)} · Canon order ${book.order}`,
    stats: {
      plays,
      solved,
      bestAttempts,
      average: average ? average.toFixed(1) : "—",
    },
    copy: `Status: ${stateLabel}. Last solved date: ${lastSolvedDate}. This archive tracks Daily mode progress only.`,
  };
}