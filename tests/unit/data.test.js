import { describe, expect, it } from "vitest";
import { books } from "../../js/data/books.js";
import { verses } from "../../js/data/verses.js";

describe("Bible data integrity", () => {
  it("contains the complete Catholic canon in canonical order", () => {
    expect(books).toHaveLength(73);
    expect(books.map((book) => book.order)).toEqual(
      Array.from({ length: 73 }, (_, index) => index + 1),
    );
    expect(new Set(books.map((book) => book.id)).size).toBe(books.length);
    expect(books.find((book) => book.id === "tobit")).toMatchObject({
      testament: "Old Testament",
      sectionKey: "historical-books",
    });
    expect(books.find((book) => book.id === "1-maccabees")).toMatchObject({
      testament: "Old Testament",
      sectionKey: "historical-books",
    });
  });

  it("exports normalized bilingual metadata for every book", () => {
    books.forEach((book) => {
      expect(book.id, book.name).toBeTruthy();
      expect(book.name, book.id).toBeTruthy();
      expect(book.nameMl, book.id).toBeTruthy();
      expect(book.normalizedName, book.id).toBeTruthy();
      expect(book.firstLetter, book.id).toBeTruthy();
      expect(book.bookIntroTitle, book.id).toBeTruthy();
      expect(book.bookIntroTitleMl, book.id).toBeTruthy();
      expect(book.bookIntroText, book.id).toBeTruthy();
      expect(book.bookIntroTextMl, book.id).toBeTruthy();
      expect(book.bookThemes.length, book.id).toBeGreaterThan(0);
      expect(book.bookThemesMl.length, book.id).toBeGreaterThan(0);
      expect(book).not.toHaveProperty("bookIntroTextEN");
      expect(book).not.toHaveProperty("bookIntroTexMl");
      expect(book).not.toHaveProperty("bookThemesEn");
    });
  });

  it("keeps every verse linked to an existing book with complete bilingual content", () => {
    const bookIds = new Set(books.map((book) => book.id));

    expect(verses.length).toBeGreaterThan(0);
    expect(new Set(verses.map((verse) => verse.id)).size).toBe(verses.length);

    verses.forEach((verse) => {
      expect(bookIds.has(verse.bookId), verse.id).toBe(true);
      expect(verse.book, verse.id).toBeTruthy();
      expect(verse.bookMl, verse.id).toBeTruthy();
      expect(verse.reference, verse.id).toBeTruthy();
      expect(verse.referenceMl, verse.id).toBeTruthy();
      expect(verse.text, verse.id).toBeTruthy();
      expect(verse.textMl, verse.id).toBeTruthy();
      expect(verse.clue, verse.id).toBeTruthy();
      expect(verse.clueMl, verse.id).toBeTruthy();
      expect(verse.explanation, verse.id).toBeTruthy();
      expect(verse.explanationMl, verse.id).toBeTruthy();
      expect(["easy", "medium", "hard"]).toContain(verse.difficulty);
    });
  });
});
