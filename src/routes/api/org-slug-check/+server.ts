import { json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { orgs } from "$lib/server/db/schema";
import { checkHandleAvailability } from "$lib/reserved-handles";

// Live availability check for a new org slug. Validates via the same
// reserved-name rules as user handles (shape + reserved sets), then queries
// orgs.slug for uniqueness. Personal orgs live in orgs too, so this single
// table check catches both kinds of collision.
//
// `reserved_prereserved` is reported as-is so the client can offer the claim
// path; the form action treats it as "switch to claim mode" rather than as
// a hard error.
export const GET: RequestHandler = async ({ url }) => {
  const raw = url.searchParams.get("h") ?? "";
  const slug = raw.trim().toLowerCase();

  const shapeCheck = checkHandleAvailability(slug);
  if (!shapeCheck.ok) {
    return json({ ok: false, reason: shapeCheck.reason });
  }

  const rows = await db.select({ id: orgs.id }).from(orgs).where(eq(orgs.slug, slug)).limit(1);

  if (rows.length > 0) {
    return json({ ok: false, reason: "taken" });
  }

  return json({ ok: true });
};
