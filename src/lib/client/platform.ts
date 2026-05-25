// Whether the current browser is an Apple platform, used to show the right
// keyboard-shortcut modifier (⌘ vs Ctrl). Returns false during SSR (no
// navigator), so callers render the non-Mac label first and swap after
// hydration. No regex (CLAUDE.md 3.8).
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return ua.includes("Mac") || ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod");
}
