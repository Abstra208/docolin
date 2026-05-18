import { json } from "@sveltejs/kit";
import { and, count, eq, isNull } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { inboxMessages } from "$lib/server/db/schema";

// Per-user session payload consumed by the client-side session store. Split
// out from `+layout.server.ts` so the public doco / project / org HTML can
// be edge-cached without baking any reader's identity into the response.
// `private, no-store` keeps this response off shared caches and out of the
// browser cache so signout / signin reflect immediately on next fetch.

export interface SessionPayload {
  auth: { email: string } | null;
  dbUser: {
    handle: string;
    displayName: string | null;
    isPlatformAdmin: boolean;
  } | null;
  inboxUnreadCount: number;
}

export const GET: RequestHandler = async ({ locals, setHeaders }) => {
  setHeaders({ "cache-control": "private, no-store" });

  let inboxUnreadCount = 0;
  if (locals.dbUser) {
    const rows = await db
      .select({ c: count() })
      .from(inboxMessages)
      .where(
        and(
          eq(inboxMessages.userId, locals.dbUser.id),
          isNull(inboxMessages.readAt),
          isNull(inboxMessages.doneAt),
        ),
      );
    inboxUnreadCount = rows[0]?.c ?? 0;
  }

  const payload: SessionPayload = {
    auth: locals.auth.user ? { email: locals.auth.user.email } : null,
    dbUser: locals.dbUser
      ? {
          handle: locals.dbUser.handle,
          displayName: locals.dbUser.displayName,
          isPlatformAdmin: locals.dbUser.isPlatformAdmin,
        }
      : null,
    inboxUnreadCount,
  };
  return json(payload);
};
