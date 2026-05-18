import { error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

// Platform-admin gate. Returns 404 (not 403) for non-admins so the existence
// of admin routes isn't leaked. Parent /dashboard layout already enforces
// auth + onboarded; this just layers the admin check on top.
//
// Admin surfaces are intentionally not edge-cacheable: tiny audience, no real
// freshness budget (admins want to see live moderation state), and the cost
// of accidentally leaking another admin's view is high. Defensive no-store at
// the layout level covers every child route in one place.
export const load: LayoutServerLoad = ({ locals, setHeaders }) => {
  if (!locals.dbUser?.isPlatformAdmin) error(404);
  setHeaders({ "cache-control": "private, no-store" });
  return {};
};
