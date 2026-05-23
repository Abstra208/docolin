import { describe, it, expect } from "bun:test";
import { codeToHast } from "shiki";
import { createMarkdownRenderer, extractToc } from "./index.ts";

// Render with a real shiki highlighter (static, like the server path). These pin
// the HTML the doco viewer's CSS depends on, so the marked -> remark swap is a
// parity swap, not a visual change.
const render = createMarkdownRenderer((code, lang) =>
  codeToHast(code, { lang, theme: "github-light" }),
);

describe("admonitions", () => {
  it("renders a callout with its type tint, icon, and title", async () => {
    const html = await render('!!! warning "Heads up"\n    Be careful.\n');
    expect(html).toContain("border-amber-500/50");
    expect(html).toContain("<svg");
    expect(html).toContain("Heads up");
    expect(html).toContain("Be careful.");
    expect(html).not.toContain("<details");
  });

  it("renders ??? as a collapsible details with the animation hook", async () => {
    const html = await render('???+ note "More"\n    body\n');
    expect(html).toContain("<details");
    expect(html).toContain("markdown-collapsible");
    expect(html).toContain("open");
  });

  it("falls back to the neutral box for unknown types", async () => {
    expect(await render("!!! steps\n    1. a\n")).toContain("border-foreground/20");
  });

  it("renders nested admonitions", async () => {
    const html = await render("!!! note\n    !!! tip\n        deep\n");
    expect(html).toContain("border-emerald-500/40");
    expect(html).toContain("deep");
  });
});

describe("standard markdown parity", () => {
  it("gives headings ids that match extractToc", async () => {
    expect(await render("## Hello World\n")).toContain('id="hello-world"');
    expect(extractToc("## Hello World\n")).toEqual([
      { level: 2, text: "Hello World", id: "hello-world" },
    ]);
  });

  it("opens external links in a new tab and leaves internal links alone", async () => {
    const html = await render("[ext](https://example.com) and [int](/local)\n");
    expect(html).toContain('target="_blank"');
    expect(html).toContain("noopener");
    expect(html).toContain('href="/local"');
    expect(html).not.toContain('href="/local" target');
  });

  it("renders GFM task lists with the shadcn checkbox and no bullet", async () => {
    const html = await render("- [x] done\n- [ ] todo\n");
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("list-none");
  });

  it("renders GFM tables", async () => {
    expect(await render("| a | b |\n| - | - |\n| 1 | 2 |\n")).toContain("<table");
  });

  it("turns attr-list md-button links into styled buttons and strips the attr text", async () => {
    const html = await render("[Open it](/dash){ .md-button .md-button--primary }\n");
    expect(html).toContain('href="/dash"');
    expect(html).toContain("bg-primary");
    expect(html).not.toContain("md-button");
    expect(html).not.toContain("{ .md-button");
  });

  it("highlights code blocks with shiki, and falls back for unknown grammars", async () => {
    expect(await render("```ts\nconst x = 1;\n```\n")).toContain("shiki");
    expect(await render("```doesnotexist\n??\n```\n")).toContain("<pre");
  });
});

describe("table of contents", () => {
  it("collects top-level h2 and h3 only", () => {
    const toc = extractToc("# Title\n\n## A\n\n### B\n\n#### C\n");
    expect(toc.map((entry) => entry.level)).toEqual([2, 3]);
    expect(toc.map((entry) => entry.text)).toEqual(["A", "B"]);
  });
});
