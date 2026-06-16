export function createPostGameSurface({
  state,
  elements,
  firebaseAuth,
  firebaseDb,
  bindEmptyStateActions,
  isGameOver,
  getPostGameContent,
  getNewlyEarnedAchievements,
  getClosestIncompleteAchievements,
  isNonEmptyArray,
  showWhen,
  renderWhen,
  renderInto,
  clearBusyState,
  renderSurfaceEmptyState,
  renderSurfaceLoadingState,
  renderRetryButtonMarkup,
  setModalOpenState,
  fetchCurrentUserRank,
  getDailyDateKey,
  renderPostGameNewAchievements,
  renderPostGameClosestAchievements,
  renderPostGameStats,
}) {
  function renderTriviaSection(trivia) {
    if (!elements.postGameTriviaSection) return;

    const hasTrivia =
      !!trivia &&
      (Boolean(trivia.title) ||
        Boolean(trivia.text) ||
        (Array.isArray(trivia.chips) && trivia.chips.length > 0));

    showWhen(elements.postGameTriviaSection, hasTrivia);

    if (!hasTrivia) return;

    if (elements.postGameTriviaTitle) {
      elements.postGameTriviaTitle.textContent = trivia.title || "";
    }
    if (elements.postGameTriviaText) {
      elements.postGameTriviaText.textContent = trivia.text || "";
    }
    if (elements.postGameTriviaChips) {
      const chipsMarkup = (Array.isArray(trivia.chips) ? trivia.chips : [])
        .map((chip) => `<span class="chip">${chip}</span>`)
        .join("");
      renderInto(elements.postGameTriviaChips, chipsMarkup, {
        visible: Boolean(chipsMarkup),
      });
    }
  }

  function renderPostGameLeaderboardRank(rankEntry) {
    if (!elements.postGameLeaderboardSection || !elements.postGameLeaderboardRank) return;

    const isDaily = state.mode === "daily";
    showWhen(elements.postGameLeaderboardSection, isDaily);

    if (!isDaily) {
      renderWhen(elements.postGameLeaderboardRank, false, "");
      return;
    }

    clearBusyState(elements.postGameLeaderboardRank);

    if (!state.auth.user) {
      renderSurfaceEmptyState(
        elements.postGameLeaderboardRank,
        {
          title: "Sign in to track placement",
          body: "Your Daily result can appear here once you are signed in.",
          compact: true,
          showMarker: true,
          tone: "empty",
          actions: renderRetryButtonMarkup("Open leaderboard", "open-leaderboard"),
        },
        bindEmptyStateActions,
      );
      return;
    }

    if (!rankEntry) {
      renderSurfaceLoadingState(elements.postGameLeaderboardRank, {
        label: "Loading placement",
        variant: "rank",
        rows: 1,
      });
      return;
    }

    const hasRank = Number.isInteger(rankEntry.rank) && rankEntry.rank > 0;
    const isSolved = rankEntry.result === "won" || rankEntry.result === "solved";
    const placementLabel = hasRank ? `#${rankEntry.rank}` : isSolved ? "Solved" : "Unranked";
    const placementMeta = hasRank
      ? `You are currently #${rankEntry.rank} on today's leaderboard.`
      : isSolved
      ? "Your result is recorded, but a numeric placement is not available yet."
      : "Your result is recorded, but a ranked position is not available yet.";

    renderInto(
      elements.postGameLeaderboardRank,
      `
        <div class="leaderboard-user-rank-card">
          <div>
            <div class="label">Your place</div>
            <div class="value">${placementLabel}</div>
          </div>
          <div>
            <div class="label">Result</div>
            <div class="value">${isSolved ? "Solved" : "Played"}</div>
          </div>
          <div>
            <div class="label">Guesses</div>
            <div class="value">${rankEntry.guesses ?? "—"}</div>
          </div>
          <div class="leaderboard-user-rank-note">${placementMeta}</div>
        </div>
      `,
    );
  }

  async function loadPostGameLeaderboardRank() {
    if (state.mode !== "daily" || !isGameOver()) {
      renderPostGameLeaderboardRank(null);
      return;
    }

    if (!elements.postGameLeaderboardSection || !elements.postGameLeaderboardRank) return;

    showWhen(elements.postGameLeaderboardSection, true);

    renderSurfaceLoadingState(elements.postGameLeaderboardRank, {
      label: "Loading placement",
      variant: "rank",
      rows: 1,
    });

    const user = state.auth.user ?? firebaseAuth?.currentUser ?? null;

    if (!user?.uid || !state.auth.enabled || !firebaseDb) {
      renderSurfaceEmptyState(
        elements.postGameLeaderboardRank,
        {
          title: "Placement unavailable",
          body: "Complete a Daily puzzle while connected to global stats to see your placement.",
          compact: true,
          showMarker: true,
          tone: "error",
          actions: renderRetryButtonMarkup("Open leaderboard", "open-leaderboard"),
        },
        bindEmptyStateActions,
      );
      return;
    }

    try {
      const userRank = await fetchCurrentUserRank(getDailyDateKey(), user.uid);
      state.leaderboard.userRank = userRank;
      renderPostGameLeaderboardRank(userRank);
    } catch (error) {
      console.error("Post-game rank load failed", error);
      renderSurfaceEmptyState(
        elements.postGameLeaderboardRank,
        {
          title: "Could not load placement",
          body: "Your result was saved locally, but your current global placement is not available yet.",
          compact: true,
          showMarker: true,
          tone: "error",
          actions: renderRetryButtonMarkup("Try again", "retry-postgame-rank"),
        },
        bindEmptyStateActions,
      );
    }
  }

  function renderPostGamePanel() {
    if (!elements.postGameModal) return;

    const content = getPostGameContent();

    if (!content || !isGameOver()) {
      setModalOpenState(elements.postGameModal, false);
      state.postGameOpen = false;
      return;
    }

    if (elements.postGameTitle) elements.postGameTitle.textContent = content.title;
    if (elements.postGameBadge) elements.postGameBadge.textContent = content.badge;
    if (elements.postGameReference) elements.postGameReference.textContent = content.reference;
    if (elements.postGameBook) elements.postGameBook.textContent = content.bookName;
    if (elements.postGameVerse) elements.postGameVerse.textContent = content.verseText;
    if (elements.postGameIntroTitle) elements.postGameIntroTitle.textContent = content.introTitle;
    if (elements.postGameIntroText) {
      elements.postGameIntroText.textContent = content.introText || content.explanation || "";
    }

    showWhen(elements.postGameNextBtn, state.mode === "practice");
    showWhen(elements.postGamePracticeBtn, state.mode === "daily");

    renderTriviaSection(content.trivia);
    renderPostGameStats(state.mode);

    if (elements.postGameNewAchievements && elements.postGameNewAchievementsSection) {
      const newlyEarnedAchievements = getNewlyEarnedAchievements();
      const hasNewAchievements = isNonEmptyArray(newlyEarnedAchievements);
      showWhen(elements.postGameNewAchievementsSection, hasNewAchievements);

      if (hasNewAchievements) {
        renderPostGameNewAchievements(
          elements.postGameNewAchievements,
          newlyEarnedAchievements,
        );
      } else {
        renderInto(elements.postGameNewAchievements, "", { visible: false });
      }
    }

    if (elements.postGameClosestAchievements && elements.postGameClosestAchievementsSection) {
      const closestAchievements = getClosestIncompleteAchievements(3);
      const hasClosestAchievements = isNonEmptyArray(closestAchievements);
      showWhen(elements.postGameClosestAchievementsSection, hasClosestAchievements);

      if (hasClosestAchievements) {
        renderPostGameClosestAchievements(
          elements.postGameClosestAchievements,
          closestAchievements,
        );
      } else {
        renderInto(elements.postGameClosestAchievements, "", { visible: false });
      }
    }

    if (state.mode === "daily") {
      showWhen(elements.postGameLeaderboardSection, true);
      loadPostGameLeaderboardRank();
    } else {
      showWhen(elements.postGameLeaderboardSection, false);
      renderWhen(elements.postGameLeaderboardRank, false, "");
    }

    setModalOpenState(elements.postGameModal, true);
    state.postGameOpen = true;
  }

  function closePostGamePanel() {
    if (!elements.postGameModal) return;
    setModalOpenState(elements.postGameModal, false);
    state.postGameOpen = false;
  }

  return {
    renderPostGamePanel,
    renderPostGameLeaderboardRank,
    loadPostGameLeaderboardRank,
    closePostGamePanel,
  };
}