<script lang="ts">
  import type { Snippet } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { m } from "$paraglide/messages";
  import DashboardNavbar from "$lib/components/DashboardNavbar.svelte";
  import { session } from "$lib/client/session.svelte";
  import { localizeHref } from "$paraglide/runtime";
  import Building2 from "@lucide/svelte/icons/building-2";
  import Plug from "@lucide/svelte/icons/plug";

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

  // Category rail. Inbox and admin are self-contained areas with their own
  // chrome, so the rail stays out of their way; everywhere else (the org
  // overview, a single org, the MCP page) it frames the content. Matching is
  // substring-based so it survives the locale prefix (/de/dashboard/...).
  const path = $derived(page.url.pathname);
  const showSidebar = $derived(
    !path.includes("/dashboard/inbox") && !path.includes("/dashboard/admin"),
  );
  const mcpActive = $derived(path.includes("/dashboard/mcp"));

  const activeClass =
    "bg-muted text-foreground flex items-center gap-2 px-3 py-2 text-sm font-medium";
  const idleClass =
    "text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-2 px-3 py-2 text-sm transition-colors";
</script>

<div class="bg-background text-foreground flex min-h-screen flex-col">
  <DashboardNavbar />
  <main class="flex-1 px-6 pt-20 pb-16 sm:px-8">
    {#if showSidebar}
      <!-- Three tracks: left rail, content, and an empty right track the same
           width as the rail. The rail pins to the left like the doco pages,
           while the equal phantom track keeps the content centered in the
           viewport (not just in the space beside the rail). On narrow screens
           the grid collapses and the rail becomes a horizontal strip above the
           content so the categories stay reachable. -->
      <div class="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)_14rem] lg:gap-10">
        <aside class="mb-6 lg:mb-0">
          <nav class="flex flex-row gap-1 lg:sticky lg:top-20 lg:flex-col">
            <a href={localizeHref("/dashboard")} class={mcpActive ? idleClass : activeClass}>
              <Building2 class="size-4" />
              <span>{m.dashboard_nav_orgs()}</span>
            </a>
            <a href={localizeHref("/dashboard/mcp")} class={mcpActive ? activeClass : idleClass}>
              <Plug class="size-4" />
              <span>{m.dashboard_nav_mcp()}</span>
            </a>
          </nav>
        </aside>
        <div class="min-w-0">
          {@render children()}
        </div>
      </div>
    {:else}
      {@render children()}
    {/if}
  </main>
</div>
