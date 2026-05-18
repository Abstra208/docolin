// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { AuthResult } from "@workos/authkit-session";
import type { R2Bucket } from "@cloudflare/workers-types";
import type { DbOrg, DbUser } from "$lib/server/users";

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      auth: AuthResult;
      // null when the visitor is anonymous or WorkOS-authed but hasn't
      // completed onboarding (no row in our users table yet).
      dbUser: DbUser | null;
      personalOrg: DbOrg | null;
    }
    // Per-user state (auth, dbUser, inbox count) is intentionally NOT in
    // PageData: it would force every page that includes the navbar to be
    // session-bound and uncacheable. Instead it lives in the client-side
    // store at $lib/client/session.svelte.ts, fetched from /api/session
    // after hydration. The HTML stays identical for every reader and can
    // be edge-cached.
    // interface PageState {}

    // Cloudflare bindings + runtime exposed by adapter-cloudflare via
    // wrangler.toml. Available on `event.platform` in server load functions,
    // form actions, and endpoints, both in `vite dev` and in production.
    interface Platform {
      env: {
        MEDIA_BUCKET: R2Bucket;
      };
      // CF Workers' ExecutionContext. `waitUntil` keeps the Worker alive
      // until the promise resolves; used by sync engine to fire-and-forget
      // background work (initial sync after project create, webhook syncs).
      context: {
        waitUntil(promise: Promise<unknown>): void;
        passThroughOnException(): void;
      };
    }
  }
}

export {};
