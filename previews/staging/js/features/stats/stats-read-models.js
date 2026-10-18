export function computeModeStatsSummary(stats, mode = "daily", maxGuesses = 8) {
  const source = mode === "practice" ? stats?.practice : stats?.daily;

  const played =
    Number.isInteger(source?.played) && source.played >= 0 ? source.played : 0;
  const won =
    Number.isInteger(source?.won) && source.won >= 0 ? source.won : 0;
  const lost =
    Number.isInteger(source?.lost) && source.lost >= 0 ? source.lost : 0;

  const currentStreak =
    mode === "daily" &&
    Number.isInteger(source?.currentStreak) &&
    source.currentStreak >= 0
      ? source.currentStreak
      : 0;

  const bestStreak =
    mode === "daily" &&
    Number.isInteger(source?.bestStreak) &&
    source.bestStreak >= 0
      ? source.bestStreak
      : 0;

  const rawDistribution =
    source?.guessDistribution &&
    typeof source.guessDistribution === "object" &&
    !Array.isArray(source.guessDistribution)
      ? source.guessDistribution
      : {};

  const guessDistribution = {};
  for (let i = 1; i <= maxGuesses; i += 1) {
    const value = rawDistribution[i] ?? rawDistribution[String(i)] ?? 0;
    guessDistribution[i] =
      Number.isInteger(value) && value >= 0 ? value : 0;
  }

  return {
    mode,
    played,
    won,
    lost,
    currentStreak,
    bestStreak,
    guessDistribution,
  };
}