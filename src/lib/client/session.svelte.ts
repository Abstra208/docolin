import { browser } from "$app/environment";
import type { SessionPayload } from "../../routes/api/session/+server";

// Browser-side session store. Hydrates from /api/session after first paint
// so that the cached server-rendered HTML never carries a specific user's
// auth, handle, or unread count. The navbar widgets read from `session`
// directly; an unauthed snapshot renders first, then swaps to the real
// values when the fetch resolves.
//
// One singleton per browser document. Module-level $state is safe here
// because the only mutation site (refresh) is gated on `browser`; on the
// server every request just observes the empty default and renders the
// anonymous nav, which matches what we cache.

const EMPTY: SessionPayload = {
  auth: null,
  dbUser: null,
  inboxUnreadCount: 0,
};

export const session = $state<{
  value: SessionPayload;
  loaded: boolean;
}>({
  value: EMPTY,
  loaded: false,
});

let inFlight: Promise<void> | null = null;

export function refreshSession(): Promise<void> {
  if (!browser) return Promise.resolve();
  if (inFlight !== null) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/session", {
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        session.value = EMPTY;
        session.loaded = true;
        return;
      }
      const data = (await res.json()) as SessionPayload;
      session.value = data;
      session.loaded = true;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
