import { describe, it, expect } from "bun:test";
import {
  pathFromSourcePath,
  stripDocExtension,
  rebuildPathInSource,
  parseVersionRef,
} from "./doco-urls";

describe("stripDocExtension", () => {
  it("drops .md and .mdx, case-insensitive", () => {
    expect(stripDocExtension("a/b.md")).toBe("a/b");
    expect(stripDocExtension("a/b.mdx")).toBe("a/b");
    expect(stripDocExtension("a/b.MDX")).toBe("a/b");
    expect(stripDocExtension("a/b")).toBe("a/b");
    expect(stripDocExtension("a/b.png")).toBe("a/b.png");
  });
});

describe("pathFromSourcePath", () => {
  it("strips the subpath and the .md extension", () => {
    expect(pathFromSourcePath("docs/intro.md", "docs")).toBe("intro");
    expect(pathFromSourcePath("guides/install.md", null)).toBe("guides/install");
  });

  it("strips a Mintlify .mdx extension", () => {
    // The bug this guards: .mdx was left on, so URLs became `/…/mcp.mdx`.
    expect(pathFromSourcePath("apps/docs/devtools/mcp.mdx", "apps/docs")).toBe("devtools/mcp");
    expect(pathFromSourcePath("overview.mdx", null)).toBe("overview");
  });
});

describe("rebuildPathInSource", () => {
  it("builds the .md form (resolveDocoIdentity also tries the .mdx sibling)", () => {
    expect(rebuildPathInSource("devtools/mcp", "apps/docs")).toBe("apps/docs/devtools/mcp.md");
    expect(rebuildPathInSource("intro", null)).toBe("intro.md");
  });
});

describe("parseVersionRef", () => {
  it("returns no ref for a plain path", () => {
    expect(parseVersionRef("intro")).toEqual({ pathPart: "intro", versionRef: null });
  });

  it("reads an @N versionNumber suffix", () => {
    expect(parseVersionRef("intro@7")).toEqual({
      pathPart: "intro",
      versionRef: { kind: "number", value: 7 },
    });
  });

  it("reads a 4+ char lowercase hex SHA prefix", () => {
    expect(parseVersionRef("intro@a3b4c5d")).toEqual({
      pathPart: "intro",
      versionRef: { kind: "sha", value: "a3b4c5d" },
    });
  });

  it("reads a tag-shaped suffix as a tag candidate", () => {
    // The route looks these up against versions.versionTag.
    expect(parseVersionRef("intro@v2.3.0")).toEqual({
      pathPart: "intro",
      versionRef: { kind: "tag", value: "v2.3.0" },
    });
    expect(parseVersionRef("intro@release-2026")).toEqual({
      pathPart: "intro",
      versionRef: { kind: "tag", value: "release-2026" },
    });
  });

  it("prefers number over tag, and SHA prefix over tag", () => {
    // All-digits stays a versionNumber even though "42" is technically tag-shaped.
    expect(parseVersionRef("intro@42").versionRef).toEqual({ kind: "number", value: 42 });
    // All-lowercase-hex stays a SHA prefix even though it is also tag-shaped.
    expect(parseVersionRef("intro@abcdef").versionRef).toEqual({ kind: "sha", value: "abcdef" });
  });

  it("does not treat a tag containing forbidden chars as a version ref", () => {
    // Spaces / special chars: keep the @ in the path, don't try to ref.
    expect(parseVersionRef("intro@hello world")).toEqual({
      pathPart: "intro@hello world",
      versionRef: null,
    });
  });

  it("ignores a trailing empty @ suffix", () => {
    expect(parseVersionRef("intro@")).toEqual({ pathPart: "intro@", versionRef: null });
  });
});
