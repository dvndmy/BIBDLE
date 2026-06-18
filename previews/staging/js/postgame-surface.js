export function createPostGameSurface({
  state,
  elements,
  getFirebaseAuth,
  getFirebaseDb,
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

  function renderPostGameLeaderboardRank(rankEntry, options = {}) {
    if (!elements.postGameLeaderboardSection || !elements.postGameLeaderboardRank) return;

    const { loading = false } = options;
    const isDaily = state.mode === "daily";
    const firebaseAuth = getFirebaseAuth?.() ?? null;
    const viewer = state.auth.user ?? firebaseAuth?.currentUser ?? null;

    showWhen(elements.postGameLeaderboardSection, isDaily);

    if (!isDaily) {
      renderWhen(elements.postGameLeaderboardRank, false, "");
      return;
    }

    if (loading) {
      renderSurfaceLoadingState(elements.postGameLeaderboardRank, {
        label: "Loading placement",
        variant: "rank",
        rows: 1,
      });
      return;
    }

    clearBusyState(elements.postGameLeaderboardRank);

    if (!viewer?.uid) {
      renderSurfaceEmptyState(
        elements.postGameLeaderboardRank,
        {
          title: "Placement unavailable",
          body: "A player session is required before your Daily placement can be shown.",
          compact: true,
          showMarker: true,
          tone: "error",
          actions: renderRetryButtonMarkup("Try again", "retry-postgame-rank"),
        },
        bindEmptyStateActions,
      );
      return;
    }

    if (!rankEntry) {
      renderSurfaceEmptyState(
        elements.postGameLeaderboardRank,
        {
          title: viewer.isAnonymous ? "Guest result recorded" : "No placement recorded yet",
          body: viewer.isAnonymous
            ? "Your guest result was submitted. Placement may still be syncing."
            : "Your Daily result was submitted. Placement may still be syncing.",
          compact: true,
          showMarker: true,
          tone: "empty",
          actions: renderRetryButtonMarkup("Try again", "retry-postgame-rank"),
        },
        bindEmptyStateActions,
      );
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
          <div class="label">Player</div>
          <div class="value">${viewer.isAnonymous ? "Guest" : "Signed in"}</div>
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

    const firebaseAuth = getFirebaseAuth?.() ?? null;
    const firebaseDb = getFirebaseDb?.() ?? null;
    const user = state.auth.user ?? firebaseAuth?.currentUser ?? null;

    showWhen(elements.postGameLeaderboardSection, true);
    renderPostGameLeaderboardRank(null, { loading: true });

    console.log("[postgame rank] viewer", {
      stateUser: state.auth.user
        ? { uid: state.auth.user.uid, isAnonymous: !!state.auth.user.isAnonymous }
        : null,
      firebaseUser: firebaseAuth?.currentUser
        ? { uid: firebaseAuth.currentUser.uid, isAnonymous: !!firebaseAuth.currentUser.isAnonymous }
        : null,
      chosenUser: user
        ? { uid: user.uid, isAnonymous: !!user.isAnonymous }
        : null,
      authEnabled: !!state.auth.enabled,
      hasDb: !!firebaseDb,
    });

    if (!user?.uid || !state.auth.enabled || !firebaseDb) {
      renderSurfaceEmptyState(
        elements.postGameLeaderboardRank,
        {
          title: "Placement unavailable",
          body: "Leaderboard services are not ready yet for this result.",
          compact: true,
          showMarker: true,
          tone: "error",
          actions: renderRetryButtonMarkup("Try again", "retry-postgame-rank"),
        },
        bindEmptyStateActions,
      );
      return;
    }

    try {
      let userRank = null;

      for (let attempt = 1; attempt <= 4; attempt += 1) {
        userRank = await fetchCurrentUserRank(getDailyDateKey(), user.uid);

        console.log("[postgame rank] attempt", {
          attempt,
          uid: user.uid,
          userRank,
        });

        if (userRank) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      state.leaderboard.userRank = userRank;
      renderPostGameLeaderboardRank(userRank);
    } catch (error) {
      console.error("Post-game rank load failed", error);
      renderSurfaceEmptyState(
        elements.postGameLeaderboardRank,
        {
          title: "Could not load placement",
          body: "Your result was submitted, but your placement is not available yet.",
          compact: true,
          showMarker: true,
          tone: "error",
          actions: renderRetryButtonMarkup("Try again", "retry-postgame-rank"),
        },
        bindEmptyStateActions,
      );
    }
  }

  function renderPostGamePanel(options = {}) {
    if (!elements.postGameModal) return;

    const { loadLeaderboardRank = true } = options;
    const content = getPostGameContent();

    if (!content || !isGameOver()) {
      setModalOpenState(elements.postGameModal, false);
      state.postGameOpen = false;
      return;
    }

    if (elements.postGameTitle) elements.postGameTitle.textContent = content.title || "";
    if (elements.postGameBadge) elements.postGameBadge.textContent = content.badge || "";
    if (elements.postGameReference) elements.postGameReference.textContent = content.reference || "";
    if (elements.postGameBook) elements.postGameBook.textContent = content.bookName || "";
    if (elements.postGameVerse) elements.postGameVerse.textContent = content.verseText || "";
    if (elements.postGameIntroTitle) elements.postGameIntroTitle.textContent = content.introTitle || "";
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

      if (loadLeaderboardRank) {
        loadPostGameLeaderboardRank();
      } else {
        renderPostGameLeaderboardRank(state.leaderboard.userRank ?? null);
      }
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