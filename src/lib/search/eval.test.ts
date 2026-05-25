import { describe, it, expect } from "bun:test";
import { recallAtK, ndcgAtK, type Judgment } from "./eval";

const judgments: Judgment[] = [
  { docoId: "a", grade: 3 },
  { docoId: "b", grade: 2 },
  { docoId: "c", grade: 1 },
  { docoId: "x", grade: 0 }, // judged irrelevant
];

describe("recallAtK", () => {
  it("is the fraction of relevant guides found in the top-k", () => {
    // 3 relevant (a, b, c); top-2 [a, b] finds 2 of them.
    expect(recallAtK(["a", "b", "z"], judgments, 2)).toBeCloseTo(2 / 3, 10);
  });

  it("reaches 1 when every relevant guide is within k", () => {
    expect(recallAtK(["a", "b", "c", "x"], judgments, 4)).toBe(1);
  });

  it("ignores guides judged irrelevant", () => {
    expect(recallAtK(["x"], judgments, 5)).toBe(0);
  });

  it("is 0 when nothing is relevant", () => {
    expect(recallAtK(["a", "b"], [{ docoId: "a", grade: 0 }], 5)).toBe(0);
  });
});

describe("ndcgAtK", () => {
  it("is 1 for the ideal ordering", () => {
    expect(ndcgAtK(["a", "b", "c"], judgments, 3)).toBeCloseTo(1, 10);
  });

  it("drops below 1 when the order is wrong", () => {
    // Most relevant guide ranked last.
    expect(ndcgAtK(["c", "b", "a"], judgments, 3)).toBeLessThan(1);
  });

  it("rewards putting the most relevant guide first", () => {
    const good = ndcgAtK(["a", "b", "c"], judgments, 3);
    const bad = ndcgAtK(["c", "a", "b"], judgments, 3);
    expect(good).toBeGreaterThan(bad);
  });

  it("is 0 when there is nothing relevant to find", () => {
    expect(ndcgAtK(["a"], [{ docoId: "a", grade: 0 }], 5)).toBe(0);
  });
});
