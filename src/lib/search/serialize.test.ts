import { describe, it, expect } from "bun:test";
import { toIsoString } from "./serialize";

describe("toIsoString", () => {
  it("passes a Date through as ISO", () => {
    expect(toIsoString(new Date("2026-05-25T10:00:00.000Z"))).toBe("2026-05-25T10:00:00.000Z");
  });

  it("normalizes a raw Neon timestamp string (the regression) to ISO", () => {
    // searchGuides' raw SQL returns this shape, not a Date; the old code called
    // .toISOString() on it and 500'd.
    expect(toIsoString("2026-05-25 10:00:00+00")).toBe("2026-05-25T10:00:00.000Z");
  });

  it("truncates microseconds to milliseconds", () => {
    expect(toIsoString("2026-05-25 10:00:00.123456+00")).toBe("2026-05-25T10:00:00.123Z");
  });

  it("returns null for null", () => {
    expect(toIsoString(null)).toBeNull();
  });

  it("returns null for an unparseable string instead of throwing", () => {
    expect(toIsoString("not a timestamp")).toBeNull();
  });
});
