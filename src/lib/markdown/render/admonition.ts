import { h, s } from "hastscript";
import type { Element } from "hast";
import type { State } from "mdast-util-to-hast";
import { ChevronDown, Info, Lightbulb, OctagonAlert, Pencil, TriangleAlert } from "lucide";
import { admonitionTitle, type Admonition } from "$lib/markdown/docomd";

// docolin's design layer for admonitions: turns a docomd `admonition` mdast node
// into the styled hast (Tailwind classes + Lucide icons) the doco viewer renders.
// This is docolin-specific (theme tokens, the locked light-only palette), so it
// lives here rather than in the design-agnostic docomd package. The markup
// matches what the markdown CSS and the .markdown-collapsible animation in
// layout.css expect.

// lucide doesn't export its IconNode type by a stable name, so derive it.
type LucideIcon = typeof Info;

const ICONS = {
  pencil: Pencil,
  info: Info,
  lightbulb: Lightbulb,
  "triangle-alert": TriangleAlert,
  "octagon-alert": OctagonAlert,
  "chevron-down": ChevronDown,
} satisfies Record<string, LucideIcon>;

type IconName = keyof typeof ICONS;

// Builds a Lucide icon as hast (svg element), mirroring Lucide's default
// attributes so it matches the @lucide/svelte components used elsewhere.
function iconHast(name: IconName, className: string): Element {
  const children = ICONS[name].map(([tag, attrs]) =>
    s(tag, attrs as Record<string, string | number>),
  );
  return s(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      class: className,
      "aria-hidden": "true",
    },
    children,
  );
}

interface AdmonitionConfig {
  icon: IconName;
  border: string;
  header: string;
  body: string;
  text: string;
}

// Type set + light-only palette (warning/tip use raw Tailwind status scales since
// the theme has no token for them; dark mode is a separate workstream).
const CALLOUTS: Record<string, AdmonitionConfig> = {
  note: {
    icon: "pencil",
    border: "border-foreground/20",
    header: "bg-muted",
    body: "bg-muted/30",
    text: "text-foreground",
  },
  info: {
    icon: "info",
    border: "border-primary/40",
    header: "bg-primary/10",
    body: "bg-primary/5",
    text: "text-primary",
  },
  tip: {
    icon: "lightbulb",
    border: "border-emerald-500/40",
    header: "bg-emerald-100",
    body: "bg-emerald-50",
    text: "text-emerald-900",
  },
  warning: {
    icon: "triangle-alert",
    border: "border-amber-500/50",
    header: "bg-amber-100",
    body: "bg-amber-50",
    text: "text-amber-900",
  },
  danger: {
    icon: "octagon-alert",
    border: "border-destructive/40",
    header: "bg-destructive/10",
    body: "bg-destructive/5",
    text: "text-destructive",
  },
};

// Unknown / not-yet-styled types (typos, or steps/cards/accordion before they get
// their own renderers) fall back to a neutral box, so mistakes stay visible.
const NEUTRAL = CALLOUTS.note;

const BODY_RESET = ["[&>*:first-child]:mt-0", "[&>*:last-child]:mb-0"];

/** remark-rehype handler: an `admonition` mdast node to styled hast. */
export function admonitionHandler(state: State, node: Admonition): Element {
  const cfg = CALLOUTS[node.atype] ?? NEUTRAL;
  const title = admonitionTitle(node);
  const children = state.all(node);
  const body = h("div", { class: ["px-4", "py-3", cfg.body, ...BODY_RESET] }, children);

  if (node.collapsible) {
    return h(
      "details",
      {
        ...(node.open ? { open: true } : {}),
        class: ["markdown-collapsible", "group", "my-4", "border", "border-l-4", cfg.border],
      },
      [
        h(
          "summary",
          {
            class: [
              "flex",
              "cursor-pointer",
              "list-none",
              "items-center",
              "gap-2",
              "px-4",
              "py-2",
              "text-sm",
              "font-semibold",
              cfg.header,
              cfg.text,
              "[&::-webkit-details-marker]:hidden",
            ],
          },
          [
            iconHast(cfg.icon, "size-4 shrink-0"),
            h("span", title),
            iconHast(
              "chevron-down",
              "ml-auto size-4 shrink-0 group-open:rotate-180 motion-safe:transition-transform",
            ),
          ],
        ),
        body,
      ],
    );
  }

  return h("div", { class: ["my-4", "border", "border-l-4", cfg.border] }, [
    h(
      "div",
      {
        class: [
          "flex",
          "items-center",
          "gap-2",
          "px-4",
          "py-2",
          "text-sm",
          "font-semibold",
          cfg.header,
          cfg.text,
        ],
      },
      [iconHast(cfg.icon, "size-4 shrink-0"), h("span", title)],
    ),
    body,
  ]);
}
