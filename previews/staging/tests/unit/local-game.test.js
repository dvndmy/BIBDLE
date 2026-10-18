import { describe, expect, it } from "vitest";
import {
  calculateLocalRoundPoints,
  describeLocalGameError,
} from "../../js/local-game.js";

describe("local game scoring", () => {
  it("awards ten points for a first-guess answer, decreasing to one by guess ten", () => {
    expect(calculateLocalRoundPoints(1)).toBe(10);
    expect(calculateLocalRoundPoints(2)).toBe(9);
    expect(calculateLocalRoundPoints(10)).toBe(1);
  });

  it("awards no points for a missed or invalid round", () => {
    [0, 11, -1, 1.5, NaN].forEach((guessCount) => {
      expect(calculateLocalRoundPoints(guessCount)).toBe(0);
    });
  });

  it("explains Firestore permission and configuration errors", () => {
    expect(describeLocalGameError("Could not join.", {
      code: "permission-denied",
    })).toContain("Deploy this project's firestore.rules");
    expect(describeLocalGameError("Could not join.", {
      code: "auth/operation-not-allowed",
    })).toContain("Enable Anonymous Authentication");
    expect(describeLocalGameError("Could not browse.", {
      code: "failed-precondition",
      message: "The query requires an index.",
    })).toContain("firestore.indexes.json");
  });
});
