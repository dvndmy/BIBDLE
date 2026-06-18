export function createArchiveSurface({
  elements,
  books,
  getCurrentLanguage,
  computeArchiveSummary,
  buildArchiveBarsViewModel,
  buildArchiveGridViewModel,
  buildArchiveDetailsViewModel,
  getBookStats,
  getBookStatsKey,
  getArchiveCellState,
  getArchiveCellStateLabel,
  getArchiveCellAriaLabel,
  getAverageAttemptsForBook,
  getLocalizedBookName,
  getLocalizedTestament,
  getLocalizedSection,
  renderInto,
  renderEmptyState,
  escapeHtml,
}) {
  function renderArchiveSummary() {
    if (!elements.archiveSummary) return;

    const summary = computeArchiveSummary();
    const testamentBars = buildArchiveBarsViewModel(summary.testamentSummary);
    const sectionBars = buildArchiveBarsViewModel(summary.sectionSummary);

    const renderBars = (bars) =>
      bars
        .map(
          (item) => `
            <div class="archive-bar-row">
              <div class="archive-bar-topline">
                <span class="archive-bar-label">${escapeHtml(item.label)}</span>
                <span>${item.solved}/${item.total} · Avg ${escapeHtml(item.average)}</span>
              </div>
              <div class="archive-bar-track" aria-hidden="true">
                <div class="archive-bar-fill" style="width: ${item.percentage}%"></div>
              </div>
            </div>
          `,
        )
        .join("");

    elements.archiveSummary.innerHTML = `
      <div class="archive-summary-blocks">
        <section class="archive-summary-group ui-card section-shell section-shell--subtle" aria-label="Overall archive progress">
          <div class="section-shell__header">
            <p class="archive-summary-title">Overall</p>
          </div>
          <div class="section-shell__body">
            <div class="archive-kpis">
              <div class="archive-kpi stat-block">
                <span class="archive-kpi-value">${summary.solvedBooks}/${summary.totalBooks}</span>
                <span class="archive-kpi-label">Books solved</span>
              </div>
              <div class="archive-kpi stat-block">
                <span class="archive-kpi-value">${summary.completionPercentage}%</span>
                <span class="archive-kpi-label">Canon complete</span>
              </div>
            </div>
          </div>
        </section>

        <section class="archive-stat-group ui-card section-shell section-shell--subtle" aria-label="Solved books by testament">
          <div class="section-shell__header">
            <h3>By testament</h3>
          </div>
          <div class="section-shell__body">
            <div class="archive-bars">
              ${renderBars(testamentBars)}
            </div>
          </div>
        </section>

        <section class="archive-stat-group ui-card section-shell section-shell--subtle" aria-label="Solved books by section">
          <div class="section-shell__header">
            <h3>By section</h3>
          </div>
          <div class="section-shell__body">
            <div class="archive-bars">
              ${renderBars(sectionBars)}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function renderArchiveGrid(selectedBookKey) {
    if (!elements.archiveGrid) return;

    const language = getCurrentLanguage();
    const cells = buildArchiveGridViewModel({
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
    });

    elements.archiveGrid.innerHTML = cells
      .map(
        (cell) => `
          <button
            type="button"
            class="archive-cell ${cell.stateClass} ${cell.isSelected ? "is-selected" : ""}"
            data-book-key="${escapeHtml(cell.key)}"
            aria-label="${escapeHtml(cell.ariaLabel)}"
            aria-pressed="${cell.isSelected ? "true" : "false"}"
          >
            <div class="archive-cell-top">
              <span class="archive-cell-order">${cell.order}</span>
              <span class="archive-cell-state">${escapeHtml(cell.stateLabel)}</span>
            </div>
            <div class="archive-cell-book">${escapeHtml(cell.bookName)}</div>
            <div class="archive-cell-meta">${escapeHtml(cell.metaLine)}</div>
          </button>
        `,
      )
      .join("");
  }

  function renderArchiveDetails(bookKey) {
    if (!elements.archiveDetails) return;

    const book = books.find((item) => getBookStatsKey(item) === bookKey) ?? null;

    if (!book) {
      renderInto(
        elements.archiveDetails,
        renderEmptyState({
          title: "No book selected",
          body: "Choose a book from the archive map to view its Daily progress details.",
          compact: false,
          inline: false,
          showMarker: true,
          tone: "empty",
        }),
      );
      return;
    }

    const details = buildArchiveDetailsViewModel({
      book,
      language: getCurrentLanguage(),
      getBookStats,
      getAverageAttemptsForBook,
      getArchiveCellStateLabel,
      getLocalizedBookName,
      getLocalizedTestament,
      getLocalizedSection,
    });

    renderInto(
      elements.archiveDetails,
      `
        <div class="archive-details-header">
          <div class="archive-details-title">${escapeHtml(details.title)}</div>
          <div class="archive-details-subtitle">${escapeHtml(details.subtitle)}</div>
        </div>
        <div class="archive-details-grid">
          <div class="archive-detail-stat">
            <span class="archive-detail-stat-value">${details.stats.plays}</span>
            <span class="archive-detail-stat-label">Daily plays</span>
          </div>
          <div class="archive-detail-stat">
            <span class="archive-detail-stat-value">${details.stats.solved}</span>
            <span class="archive-detail-stat-label">Daily solves</span>
          </div>
          <div class="archive-detail-stat">
            <span class="archive-detail-stat-value">${details.stats.bestAttempts}</span>
            <span class="archive-detail-stat-label">Best attempts</span>
          </div>
          <div class="archive-detail-stat">
            <span class="archive-detail-stat-value">${details.stats.average}</span>
            <span class="archive-detail-stat-label">Average attempts</span>
          </div>
        </div>
        <p class="archive-details-copy">${escapeHtml(details.copy)}</p>
      `,
    );
  }

  return {
    renderArchiveSummary,
    renderArchiveGrid,
    renderArchiveDetails,
  };
}