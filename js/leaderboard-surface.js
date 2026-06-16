export function createLeaderboardSurface({
  state,
  elements,
  bindEmptyStateActions,
  formatLeaderboardTime,
  renderPlacementCard,
  escapeHtml,
  renderInto,
  clearBusyState,
  renderSurfaceEmptyState,
  renderSurfaceLoadingState,
  renderRetryButtonMarkup,
}) {
  function renderLeaderboardSummary(stats) {
    if (!elements.leaderboardSummary) return;

    if (!stats) {
      renderSurfaceLoadingState(elements.leaderboardSummary, {
        label: "Loading global stats",
        variant: "kpis",
        rows: 4,
      });
      return;
    }

    clearBusyState(elements.leaderboardSummary);

    const players = Number.isInteger(stats.players)
      ? stats.players
      : Number.isInteger(stats.totalPlayers)
      ? stats.totalPlayers
      : 0;

    const completed = Number.isInteger(stats.solvers)
      ? stats.solvers
      : Number.isInteger(stats.completed)
      ? stats.completed
      : 0;

    const avgWinningGuesses =
      typeof stats.averageWinningGuesses === "number"
        ? stats.averageWinningGuesses
        : typeof stats.avgGuesses === "number"
        ? stats.avgGuesses
        : null;

    const avgGuessesDisplay =
      avgWinningGuesses !== null && Number.isFinite(avgWinningGuesses)
        ? avgWinningGuesses.toFixed(1)
        : "—";

    const solveRate = players > 0 ? Math.round((completed / players) * 100) : 0;

    elements.leaderboardSummary.innerHTML = `
      <div class="leaderboard-kpis">
        <div class="leaderboard-kpi">
          <div class="leaderboard-kpi-value">${players}</div>
          <div class="leaderboard-kpi-label">Players</div>
        </div>
        <div class="leaderboard-kpi">
          <div class="leaderboard-kpi-value">${completed}</div>
          <div class="leaderboard-kpi-label">Completed</div>
        </div>
        <div class="leaderboard-kpi">
          <div class="leaderboard-kpi-value">${avgGuessesDisplay}</div>
          <div class="leaderboard-kpi-label">Average guesses</div>
        </div>
        <div class="leaderboard-kpi">
          <div class="leaderboard-kpi-value">${solveRate}%</div>
          <div class="leaderboard-kpi-label">Solve rate</div>
        </div>
      </div>
    `;
  }

  function renderLeaderboardList(entries) {
    if (!elements.leaderboardList) return;

    if (!Array.isArray(entries)) {
      renderSurfaceLoadingState(elements.leaderboardList, {
        label: "Loading leaderboard",
        variant: "list",
        rows: 5,
      });
      return;
    }

    clearBusyState(elements.leaderboardList);

    if (!entries.length) {
      renderSurfaceEmptyState(
        elements.leaderboardList,
        {
          title: "No leaderboard entries yet",
          body: "Be the first player to finish today's Daily puzzle.",
          compact: false,
          showMarker: true,
          tone: "empty",
          actions: renderRetryButtonMarkup("Focus guess box", "focus-guess-input"),
        },
        bindEmptyStateActions,
      );
      return;
    }

    const rows = entries
      .map((entry) => {
        const isCurrentUser =
          !!state.auth.user?.uid &&
          (entry.uid === state.auth.user.uid || entry.userId === state.auth.user.uid);

        return `
          <div class="leaderboard-row ${isCurrentUser ? "is-current-user" : ""}">
            <div class="leaderboard-rank">${entry.rank}</div>
            <div class="leaderboard-name">${escapeHtml(entry.displayName ?? "Anonymous")}</div>
            <div class="leaderboard-guesses">${entry.guesses ?? "—"} ${
              entry.guesses === 1 ? "guess" : "guesses"
            }</div>
            <div class="leaderboard-time">${formatLeaderboardTime(entry.completedAt)}</div>
          </div>
        `;
      })
      .join("");

    renderInto(
      elements.leaderboardList,
      `<div class="leaderboard-list-shell">${rows}</div>`,
    );
  }

  function getLeaderboardPlacement(rankEntry) {
    return renderPlacementCard(rankEntry, formatLeaderboardTime);
  }

  function renderCurrentUserRank(rankEntry) {
    if (!elements.leaderboardUserRank) return;

    clearBusyState(elements.leaderboardUserRank);

    if (!state.auth.user) {
      renderSurfaceEmptyState(elements.leaderboardUserRank, {
        title: "Join the leaderboard",
        body: "Complete today's Daily puzzle to record your placement.",
        compact: true,
        showMarker: true,
        tone: "empty",
      });
      return;
    }

    if (!rankEntry) {
      renderSurfaceEmptyState(
        elements.leaderboardUserRank,
        {
          title: "No Daily result yet",
          body: "Finish today's Daily puzzle to see your placement here.",
          compact: true,
          showMarker: true,
          tone: "empty",
          actions: renderRetryButtonMarkup("Focus guess box", "focus-guess-input"),
        },
        bindEmptyStateActions,
      );
      return;
    }

    elements.leaderboardUserRank.innerHTML = getLeaderboardPlacement(rankEntry);
  }

  return {
    renderLeaderboardSummary,
    renderLeaderboardList,
    renderCurrentUserRank,
    getLeaderboardPlacement,
  };
}