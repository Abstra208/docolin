import type { PageServerLoad } from "./$types";

// Shell. Claim detail loads client-side from /api/dashboard/claims/[uid].
// No form actions on this page; the only call-to-action is a mailto: link.
export const load: PageServerLoad = ({ setHeaders }) => {
  setHeaders({
    "cache-control": "public, max-age=300, s-maxage=2592000, stale-while-revalidate=604800",
  });
  return {};
};
