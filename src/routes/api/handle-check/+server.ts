import { json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { checkHandleAvailability } from "$lib/reserved-handles";

// Live availability check called from the onboarding handle picker as the
// user types (debounced client-side). Returns a typed status enum the client
// maps to localized helper text. Treats all reserved categories as "not
// usable for a personal handle" since the user-handle step doesn't run the
// claim flow.
export const GET: RequestHandler = async ({ url, setHeaders }) => {
  const raw = url.searchParams.get("h") ?? "";
  const handle = raw.trim().toLowerCase();

  // Edge-dedupe rapid typing. The response depends only on `?h=`, so the same
  // handle from any user gets the same answer. 30s of edge cache covers the
  // typing-rate window; the browser always revalidates so a user who's just
  // claimed a handle sees the updated answer on the next keystroke.
  setHeaders({ "cache-control": "public, max-age=0, s-maxage=30" });

  const shapeCheck = checkHandleAvailability(handle);
  if (!shapeCheck.ok) {
    return json({ ok: false, reason: shapeCheck.reason });
  }

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);

  if (rows.length > 0) {
    return json({ ok: false, reason: "taken" });
  }

  return json({ ok: true });
};
