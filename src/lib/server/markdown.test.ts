import { describe, it, expect } from "bun:test";
import { extractReadingMinutes } from "./markdown";

describe("extractReadingMinutes", () => {
  it("floors at one minute even for a tiny body", () => {
    expect(extractReadingMinutes("")).toBe(1);
    expect(extractReadingMinutes("hi")).toBe(1);
  });

  it("counts words across markdown punctuation, not bytes", () => {
    // 200 plain words at 200wpm = 1 minute.
    const body = Array.from({ length: 200 }, (_, i) => `word${String(i)}`).join(" ");
    expect(extractReadingMinutes(body)).toBe(1);
  });

  it("rounds to the nearest minute (400 words -> 2 min)", () => {
    const body = Array.from({ length: 400 }, (_, i) => `w${String(i)}`).join(" ");
    expect(extractReadingMinutes(body)).toBe(2);
  });

  it("treats every kind of whitespace as a separator (newlines, tabs, runs)", () => {
    expect(extractReadingMinutes("a b\tc\nd  e")).toBe(1);
  });
});
