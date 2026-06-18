export function createStatsSurface({
  elements,
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  computeModeStatsSummary,
  getAchievementEvaluation,
  shouldTreatAchievementAsEarned,
  getAchievementCategoryOrder,
  buildAchievementCategoryGroupMarkup,
  buildAchievementCardMarkup,
  getNewlyEarnedAchievements,
  getClosestIncompleteAchievements,
  isNonEmptyArray,
  hasRenderableMarkup,
  renderInto,
}) {

  function renderStatsSection(stats, container) {
    if (!container) return;

    const distribution = stats?.guessDistribution || {};
    const attempts = Array.from({ length: 8 }, (_, index) => {
      const attempt = index + 1;
      return {
        attempt,
        count: Number(distribution[attempt] || distribution[String(attempt)] || 0),
      };
    });

    const maxCount = attempts.reduce((max, entry) => Math.max(max, entry.count), 0);

    const markup = attempts
      .map(({ attempt, count }) => {
        const widthPercent =
          maxCount > 0 && count > 0 ? Math.max((count / maxCount) * 100, 8) : 0;

        return `
        <div class="guess-distribution-row">
          <div class="guess-distribution-label">${attempt}</div>
          <div class="guess-distribution-bar-wrap">
            <div class="guess-distribution-bar">
              <div
                class="guess-distribution-bar-fill"
                style="width: ${widthPercent}%"
                aria-hidden="true"
              ></div>
            </div>
            <div class="guess-distribution-value">${count}</div>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = markup;
    container.hidden = false;
    container.removeAttribute("aria-hidden");
    container.style.display = "block";
    container.style.visibility = "visible";
  }

  function renderStatsModalBadges() {
    if (!elements.statsModalAchievements) return;

    const groupedAchievements = ACHIEVEMENTS.reduce((acc, achievement) => {
      const category = achievement.category || "uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(achievement);
      return acc;
    }, {});

    const orderedCategories = Object.keys(groupedAchievements).sort(
      (a, b) => getAchievementCategoryOrder(a) - getAchievementCategoryOrder(b),
    );

    const markup = `
      <div class="achievement-groups">
        ${orderedCategories
        .map((category) =>
          buildAchievementCategoryGroupMarkup(category, groupedAchievements[category]),
        )
        .join("")}
      </div>
    `;

    renderInto(elements.statsModalAchievements, markup, {
      visible: hasRenderableMarkup(markup),
    });
  }

  function renderPostGameNewAchievements(container, achievements) {
    if (!container) return;

    if (!isNonEmptyArray(achievements)) {
      renderInto(container, "", { visible: false });
      return;
    }

    const markup = achievements
      .map((achievement) =>
        buildAchievementCardMarkup(achievement, {
          evaluation: getAchievementEvaluation(achievement),
          isEarned: true,
        }),
      )
      .join("");

    renderInto(container, markup, {
      visible: hasRenderableMarkup(markup),
    });
  }

  function renderPostGameClosestAchievements(container, achievements) {
    if (!container) return;

    if (!isNonEmptyArray(achievements)) {
      renderInto(container, "", { visible: false });
      return;
    }

    const markup = achievements
      .map((entry) =>
        buildAchievementCardMarkup(entry.achievement, {
          evaluation: entry.evaluation,
          isEarned: false,
        }),
      )
      .join("");

    renderInto(container, markup, {
      visible: hasRenderableMarkup(markup),
    });
  }

  function renderStatsModal() {
    const dailyStats = computeModeStatsSummary("daily");
    const practiceStats = computeModeStatsSummary("practice");

    if (elements.statsPlayed) {
      elements.statsPlayed.textContent = String(dailyStats.played);
    }
    if (elements.statsWon) {
      elements.statsWon.textContent = String(dailyStats.won);
    }
    if (elements.statsLost) {
      elements.statsLost.textContent = String(dailyStats.lost);
    }
    if (elements.statsCurrentStreak) {
      elements.statsCurrentStreak.textContent = String(dailyStats.currentStreak);
    }
    if (elements.statsBestStreak) {
      elements.statsBestStreak.textContent = String(dailyStats.bestStreak);
    }

    if (elements.statsGuessDistribution) {
      elements.statsGuessDistribution.hidden = false;
      elements.statsGuessDistribution.removeAttribute("aria-hidden");
      elements.statsGuessDistribution.style.display = "block";
      renderStatsSection(dailyStats, elements.statsGuessDistribution);
    }

    if (elements.statsModalAchievements) {
      renderStatsModalBadges();
    }

    if (elements.practiceStatsPlayed) {
      elements.practiceStatsPlayed.textContent = String(practiceStats.played);
    }
    if (elements.practiceStatsWon) {
      elements.practiceStatsWon.textContent = String(practiceStats.won);
    }
    if (elements.practiceStatsLost) {
      elements.practiceStatsLost.textContent = String(practiceStats.lost);
    }

    if (elements.practiceStatsGuessDistribution) {
      elements.practiceStatsGuessDistribution.hidden = false;
      elements.practiceStatsGuessDistribution.removeAttribute("aria-hidden");
      elements.practiceStatsGuessDistribution.style.display = "block";
      renderStatsSection(practiceStats, elements.practiceStatsGuessDistribution);
    }
  }

  return {
    renderStatsSection,
    renderStatsModalBadges,
    renderStatsModal,
    renderPostGameNewAchievements,
    renderPostGameClosestAchievements,
  };
}