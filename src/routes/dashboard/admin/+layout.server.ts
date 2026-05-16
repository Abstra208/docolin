import { error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

// Platform-admin gate. Returns 404 (not 403) for non-admins so the existence
// of admin routes isn't leaked. Parent /dashboard layout already enforces
// auth + onboarded; this just layers the admin check on top.
export const load: LayoutServerLoad = ({ locals }) => {
  if (!locals.dbUser?.isPlatformAdmin) error(404);
  return {};
};
