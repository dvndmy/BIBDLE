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
  fetchDailyGlobalStats,
  fetchLeaderboardTopEntries,
  fetchCurrentUserRank,
  getDailyDateKey,
  isLeaderboardAvailable,
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

    renderInto(
      elements.leaderboardSummary,
      `
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
      `,
    );
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

        const guessCount = Number.isInteger(entry.guesses) ? entry.guesses : null;
        const guessLabel =
          guessCount === null ? "—" : `${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`;

        return `
          <div class="leaderboard-row ${isCurrentUser ? "is-current-user" : ""}">
            <div class="leaderboard-rank">${entry.rank ?? "—"}</div>
            <div class="leaderboard-name">${escapeHtml(entry.displayName ?? "Anonymous")}</div>
            <div class="leaderboard-guesses">${guessLabel}</div>
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

  function renderCurrentUserRank(rankEntry, options = {}) {
    if (!elements.leaderboardUserRank) return;

    const { loading = false } = options;

    if (loading) {
      renderSurfaceLoadingState(elements.leaderboardUserRank, {
        label: "Loading placement",
        variant: "rank",
        rows: 1,
      });
      return;
    }

    clearBusyState(elements.leaderboardUserRank);

    const viewer = state.auth.user ?? firebaseAuth?.currentUser ?? null;
    const hasViewerIdentity = !!viewer?.uid;
    const isGuestViewer = !!viewer?.isAnonymous;

    if (!hasViewerIdentity) {
      renderSurfaceEmptyState(elements.leaderboardUserRank, {
        title: "Join the leaderboard",
        body: "Start a Daily game to create a player session and record your placement.",
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

    renderInto(elements.leaderboardUserRank, getLeaderboardPlacement(rankEntry));
  }

  function renderLoadingState() {
    renderLeaderboardSummary(null);
    renderLeaderboardList(null);
    renderCurrentUserRank(null, { loading: true });
  }

  function renderUnavailableState() {
    renderSurfaceEmptyState(elements.leaderboardSummary, {
      title: "Global stats unavailable",
      body: "Global Daily leaderboard data is unavailable right now.",
      compact: true,
      showMarker: true,
      tone: "error",
    });

    renderSurfaceEmptyState(
      elements.leaderboardList,
      {
        title: "Leaderboard unavailable",
        body: "Firebase is not available, but local gameplay still works.",
        compact: true,
        showMarker: true,
        tone: "error",
        actions: renderRetryButtonMarkup("Try again", "retry-leaderboard"),
      },
      bindEmptyStateActions,
    );

    renderCurrentUserRank(null);
  }

  function renderLoadErrorState() {
    renderSurfaceEmptyState(elements.leaderboardSummary, {
      title: "Could not load global stats",
      body: "Today's global Daily metrics are not available right now.",
      compact: true,
      showMarker: true,
      tone: "error",
    });

    renderSurfaceEmptyState(
      elements.leaderboardList,
      {
        title: "Could not load leaderboard",
        body: "Please try again in a moment.",
        compact: true,
        showMarker: true,
        tone: "error",
        actions: renderRetryButtonMarkup("Try again", "retry-leaderboard"),
      },
      bindEmptyStateActions,
    );

    renderCurrentUserRank(null);
  }

  async function loadLeaderboard() {
    renderLoadingState();

    if (!isLeaderboardAvailable()) {
      renderUnavailableState();
      return null;
    }

    try {
      const dateKey = getDailyDateKey();
      const userId = state.auth.user?.uid ?? null;

      const [stats, entries, userRank] = await Promise.all([
        fetchDailyGlobalStats(dateKey),
        fetchLeaderboardTopEntries(dateKey),
        userId ? fetchCurrentUserRank(dateKey, userId) : Promise.resolve(null),
      ]);

      state.leaderboard.userRank = userRank;
      renderLeaderboardSummary(stats);
      renderLeaderboardList(entries);
      renderCurrentUserRank(userRank);

      return { stats, entries, userRank };
    } catch (error) {
      console.error("Leaderboard load failed", error);
      renderLoadErrorState();
      return null;
    }
  }

  return {
    renderLeaderboardSummary,
    renderLeaderboardList,
    renderCurrentUserRank,
    getLeaderboardPlacement,
    renderLoadingState,
    loadLeaderboard,
  };
}