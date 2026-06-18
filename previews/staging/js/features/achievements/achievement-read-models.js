export function clampAchievementProgress(progress, target) {
  const safeProgress = Number.isFinite(progress) ? Math.max(0, progress) : 0;
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;
  const isComplete = safeTarget > 0 && safeProgress >= safeTarget;

  return {
    progress: safeProgress,
    target: safeTarget,
    percent:
      safeTarget > 0
        ? Math.max(0, Math.min(100, (safeProgress / safeTarget) * 100))
        : 0,
    remaining:
      safeTarget > 0
        ? Math.max(0, safeTarget - safeProgress)
        : Number.POSITIVE_INFINITY,
    isComplete,
  };
}

export function getAchievementCategoryLabel(category, categories) {
  switch (category) {
    case categories.streak:
      return "Streak";
    case categories.accuracy:
      return "Accuracy";
    case categories.bibleKnowledge:
      return "Bible knowledge";
    case categories.rare:
      return "Rare and meta";
    default:
      return "Achievements";
  }
}

export function getAchievementCategoryDescription(category, categories) {
  switch (category) {
    case categories.streak:
      return "Daily streak and consistency milestones.";
    case categories.accuracy:
      return "First-try and precision-based milestones.";
    case categories.bibleKnowledge:
      return "Book, section, and testament coverage milestones.";
    case categories.rare:
      return "Long-term and special completion milestones.";
    default:
      return "";
  }
}

export function getAchievementCategoryOrder(category, categories) {
  switch (category) {
    case categories.streak:
      return 1;
    case categories.accuracy:
      return 2;
    case categories.bibleKnowledge:
      return 3;
    case categories.rare:
      return 4;
    default:
      return 99;
  }
}

export function getAchievementDescriptionForUi(achievement) {
  if (!achievement) return "";

  if (achievement.kind === "book-group-complete") {
    return "Complete one verse from each required book.";
  }

  if (achievement.kind === "meta-knowledge-complete") {
    return "Earn every Bible Knowledge achievement.";
  }

  return achievement.description || "";
}

export function formatAchievementProgressText(achievement, evaluation, getAchievementBookById) {
  if (!achievement || !evaluation) return "";

  const clamped = clampAchievementProgress(evaluation.progress, evaluation.target);
  const progress = Math.min(clamped.progress, clamped.target || clamped.progress);
  const target = clamped.target;

  switch (achievement.kind) {
    case "daily-streak":
      return `${progress}/${target} days`;
    case "first-try-total":
      return `${progress}/${target} first-try wins`;
    case "total-correct":
      return `${progress}/${target} correct`;
    case "consecutive-first-try":
      return `${progress}/${target} in a row`;
    case "book-group-complete":
      return `${progress}/${target} books completed`;
    case "book-count": {
      const book = getAchievementBookById(achievement.targetBookId);
      const fallbackLabel = achievement.targetBookId
        ? achievement.targetBookId
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ")
        : "Book";
      const bookLabel = book?.name || fallbackLabel;
      return `${progress}/${target} ${bookLabel} verses`;
    }
    case "meta-knowledge-complete":
      return `${progress}/${target} knowledge achievements`;
    default:
      return target > 0 ? `${progress}/${target}` : "";
  }
}

export function getAchievementStatusCopy({ achievement, evaluation, shouldTreatAchievementAsEarned }) {
  if (shouldTreatAchievementAsEarned(achievement, evaluation)) {
    return { icon: "✓", label: "Earned" };
  }

  return { icon: "🔒", label: "Locked" };
}

export function compareAchievementsForStatsModal(a, b, { shouldTreatAchievementAsEarned, getAchievementEvaluation }) {
  const aEarned = shouldTreatAchievementAsEarned(a, getAchievementEvaluation(a));
  const bEarned = shouldTreatAchievementAsEarned(b, getAchievementEvaluation(b));

  if (aEarned !== bEarned) return aEarned ? -1 : 1;

  const aThreshold = Number.isFinite(a.threshold) ? a.threshold : Number.MAX_SAFE_INTEGER;
  const bThreshold = Number.isFinite(b.threshold) ? b.threshold : Number.MAX_SAFE_INTEGER;

  if (aThreshold !== bThreshold) return aThreshold - bThreshold;

  return a.label.localeCompare(b.label);
}

export function buildAchievementCardViewModel(achievement, options = {}) {
  if (!achievement) return null;

  const {
    evaluation,
    isEarned = false,
    title = achievement.label || "",
    description = "",
    progressText = "",
    status = { icon: "", label: "" },
  } = options;

  const progressState = clampAchievementProgress(evaluation?.progress, evaluation?.target);
  const ariaValueNow =
    progressState.target > 0
      ? Math.min(progressState.progress, progressState.target)
      : progressState.progress;

  const progressLabel = title
    ? `${title} progress: ${progressText || "No progress yet"}`
    : progressText || "No progress yet";

  return {
    achievement,
    title,
    description,
    progressText,
    status,
    isEarned,
    progressState,
    ariaValueNow,
    progressLabel,
  };
}

export function getClosestIncompleteAchievements(achievements, options = {}) {
  const {
    limit = 3,
    getAchievementEvaluation,
    shouldTreatAchievementAsEarned,
  } = options;

  return achievements
    .map((achievement) => {
      const evaluation = getAchievementEvaluation(achievement);
      const progressState = clampAchievementProgress(evaluation.progress, evaluation.target);
      const ratio =
        progressState.target > 0
          ? Math.min(progressState.progress, progressState.target) / progressState.target
          : 0;

      return {
        achievement,
        evaluation,
        isEarned: shouldTreatAchievementAsEarned(achievement, evaluation),
        progress: progressState.progress,
        remaining: progressState.remaining,
        ratio,
        target: progressState.target,
      };
    })
    .filter((entry) => !entry.isEarned && entry.target > 0)
    .sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      if (b.progress !== a.progress) return b.progress - a.progress;
      if (a.remaining !== b.remaining) return a.remaining - b.remaining;
      if (a.target !== b.target) return a.target - b.target;
      return a.achievement.label.localeCompare(b.achievement.label);
    })
    .slice(0, limit);
}

export function buildAchievementCategoryGroups(achievements, options = {}) {
  const {
    categories,
    getAchievementEvaluation,
    shouldTreatAchievementAsEarned,
  } = options;

  const grouped = achievements.reduce((acc, achievement) => {
    const category = achievement.category || "uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {});

  return Object.keys(grouped)
    .sort(
      (a, b) =>
        getAchievementCategoryOrder(a, categories) -
        getAchievementCategoryOrder(b, categories),
    )
    .map((category) => ({
      category,
      title: getAchievementCategoryLabel(category, categories),
      description: getAchievementCategoryDescription(category, categories),
      achievements: grouped[category]
        .slice()
        .sort((a, b) =>
          compareAchievementsForStatsModal(a, b, {
            shouldTreatAchievementAsEarned,
            getAchievementEvaluation,
          }),
        )
        .map((achievement) => ({
          achievement,
          evaluation: getAchievementEvaluation(achievement),
          isEarned: shouldTreatAchievementAsEarned(
            achievement,
            getAchievementEvaluation(achievement),
          ),
        })),
    }));
}