<script lang="ts">
  import type { Snippet } from "svelte";
  import DashboardNavbar from "$lib/components/DashboardNavbar.svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div class="bg-background text-foreground flex min-h-screen flex-col">
  <DashboardNavbar />
  <main class="flex-1 px-6 pt-20 pb-16 sm:px-8">
    {@render children()}
  </main>
</div>
