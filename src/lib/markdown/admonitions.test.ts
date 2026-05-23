import { describe, it, expect } from "bun:test";
import { Marked } from "marked";
import {
  applyAdmonitions,
  parseAdmonition,
  renderAdmonition,
  type AdmonitionToken,
} from "./admonitions";

// The opener parser and the renderer are pure, so most coverage pins them
// directly. A handful of integration cases run through a real Marked instance to
// prove the body is block-lexed (nested lists, code fences) and that following
// content isn't swallowed.

describe("parseAdmonition", () => {
  it("parses a bare type", () => {
    const parsed = parseAdmonition("!!! note\n    hi\n");
    expect(parsed).not.toBeNull();
    expect(parsed?.token.atype).toBe("note");
    expect(parsed?.token.title).toBe("Note");
    expect(parsed?.token.collapsible).toBe(false);
    expect(parsed?.body).toBe("hi\n");
  });

  it("parses a quoted title", () => {
    const parsed = parseAdmonition('!!! warning "Secure Boot"\n    enroll a key\n');
    expect(parsed?.token.atype).toBe("warning");
    expect(parsed?.token.title).toBe("Secure Boot");
  });

  it("marks ??? collapsed and ???+ open", () => {
    expect(parseAdmonition('??? tip "x"\n    y\n')?.token).toMatchObject({
      collapsible: true,
      open: false,
    });
    expect(parseAdmonition('???+ tip "x"\n    y\n')?.token).toMatchObject({
      collapsible: true,
      open: true,
    });
  });

  it("keeps unknown types verbatim (degrade later, not at parse)", () => {
    expect(parseAdmonition("!!! steps\n    1. a\n")?.token.atype).toBe("steps");
  });

  it("requires whitespace after the marker", () => {
    expect(parseAdmonition("!!!important\n")).toBeNull();
  });

  it("returns null for non-openers", () => {
    expect(parseAdmonition("just a paragraph\n")).toBeNull();
    expect(parseAdmonition("wow!!!\n")).toBeNull();
  });

  it("excludes trailing blanks and the next top-level block from raw", () => {
    const parsed = parseAdmonition("!!! note\n    a\n\nafter\n");
    expect(parsed?.token.raw).toBe("!!! note\n    a\n");
    expect(parsed?.body).toBe("a\n");
  });

  it("keeps blank lines that sit between body content", () => {
    const parsed = parseAdmonition("!!! note\n    one\n\n    two\n\nafter\n");
    expect(parsed?.body).toBe("one\n\ntwo\n");
  });

  it("dedents one level (4 spaces) so deeper indentation survives", () => {
    const parsed = parseAdmonition("!!! note\n    - a\n        - nested\n");
    expect(parsed?.body).toBe("- a\n    - nested\n");
  });
});

describe("renderAdmonition", () => {
  function token(overrides: Partial<AdmonitionToken>): AdmonitionToken {
    return {
      type: "admonition" as const,
      raw: "",
      collapsible: false,
      open: false,
      atype: "note",
      title: "Note",
      tokens: [],
      ...overrides,
    };
  }

  it("renders a static callout with its type tint, icon, and title", () => {
    const html = renderAdmonition(token({ atype: "warning", title: "Heads up" }), "<p>body</p>");
    expect(html).toContain("border-amber-500/50");
    expect(html).toContain("<svg");
    expect(html).toContain("Heads up");
    expect(html).toContain("<p>body</p>");
    expect(html).not.toContain("<details");
  });

  it("falls back to the neutral box for unknown types", () => {
    const html = renderAdmonition(token({ atype: "steps", title: "Steps" }), "");
    expect(html).toContain("border-foreground/20");
  });

  it("renders ??? as <details> and ???+ as <details open>", () => {
    expect(renderAdmonition(token({ collapsible: true }), "")).toContain("<details class=");
    expect(renderAdmonition(token({ collapsible: true, open: true }), "")).toContain(
      "<details open ",
    );
  });

  it("escapes the title", () => {
    const html = renderAdmonition(token({ title: "a <b> & c" }), "");
    expect(html).toContain("a &lt;b&gt; &amp; c");
    expect(html).not.toContain("<b>");
  });
});

describe("admonitions through marked", () => {
  function render(src: string): Promise<string> {
    const marked = new Marked();
    applyAdmonitions(marked);
    return Promise.resolve(marked.parse(src));
  }

  it("block-lexes the body: nested list and inline emphasis render", async () => {
    const html = await render('!!! danger "x"\n    Do **not**:\n\n    - a\n    - b\n');
    expect(html).toContain("border-destructive/40");
    expect(html).toContain("<strong>not</strong>");
    expect(html).toContain("<li>");
  });

  it("renders a fenced code block nested in a callout", async () => {
    const html = await render("!!! note\n    ```bash\n    echo hi\n    ```\n");
    expect(html).toContain("<pre>");
  });

  it("does not swallow the paragraph after the admonition", async () => {
    const html = await render("!!! note\n    inside\n\nafter para\n");
    expect(html).toContain("after para");
  });
});
