// Client-only popovers for rendered markdown, in two modes that match what readers
// expect from each feature:
//
//   hover  - one shared card that follows the pointer (footnote + link previews).
//            Switches between markers on hover; closes only when you leave to the
//            background, not when moving to another marker.
//   click  - a persistent card per trigger (code annotations, MkDocs-style). Clicking
//            opens one and leaves others open; a background click closes them all.
//
// The markup is server-rendered HTML (or fetched), so this is delegated, not a
// component per marker. Positioning uses Floating UI (the shadcn primitives' library).
import { autoUpdate, computePosition, flip, offset, shift, type Placement } from "@floating-ui/dom";

export interface HovercardSource {
  /** CSS selector matching the trigger elements. */
  selector: string;
  /** "hover" reveals on hover/focus (graceful no-op on touch); "click" toggles a
   *  persistent card (so touch works, and several can stay open). */
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

// Footnote + link previews: hover/focus opens a card; a marker nested inside a card
// stacks a NEW card on top (it never replaces its parent). The stack closes from the
// top as the pointer retreats over the cards, and fully on a background hover.
function setupHover(sources: HovercardSource[]): () => void {
  interface Layer {
    trigger: HTMLElement;
    card: HTMLElement;
    stop: () => void;
  }
  const stack: Layer[] = [];
  let showTimer = 0;
  let hideTimer = 0;

  // Close every layer at `index` and above (top-down).
  function closeFrom(index: number): void {
    while (stack.length > index) {
      const layer = stack.pop();
      if (layer === undefined) break;
      layer.stop();
      layer.card.remove();
    }
  }

  // The stack index of the card containing `element`, or -1 if it's in the page body.
  function depthOf(element: Element): number {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      if (stack[i].card.contains(element)) return i;
    }
    return -1;
  }

  async function openAt(parentIndex: number, trigger: HTMLElement): Promise<void> {
    const source = sourceFrom(trigger, sources);
    if (source === undefined) return;
    if (stack.at(parentIndex + 1)?.trigger === trigger) return; // already open from here
    closeFrom(parentIndex + 1); // drop any deeper layers first
    const content = await source.resolve(trigger);
    // Bail if there's no content, or the stack shifted while resolving (async fetch).
    if (content === null || stack.length !== parentIndex + 1) return;
    const card = makeCard();
    card.append(content);
    const stop = anchor(trigger, card, source.placement ?? "top");
    stack.push({ trigger, card, stop });
    source.onShown?.(card);
  }

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
      if (stack.at(parentIndex + 1)?.trigger === trigger) return; // already showing
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

// A persistent card per trigger, click driven (MkDocs-style annotations).
function setupClick(sources: HovercardSource[]): () => void {
  const open = new Map<HTMLElement, { card: HTMLElement; stop: () => void }>();

  function close(trigger: HTMLElement): void {
    const entry = open.get(trigger);
    if (entry === undefined) return;
    entry.stop();
    entry.card.remove();
    open.delete(trigger);
    trigger.setAttribute("aria-expanded", "false");
  }

  function closeAll(): void {
    for (const trigger of [...open.keys()]) close(trigger);
  }

  async function openCard(trigger: HTMLElement): Promise<void> {
    const source = sourceFrom(trigger, sources);
    if (source === undefined || open.has(trigger)) return;
    const content = await source.resolve(trigger);
    if (content === null || open.has(trigger)) return;
    const card = makeCard();
    card.append(content);
    const stop = anchor(trigger, card, source.placement ?? "top");
    open.set(trigger, { card, stop });
    trigger.setAttribute("aria-expanded", "true");
    source.onShown?.(card);
  }

  function onClick(event: MouseEvent): void {
    if (!(event.target instanceof Element)) return;
    const trigger = triggerFrom(event.target, sources);
    if (trigger !== null) {
      event.preventDefault();
      if (open.has(trigger))
        close(trigger); // toggle this one; others stay open
      else void openCard(trigger);
      return;
    }
    // A click outside the triggers closes everything, unless it landed in a card.
    for (const entry of open.values()) {
      if (entry.card.contains(event.target)) return;
    }
    closeAll();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") closeAll();
  }

  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeyDown);
  return () => {
    closeAll();
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
