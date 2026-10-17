import { expect, test } from "@playwright/test";
import { books } from "../../js/data/books.js";
import { verses } from "../../js/data/verses.js";
import { installFirebaseRoutes } from "../support/firebase-routes.js";

async function openApp(page) {
  await installFirebaseRoutes(page);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#verseText")).not.toBeEmpty();
  await expect(page.locator("#guessInput")).toBeVisible();
  return pageErrors;
}

async function currentAnswer(page) {
  const verseText = await page.locator("#verseText").innerText();
  const verse = verses.find((entry) => entry.text === verseText);
  expect(verse, `Rendered verse should match a data record: ${verseText}`).toBeTruthy();
  return books.find((book) => book.id === verse.bookId);
}

async function submitBook(page, book) {
  await page.locator("#guessInput").fill(book.name);
  const suggestion = page.locator("#autocomplete .suggestion").filter({
    hasText: book.name,
  }).first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();
}

test("boots the daily puzzle and exposes accessible controls", async ({ page }) => {
  const pageErrors = await openApp(page);

  await expect(page.locator("#modeSelect")).toHaveValue("daily");
  await expect(page.locator("#difficultySelect")).toHaveValue("normal");
  await expect(page.locator("#guessInput")).toHaveAttribute("role", "combobox");
  await expect(page.locator("#guessInput")).toHaveAttribute("aria-autocomplete", "list");
  await expect(page.locator("#hintBlock [data-clue-key]")).toHaveCount(5);
  await expect(page.locator("#dateLabel")).not.toBeEmpty();
  expect(pageErrors).toEqual([]);

  const firebase = await page.evaluate(() => globalThis.__firebaseMockState);
  expect(firebase.calls.map((call) => call.method)).toContain("initializeApp");
});

test("searches in both languages, blocks canonical duplicate guesses, and localizes content", async ({ page }) => {
  await openApp(page);
  const answer = await currentAnswer(page);
  const alternateBook = books.find((book) => book.id !== answer.id && book.nameMl);

  await page.locator("#mobileLanguageToggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang-mode", "ml");
  await page.locator("#guessInput").fill(alternateBook.name);
  const englishAlias = page.locator("#autocomplete .suggestion").filter({
    hasText: alternateBook.name,
  }).first();
  await expect(englishAlias).toBeVisible();
  await englishAlias.click();
  await expect(page.locator("#guessRows")).toContainText(alternateBook.nameMl);
  await page.locator("#guessInput").fill(alternateBook.nameMl);
  await page.locator("#guessInput").press("Enter");
  await expect(page.locator("#statusLine")).toContainText("already tried");
  await expect(page.locator("#guessRows .guess-grid[aria-label]")).toHaveCount(1);
});

test("validates unmatched input and supports keyboard autocomplete selection", async ({ page }) => {
  await openApp(page);

  await page.locator("#guessInput").fill("not a Bible book");
  await expect(page.locator("#autocomplete")).toContainText("No matching books");
  await expect(page.locator("#guessRows .guess-grid[aria-label]")).toHaveCount(0);

  await page.locator("#guessInput").fill("Gene");
  await page.locator("#guessInput").press("ArrowDown");
  await expect(page.locator("#guessInput")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#autocomplete [role='option'][aria-selected='true']")).toHaveCount(1);
  await page.locator("#guessInput").press("Enter");
  await expect(page.locator("#guessRows")).toContainText("Genesis");
  await expect(page.locator("#guessRows .guess-grid[aria-label]")).toHaveCount(1);
});

test("supports preferences, difficulty and mode switching with persistence", async ({ page }) => {
  await openApp(page);

  const originalTheme = await page.locator("html").getAttribute("data-theme");
  await page.locator("#themeToggle").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", originalTheme);
  await page.locator("#settingsBtn").click();
  await expect(page.locator("#settingsModal")).toHaveAttribute("data-open", "true");
  await page.locator("#reducedMotionToggle").check();
  await page.locator("#highContrastToggle").check();
  await page.locator("#largeTextToggle").check();
  await expect(page.locator("html")).toHaveClass(/reduced-motion/);
  await expect(page.locator("html")).toHaveClass(/high-contrast/);
  await expect(page.locator("html")).toHaveClass(/large-text/);
  await page.locator("#closeSettingsBtn").click();

  await page.locator("#difficultySelect").selectOption("easy");
  await expect(page.locator("#difficultySelect")).toHaveValue("easy");
  await page.locator("#modeSelect").selectOption("practice");
  await expect(page.locator("#modeSelect")).toHaveValue("practice");
  await expect(page.locator("#guessRows .guess-grid[aria-label]")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#modeSelect")).toHaveValue("practice");
  await expect(page.locator("#difficultySelect")).toHaveValue("easy");
  await expect(page.locator("html")).toHaveClass(/reduced-motion/);
});

test("unlocks difficulty-specific clues as guesses are submitted", async ({ page }) => {
  await openApp(page);
  const answer = await currentAnswer(page);
  const wrongBook = books.find((book) => book.id !== answer.id);

  await page.locator("#difficultySelect").selectOption("easy");
  await submitBook(page, wrongBook);
  await expect(page.locator("#hintBlock .clue-feed__item.is-unlocked")).toHaveCount(2);
  await expect(page.locator('#hintBlock [data-clue-key="distance"]')).toHaveClass(/is-unlocked/);
  await expect(page.locator('#hintBlock [data-clue-key="section"]')).not.toHaveClass(/is-unlocked/);

  await page.locator("#modeSelect").selectOption("practice");
  await page.locator("#difficultySelect").selectOption("hard");
  await expect(page.locator("#guessRows .guess-grid[aria-label]")).toHaveCount(0);
  await submitBook(page, books.find((book) => book.id !== answer.id));
  await expect(page.locator('#hintBlock [data-clue-key="distance"]')).not.toHaveClass(/is-unlocked/);
  await expect(page.locator('#hintBlock [data-clue-key="section"]')).not.toHaveClass(/is-unlocked/);
});

test("solves a daily puzzle, saves progress, updates stats and opens the archive", async ({ page }) => {
  const pageErrors = await openApp(page);
  const answer = await currentAnswer(page);
  await submitBook(page, answer);

  await expect(page.locator("#postGameModal")).toHaveAttribute("data-open", "true");
  await expect(page.locator("#postGameBook")).toContainText(answer.name);
  await expect(page.locator("#statsBtn")).toBeVisible();
  await expect.poll(async () => {
    const firebase = await page.evaluate(() => globalThis.__firebaseMockState);
    return firebase.calls.some((call) => call.method === "runTransaction");
  }).toBe(true);
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("bibdle-progress")),
  );
  expect(progress).toBeTruthy();
  expect(progress.daily.status).toBe("won");

  await page.locator('[data-modal-close="postGame"]').click();
  await page.locator("#statsBtn").click();
  await expect(page.locator("#statsModal")).toHaveAttribute("data-open", "true");
  await expect(page.locator("#statsPlayed")).toHaveText("1");
  await page.locator('[data-modal-close="stats"]').click();
  await page.locator("#archiveBtn").click();
  await expect(page.locator("#archiveModal")).toHaveAttribute("data-open", "true");
  await expect(page.locator("#archiveGrid .archive-cell")).toHaveCount(books.length);
  await page.locator("#archiveGrid .archive-cell").first().click();
  await expect(page.locator("#archiveDetails")).not.toBeEmpty();

  await page.reload();
  await expect(page.locator("#postGameModal")).toHaveAttribute("data-open", "true");
  expect(pageErrors).toEqual([]);
});

test("records a practice win separately and copies the result", async ({ page }) => {
  await openApp(page);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("#modeSelect").selectOption("practice");
  const answer = await currentAnswer(page);
  await submitBook(page, answer);

  await expect(page.locator("#postGameModal")).toHaveAttribute("data-open", "true");
  await expect(page.locator("#postGameBook")).toContainText(answer.name);
  await page.locator('[data-modal-close="postGame"]').click();
  await page.locator("#copyBtn").click();
  await expect(page.locator("#statusLine")).toContainText("Result copied to clipboard");
  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedText).toContain("Practice");
  expect(copiedText).toContain("Solved");

  await page.locator("#statsBtn").click();
  await expect(page.locator("#practiceStatsPlayed")).toHaveText("1");
  await expect(page.locator("#practiceStatsWon")).toHaveText("1");
  await expect(page.locator("#statsPlayed")).toHaveText("0");
});

test("ends a round after the guess limit and records a daily loss", async ({ page }) => {
  await openApp(page);
  const answer = await currentAnswer(page);
  const wrongBooks = books.filter((book) => book.id !== answer.id).slice(0, 8);
  await page.locator("#difficultySelect").selectOption("easy");

  for (const book of wrongBooks) {
    await submitBook(page, book);
  }

  await expect(page.locator("#postGameModal")).toHaveAttribute("data-open", "true");
  await expect(page.locator("#postGameBadge")).toHaveText("Failed");
  await expect(page.locator("#statsBtn")).toBeVisible();
  await page.locator('[data-modal-close="postGame"]').click();
  await page.locator("#statsBtn").click();
  await expect(page.locator("#statsPlayed")).toHaveText("1");
  await expect(page.locator("#statsLost")).toHaveText("1");
});

test("opens the mocked leaderboard and issues the expected Firestore queries", async ({ page }) => {
  await openApp(page);
  await page.locator("#signInBtn").click();
  await expect(page.locator("#signOutBtn")).toBeVisible();
  await expect(page.locator("#authStatus")).toContainText("Test Player");
  await expect.poll(async () => {
    const calls = await page.evaluate(() => globalThis.__firebaseMockState.calls);
    return calls.some((call) => call.method === "setDoc" && call.path === "users/mock-user/profile/main");
  }).toBe(true);
  const answer = await currentAnswer(page);
  await submitBook(page, answer);
  await expect(page.locator("#postGameModal")).toHaveAttribute("data-open", "true");
  await page.locator('[data-modal-close="postGame"]').click();
  await page.locator("#leaderboardBtn").click();
  await expect(page.locator("#leaderboardModal")).toHaveAttribute("data-open", "true");
  await expect(page.locator("#leaderboardSummary")).toContainText("Players");
  await expect(page.locator("#leaderboardList")).toContainText("Sample Player");

  const calls = await page.evaluate(() => globalThis.__firebaseMockState.calls);
  expect(calls.some((call) => call.method === "signInWithPopup")).toBe(true);
  expect(calls.some((call) => call.method === "runTransaction")).toBe(true);
  expect(calls.some((call) => call.method === "transaction.set" && call.path.startsWith("dailyStats/") && call.path.endsWith("/scores/mock-user"))).toBe(true);
  expect(calls.some((call) => call.method === "setDoc" && call.path === "users/mock-user/profile/main")).toBe(true);
  expect(calls.some((call) => call.method === "getDoc" && call.path.startsWith("dailyStats/"))).toBe(true);
  const scoresQuery = calls.find((call) =>
    call.method === "getDocs" &&
    call.path.endsWith("/scores") &&
    call.constraints.some((constraint) => constraint.type === "limit" && constraint.count === 10),
  );
  expect(scoresQuery).toBeTruthy();
  expect(scoresQuery.constraints).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "where", field: "result", value: "won" }),
    expect.objectContaining({ type: "orderBy", field: "guesses", direction: "asc" }),
    expect.objectContaining({ type: "limit", count: 10 }),
  ]));

  await page.locator('[data-modal-close="leaderboard"]').click();
  await page.locator("#signOutBtn").click();
  await expect(page.locator("#signInBtn")).toBeVisible();
});

test("traps focus in modals and restores focus after Escape", async ({ page }) => {
  await openApp(page);
  const trigger = page.locator("#helpBtn");
  await trigger.click();
  await expect(page.locator("#helpModal")).toHaveAttribute("data-open", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#helpModal")).toHaveAttribute("data-open", "false");
  await expect(trigger).toBeFocused();

  await page.locator("#settingsBtn").click();
  const firstSettingsControl = page.locator('#settingsModal button[aria-label="Close settings modal"]');
  const lastSettingsControl = page.locator("#closeSettingsBtn");
  await expect(firstSettingsControl).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(lastSettingsControl).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(firstSettingsControl).toBeFocused();
});
