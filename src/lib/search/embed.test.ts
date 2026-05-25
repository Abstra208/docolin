import { describe, it, expect } from "bun:test";
import { buildEmbedText } from "./embed";

describe("buildEmbedText", () => {
  it("orders title, then description, then body", () => {
    const text = buildEmbedText({
      title: "Install UFW",
      description: "Firewall basics",
      bodyText: "Run ufw enable.",
    });
    expect(text.startsWith("Install UFW")).toBe(true);
    expect(text.indexOf("Firewall basics")).toBeLessThan(text.indexOf("Run ufw enable."));
  });

  it("skips a missing description without leaving a blank gap", () => {
    expect(buildEmbedText({ title: "T", description: null, bodyText: "B" })).toBe("T\n\nB");
  });

  it("truncates input that exceeds the model's budget", () => {
    const text = buildEmbedText({ title: "T", description: null, bodyText: "x".repeat(50_000) });
    expect(text.length).toBeLessThanOrEqual(16_000);
  });
});
