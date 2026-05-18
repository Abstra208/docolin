<script lang="ts">
  import type { Snippet } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import DashboardNavbar from "$lib/components/DashboardNavbar.svelte";
  import { session } from "$lib/client/session.svelte";
  import { localizeHref } from "$paraglide/runtime";

  let { children }: { children: Snippet } = $props();

  // Client-side auth gate. Moved here from a server-side redirect in
  // +layout.server.ts so the dashboard shell stays edge-cacheable (the HTML
  // is the same for every reader; the API calls inside fetch per-user data
  // separately). Brief loading flash for anonymous visitors before the goto
  // bounces them, traded for cache savings on every signed-in visit.
  //
  // Bounce uses replaceState so the back button skips the unauthed shell
  // instead of trapping the user in a redirect loop.
  $effect(() => {
    if (!session.loaded) return;
    const returnTo = encodeURIComponent(page.url.pathname);
    if (!session.value.auth) {
      void goto(localizeHref(`/signin?returnTo=${returnTo}`), { replaceState: true });
      return;
    }
    if (!session.value.dbUser) {
      void goto(localizeHref(`/onboarding?returnTo=${returnTo}`), { replaceState: true });
    }
  });
</script>

<div class="bg-background text-foreground flex min-h-screen flex-col">
  <DashboardNavbar />
  <main class="flex-1 px-6 pt-20 pb-16 sm:px-8">
    {@render children()}
  </main>
</div>
