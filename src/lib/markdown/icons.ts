import { ChevronDown, Info, Lightbulb, OctagonAlert, Pencil, TriangleAlert } from "lucide";

// Real Lucide icons injected into rendered markdown HTML. We can't mount Svelte
// components into {@html} output, so we serialize Lucide's icon-node data to an
// <svg> string here (used by both the server renderer and the client preview).
// One source of truth for every icon the renderers emit: callout headers,
// collapsible chevrons, and (later) card icons and the code-block copy button.
// The wrapper's stroke attributes match Lucide's defaults, so these look
// identical to the @lucide/svelte components used elsewhere in the app.
//
// DOMPurify keeps <svg> and its child shapes (path, circle, line, ...) in its
// default allowlist, and we allow `class`, so the output survives sanitization,
// the same path the GFM task-list checkbox SVG already takes.

// lucide doesn't export its IconNode type by a stable name across versions, so
// derive it from an icon value: each icon is an array of [tag, attrs] tuples.
type LucideIcon = typeof Info;

function iconSvg(node: LucideIcon, className: string): string {
  const children = node
    .map(([tag, attrs]) => {
      const serialized = Object.entries(attrs)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}="${String(value)}"`)
        .join(" ");
      return `<${tag} ${serialized} />`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}" aria-hidden="true">${children}</svg>`;
}

// Named registry so renderers ask for an icon by a stable key rather than
// importing Lucide nodes directly. Add an entry when a renderer needs a new one.
const ICONS = {
  pencil: Pencil,
  info: Info,
  lightbulb: Lightbulb,
  "triangle-alert": TriangleAlert,
  "octagon-alert": OctagonAlert,
  "chevron-down": ChevronDown,
} satisfies Record<string, LucideIcon>;

/** A key into the icon registry, e.g. "info" or "triangle-alert". */
export type IconName = keyof typeof ICONS;

/** Returns an inline `<svg>` string for the named icon with the given classes. */
export function icon(name: IconName, className: string): string {
  return iconSvg(ICONS[name], className);
}
