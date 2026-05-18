import type { PageServerLoad } from "./$types";

// Edge-cacheable shell for /dashboard. The per-user content (orgs list,
// pending claims) is fetched client-side from /api/dashboard/me after the
// session store resolves; this load function exists solely to apply the
// shell cache header. The shell HTML is identical for every signed-in user
// and changes only on app deploys, which CF Pages auto-purges.
export const load: PageServerLoad = ({ setHeaders }) => {
  setHeaders({
    "cache-control": "public, max-age=300, s-maxage=2592000, stale-while-revalidate=604800",
  });
  return {};
};
