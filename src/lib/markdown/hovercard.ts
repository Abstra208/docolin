// Client-only popovers for rendered markdown, in two interaction modes over a shared
// card stack:
//
//   hover  - footnote + link previews. Hover/focus opens a card; a marker nested in a
//            card stacks a new card on top; the stack closes from the top as the
//            pointer retreats, fully on a background hover.
//   click  - code annotations (MkDocs-style). Clicking opens a card; clicking a sibling
//            marker replaces it, clicking a marker nested inside the open card stacks a
//            new one on top, and a background click closes everything.
//
// The markup is server-rendered HTML (or fetched), so this is delegated, not a
// component per marker. Positioning uses Floating UI (the shadcn primitives' library).
import { autoUpdate, computePosition, flip, offset, shift, type Placement } from "@floating-ui/dom";

export interface HovercardSource {
  /** CSS selector matching the trigger elements. */
  selector: string;
  /** "hover" reveals on hover/focus (graceful no-op on touch); "click" toggles
   *  (so touch works, and nested markers stack). */
  trigger: "hover" | "click";
  /** Floating UI placement; defaults to "top" (above an inline marker). */
  placement?: Placement;
  /** The content to show for a trigger, or null to skip. May fetch (async). */
  resolve: (element: HTMLElement) => Node | null | Promise<Node | null>;
  /** Called after the content lands in the card, to hydrate dynamic widgets in the
   *  cloned markup (diagrams, charts, tab groups). */
  onShown?: (card: HTMLElement) => void;
}

const SHOW_DELAY = 120;
const HIDE_DELAY = 200;

function makeCard(): HTMLElement {
  const card = document.createElement("div");
  card.className = "doco-hovercard";
  card.setAttribute("role", "tooltip");
  document.body.append(card);
  return card;
}

// Keeps the card pinned to its trigger (flips/shifts on collision, follows scroll).
function anchor(trigger: HTMLElement, card: HTMLElement, placement: Placement): () => void {
  return autoUpdate(trigger, card, () => {
    void computePosition(trigger, card, {
      strategy: "fixed",
      placement,
      middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      card.style.left = `${String(x)}px`;
      card.style.top = `${String(y)}px`;
    });
  });
}

function triggerFrom(target: Element, sources: HovercardSource[]): HTMLElement | null {
  for (const source of sources) {
    const match = target.closest(source.selector);
    if (match instanceof HTMLElement) return match;
  }
  return null;
}

function sourceFrom(element: HTMLElement, sources: HovercardSource[]): HovercardSource | undefined {
  return sources.find((source) => element.matches(source.selector));
}

interface Layer {
  trigger: HTMLElement;
  card: HTMLElement;
  stop: () => void;
}

interface Stack {
  layers: Layer[];
  closeFrom: (index: number) => void;
  depthOf: (element: Element) => number;
  openAt: (parentIndex: number, trigger: HTMLElement) => Promise<void>;
}

// A stack of cards: layer 0 is opened from a marker in the page, layer N+1 from a
// marker nested inside layer N's card.
function createStack(sources: HovercardSource[]): Stack {
  const layers: Layer[] = [];

  function closeFrom(index: number): void {
    while (layers.length > index) {
      const layer = layers.pop();
      if (layer === undefined) break;
      layer.stop();
      layer.card.remove();
      if (layer.trigger.hasAttribute("aria-expanded")) {
        layer.trigger.setAttribute("aria-expanded", "false");
      }
    }
  }

  // The layer index whose card contains `element`, or -1 if it's in the page body.
  function depthOf(element: Element): number {
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      if (layers[i].card.contains(element)) return i;
    }
    return -1;
  }

  async function openAt(parentIndex: number, trigger: HTMLElement): Promise<void> {
    const source = sourceFrom(trigger, sources);
    if (source === undefined) return;
    if (layers.at(parentIndex + 1)?.trigger === trigger) return; // already open from here
    closeFrom(parentIndex + 1); // replace any sibling/deeper layer at this level
    const content = await source.resolve(trigger);
    // Bail if there's no content, or the stack shifted while resolving (async fetch).
    if (content === null || layers.length !== parentIndex + 1) return;
    const card = makeCard();
    card.append(content);
    const stop = anchor(trigger, card, source.placement ?? "top");
    layers.push({ trigger, card, stop });
    if (source.trigger === "click") trigger.setAttribute("aria-expanded", "true");
    source.onShown?.(card);
  }

  return { layers, closeFrom, depthOf, openAt };
}

// Footnote + link previews.
function setupHover(sources: HovercardSource[]): () => void {
  const { layers, closeFrom, depthOf, openAt } = createStack(sources);
  let showTimer = 0;
  let hideTimer = 0;

  function scheduleHide(): void {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      closeFrom(0);
    }, HIDE_DELAY);
  }

  function onPointerOver(event: PointerEvent): void {
    if (!(event.target instanceof Element)) return;
    const trigger = triggerFrom(event.target, sources);
    if (trigger !== null) {
      window.clearTimeout(hideTimer);
      const parentIndex = depthOf(trigger); // -1 = body, else the card it lives in
      if (layers.at(parentIndex + 1)?.trigger === trigger) return; // already showing
      window.clearTimeout(showTimer);
      showTimer = window.setTimeout(() => void openAt(parentIndex, trigger), SHOW_DELAY);
      return;
    }
    const depth = depthOf(event.target);
    if (depth >= 0) {
      // Over a card: keep it and its ancestors, close any deeper layer we've left.
      window.clearTimeout(hideTimer);
      window.clearTimeout(showTimer);
      closeFrom(depth + 1);
      return;
    }
    // Background: close the whole stack.
    window.clearTimeout(showTimer);
    scheduleHide();
  }

  function onFocusIn(event: FocusEvent): void {
    if (!(event.target instanceof Element)) return;
    const trigger = triggerFrom(event.target, sources);
    if (trigger === null) return;
    window.clearTimeout(hideTimer);
    void openAt(depthOf(trigger), trigger);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") closeFrom(0);
  }

  document.addEventListener("pointerover", onPointerOver);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", scheduleHide);
  document.addEventListener("keydown", onKeyDown);
  return () => {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    closeFrom(0);
    document.removeEventListener("pointerover", onPointerOver);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("focusout", scheduleHide);
    document.removeEventListener("keydown", onKeyDown);
  };
}

// Code annotations.
function setupClick(sources: HovercardSource[]): () => void {
  const { layers, closeFrom, depthOf, openAt } = createStack(sources);

  function onClick(event: MouseEvent): void {
    if (!(event.target instanceof Element)) return;
    const trigger = triggerFrom(event.target, sources);
    if (trigger !== null) {
      event.preventDefault();
      const parentIndex = depthOf(trigger); // -1 = body, else the card it's nested in
      // Re-clicking the open marker toggles it (and anything deeper) shut; otherwise
      // open it, replacing any sibling at this level and stacking above its parent.
      if (layers.at(parentIndex + 1)?.trigger === trigger) closeFrom(parentIndex + 1);
      else void openAt(parentIndex, trigger);
      return;
    }
    // A click in the page background (not inside an open card) closes everything.
    if (depthOf(event.target) === -1) closeFrom(0);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") closeFrom(0);
  }

  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeyDown);
  return () => {
    closeFrom(0);
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKeyDown);
  };
}

export function setupHovercards(sources: HovercardSource[]): () => void {
  const teardowns: (() => void)[] = [];
  const hoverSources = sources.filter((source) => source.trigger === "hover");
  const clickSources = sources.filter((source) => source.trigger === "click");
  if (hoverSources.length > 0) teardowns.push(setupHover(hoverSources));
  if (clickSources.length > 0) teardowns.push(setupClick(clickSources));
  return () => {
    for (const teardown of teardowns) teardown();
  };
}
