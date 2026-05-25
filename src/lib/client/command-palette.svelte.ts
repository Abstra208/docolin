// Global state for the ⌘K search palette. A module-level singleton (like the
// session store) so any navbar's search button and the global keyboard shortcut
// can open the same palette, which is mounted once in the root layout.
//
// `focusOverride`: when a page has its own prominent search input (the homepage
// hero), it registers a focus callback here. While set, ⌘K focuses that input
// instead of opening the modal, so there's only ever one search surface on that
// page. Cleared when the page unmounts.
export const commandPalette = $state<{
  open: boolean;
  focusOverride: (() => void) | null;
}>({
  open: false,
  focusOverride: null,
});
