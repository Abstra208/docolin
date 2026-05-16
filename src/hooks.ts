import type { Reroute } from "@sveltejs/kit";
import { deLocalizeUrl } from "$paraglide/runtime";

// Strip the locale prefix before SvelteKit matches routes, so the same
// `+page.svelte` files serve both /about and /de/about. Runs in the browser
// and on the server.
export const reroute: Reroute = (request) => deLocalizeUrl(request.url).pathname;
