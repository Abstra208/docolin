<script lang="ts">
  import { onMount } from "svelte";
  import { m } from "$paraglide/messages";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import Search from "@lucide/svelte/icons/search";
  import InboxList from "$lib/components/InboxList.svelte";

  interface Message {
    id: string;
    kind: string;
    subject: string;
    preview: string;
    hasLink: boolean;
    readAt: string | null;
    createdAt: string;
  }

  let payload = $state<{ messages: Message[] } | null>(null);
  let loadError = $state<string | null>(null);
  // Query lives at the page level so the search input renders even while
  // the messages payload is in flight. Filter applies once payload lands.
  let query = $state("");

  async function loadInbox(): Promise<void> {
    loadError = null;
    try {
      const res = await fetch("/api/dashboard/inbox?bucket=inbox", {
        credentials: "same-origin",
      });
      if (res.status === 401) return;
      if (!res.ok) {
        loadError = `HTTP ${res.status.toString()}`;
        return;
      }
      payload = (await res.json()) as { messages: Message[] };
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  onMount(() => {
    void loadInbox();
  });

  // Drop a row from the client-fetched list when its mark-done succeeds.
  function removeMessage(id: string): void {
    if (payload) payload.messages = payload.messages.filter((msg) => msg.id !== id);
  }
</script>

<svelte:head>
  <title>{m.inbox_meta_title()} · docolin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<h1 class="text-foreground mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
  {m.inbox_heading()}
</h1>

<!-- Search input lives above the conditional content so it's visible during
     both loading and loaded states. Typing during loading is fine: query
     state persists and the filter applies the moment messages arrive. -->
<div class="relative mb-4">
  <Search
    class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
  />
  <Input
    type="search"
    bind:value={query}
    placeholder={m.inbox_search_placeholder()}
    aria-label={m.inbox_search_placeholder()}
    class="h-10 pl-9"
  />
</div>

{#if loadError !== null}
  <div
    class="border-destructive/40 bg-destructive/5 mb-6 flex items-center justify-between gap-4 border p-4"
  >
    <p class="text-destructive text-sm">{m.dashboard_load_error()}</p>
    <Button type="button" variant="outline" size="sm" onclick={() => void loadInbox()}>
      {m.dashboard_load_error_retry()}
    </Button>
  </div>
{/if}

{#if payload === null && loadError === null}
  <!-- Skeleton row placeholders. h-16 ≈ a typical real row (icon + subject +
       preview lines + dates), so the list doesn't reflow when content arrives. -->
  <ul class="border-foreground/15 divide-foreground/10 flex flex-col divide-y border">
    <li class="bg-muted h-16 animate-pulse"></li>
    <li class="bg-muted h-16 animate-pulse"></li>
    <li class="bg-muted h-16 animate-pulse"></li>
  </ul>
{:else if payload}
  <InboxList
    messages={payload.messages}
    bucket="inbox"
    {query}
    emptyTitle={m.inbox_empty_title()}
    emptyBody={m.inbox_empty_body()}
    onActioned={removeMessage}
  />
{/if}
