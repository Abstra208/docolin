import type { Root } from "mdast";
import type { Plugin } from "unified";
import { admonitionSyntax } from "./admonition-syntax.ts";
import { admonitionFromMarkdown, type Admonition } from "./admonition-mdast.ts";

// docomd: docolin's MkDocs-inspired markdown syntax. This design-agnostic remark
// plugin only parses the syntax into mdast nodes; rendering (HTML classes, icons)
// is the consumer's job via a remark-rehype handler. Kept free of any
// docolin-specific dependency so it can be lifted into a standalone
// `remark-docomd` package and shared with the `prettier-plugin-docomd` formatter.
// Currently covers admonitions (callouts + collapsibles); attr-list links
// (buttons) are a separate transform (remarkAttrList), applied alongside this in
// the render pipeline. steps/cards/accordion/tabs slot in here as they land.

export type { Admonition };
export { parseAdmonitionMeta, admonitionTitle } from "./parse.ts";
export { admonitionSyntax } from "./admonition-syntax.ts";
export { admonitionFromMarkdown } from "./admonition-mdast.ts";
export { admonitionToMarkdown } from "./admonition-to-markdown.ts";
export { remarkAttrList } from "./attr-list.ts";

/** Adds docomd admonition syntax to a unified/remark processor. */
export const remarkDocomd: Plugin<[], Root> = function (): undefined {
  const data = this.data();
  const micromarkExtensions = data.micromarkExtensions ?? (data.micromarkExtensions = []);
  const fromMarkdownExtensions = data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = []);
  micromarkExtensions.push(admonitionSyntax);
  fromMarkdownExtensions.push(admonitionFromMarkdown());
};
