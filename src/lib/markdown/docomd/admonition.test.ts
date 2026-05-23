import { describe, it, expect } from "bun:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { Root } from "mdast";
import { remarkDocomd, admonitionToMarkdown, type Admonition } from "./index";

// Parse markdown to mdast with GFM + our docomd extension. An admonition body is
// re-parsed as standalone markdown, so these tests prove nesting, GFM, code, and
// termination all work, not just the opener.
function parse(md: string): Root {
  return unified().use(remarkParse).use(remarkGfm).use(remarkDocomd).parse(md);
}

// Serialize back to markdown the way prettier-plugin-docomd does.
function serialize(md: string): string {
  return toMarkdown(parse(md), { extensions: [admonitionToMarkdown()] });
}

function admonitions(tree: Root): Admonition[] {
  return tree.children.filter((child): child is Admonition => child.type === "admonition");
}

function only(tree: Root): Admonition {
  const found = admonitions(tree);
  expect(found.length).toBe(1);
  return found[0];
}

describe("admonition opener", () => {
  it("parses a type and quoted title", () => {
    const node = only(parse('!!! warning "Secure Boot"\n    Enroll a key first.\n'));
    expect(node.atype).toBe("warning");
    expect(node.title).toBe("Secure Boot");
    expect(node.collapsible).toBe(false);
    expect(node.children[0]?.type).toBe("paragraph");
  });

  it("leaves the title empty when only a type is given", () => {
    const node = only(parse("!!! note\n    Plain.\n"));
    expect(node.atype).toBe("note");
    expect(node.title).toBe("");
  });

  it("marks ??? collapsed and ???+ open", () => {
    expect(only(parse('??? tip "x"\n    y\n'))).toMatchObject({ collapsible: true, open: false });
    expect(only(parse('???+ tip "x"\n    y\n'))).toMatchObject({ collapsible: true, open: true });
  });

  it("captures an attr-list segment", () => {
    const node = only(parse("!!! cards { cols=2 }\n    - a\n"));
    expect(node.atype).toBe("cards");
    expect(node.attrs).toBe("cols=2");
  });

  it("keeps unknown types verbatim (degrade at render, not parse)", () => {
    expect(only(parse("!!! steps\n    1. a\n")).atype).toBe("steps");
  });

  it("does not treat a marker without trailing space as an admonition", () => {
    expect(admonitions(parse("!!!important\n")).length).toBe(0);
  });
});

describe("admonition body (sub-parsed as a document)", () => {
  it("parses a nested list", () => {
    const node = only(parse("!!! danger\n    - a\n    - b\n"));
    expect(node.children[0]?.type).toBe("list");
    const list = node.children[0];
    expect(list.type === "list" && list.children.length).toBe(2);
  });

  it("parses a fenced code block", () => {
    const node = only(parse("!!! note\n    ```bash\n    echo hi\n    ```\n"));
    expect(node.children[0]?.type).toBe("code");
    const code = node.children[0];
    expect(code.type === "code" && code.lang).toBe("bash");
  });

  it("parses GFM tables inside (proves full grammar in the body)", () => {
    const node = only(parse("!!! note\n    | a | b |\n    | - | - |\n    | 1 | 2 |\n"));
    expect(node.children[0]?.type).toBe("table");
  });

  it("keeps blank lines between body paragraphs", () => {
    const node = only(parse("!!! note\n    one\n\n    two\n"));
    expect(node.children.length).toBe(2);
    expect(node.children[0]?.type).toBe("paragraph");
    expect(node.children[1]?.type).toBe("paragraph");
  });

  it("nests admonitions", () => {
    const node = only(parse("!!! note\n    outer\n\n    !!! tip\n        inner\n"));
    const nested = node.children.find((child) => child.type === "admonition");
    expect(nested?.type).toBe("admonition");
    expect(nested && "atype" in nested && nested.atype).toBe("tip");
  });
});

describe("admonition termination", () => {
  it("ends at the first non-indented line and leaves it for the next block", () => {
    const tree = parse("!!! note\n    inside\n\nafter\n");
    expect(admonitions(tree).length).toBe(1);
    const trailing = tree.children[tree.children.length - 1];
    expect(trailing.type).toBe("paragraph");
  });
});

// Regression: consecutive top-level admonitions used to alternate (every other
// one fell back to a paragraph) because the construct consumed the trailing line
// ending. These pin the codeIndented-style termination.
describe("consecutive admonitions", () => {
  it("recognizes back-to-back admonitions with no blank line between", () => {
    const found = admonitions(parse("!!! one\n    a\n!!! two\n    b\n!!! three\n    c\n"));
    expect(found.map((node) => node.atype)).toEqual(["one", "two", "three"]);
  });

  it("recognizes admonitions separated by blank lines, each with its own body", () => {
    const found = admonitions(parse("!!! one\n    a\n\n!!! two\n    b\n\n!!! three\n    c\n"));
    expect(found.map((node) => node.atype)).toEqual(["one", "two", "three"]);
    expect(found.every((node) => node.children.length === 1)).toBe(true);
  });

  it("recognizes consecutive collapsibles and keeps their open state", () => {
    const found = admonitions(parse('??? a "x"\n    1\n???+ b "y"\n    2\n'));
    expect(found.map((node) => node.atype)).toEqual(["a", "b"]);
    expect(found.map((node) => node.open)).toEqual([false, true]);
  });
});

// Round-trip coverage for prettier-plugin-docomd: serialized output must re-parse
// to the same admonitions, with markers, titles, and 4-space bodies intact.
describe("round-trip serialization", () => {
  it("preserves consecutive admonitions and their indented bodies", () => {
    const out = serialize("!!! one\n    a\n\n!!! two\n    b\n");
    expect(admonitions(parse(out)).map((node) => node.atype)).toEqual(["one", "two"]);
    expect(out).toContain("!!! one\n    a");
    expect(out).toContain("!!! two\n    b");
  });

  it("preserves collapsible markers and titles", () => {
    expect(serialize('???+ warning "Heads up"\n    body\n')).toContain('???+ warning "Heads up"');
  });

  it("re-indents a nested admonition body to eight spaces", () => {
    const out = serialize("!!! note\n    !!! tip\n        deep\n");
    expect(out).toContain("    !!! tip");
    expect(out).toContain("        deep");
  });
});
