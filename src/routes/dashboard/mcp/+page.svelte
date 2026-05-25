<script lang="ts">
  import { enhance } from "$app/forms";
  import { toast } from "svelte-sonner";
  import { m } from "$paraglide/messages";
  import { getLocale, localizeHref } from "$paraglide/runtime";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import Copy from "@lucide/svelte/icons/copy";
  import Plug from "@lucide/svelte/icons/plug";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import KeyRound from "@lucide/svelte/icons/key-round";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  // ActionData is a union across the create/revoke actions; narrow with `in`
  // before reading a member-specific field.
  const createdToken = $derived(form && "created" in form ? form.created : null);
  const nameError = $derived(form && "error" in form && form.error === "name");

  let creating = $state(false);
  let revokingId = $state<string | null>(null);

  function formatDate(value: Date): string {
    return new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(value);
  }

  function copy(value: string): void {
    // Copy is best-effort: if the browser blocks clipboard access the token
    // stays on screen to select by hand, so a failure needs no error surface.
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        toast.success(m.mcp_tokens_copied_toast());
      })
      .catch(() => undefined);
  }
</script>

<svelte:head>
  <title>{m.mcp_tokens_meta_title()}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-2xl">
  <h1 class="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
    {m.mcp_tokens_heading()}
  </h1>
  <p class="text-foreground/80 mt-4 text-base leading-relaxed">
    {m.mcp_tokens_intro()}
  </p>

  <!-- Connect: the endpoint any Streamable HTTP MCP client points at. -->
  <section class="mt-10">
    <h2 class="text-foreground flex items-center gap-2 text-lg font-medium">
      <Plug class="size-4" />
      {m.mcp_tokens_connect_heading()}
    </h2>
    <p class="text-muted-foreground mt-2 text-sm leading-relaxed">
      {m.mcp_tokens_connect_body()}
    </p>
    <div class="border-foreground/15 bg-muted mt-4 flex items-center gap-3 border p-3">
      <code class="text-foreground min-w-0 flex-1 truncate font-mono text-sm">{data.endpoint}</code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="h-8 shrink-0 gap-2"
        onclick={() => {
          copy(data.endpoint);
        }}
      >
        <Copy class="size-4" />
        {m.mcp_tokens_copy()}
      </Button>
    </div>
    <a
      href={localizeHref("/docolin/docolin/mcp/connect")}
      class="text-primary mt-3 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
    >
      {m.mcp_connect_guide_link()}
      <ArrowRight class="size-4" />
    </a>
  </section>

  <!-- Personal tokens. -->
  <section class="mt-12">
    <h2 class="text-foreground flex items-center gap-2 text-lg font-medium">
      <KeyRound class="size-4" />
      {m.mcp_tokens_list_heading()}
    </h2>
    <p class="text-muted-foreground mt-2 text-sm leading-relaxed">
      {m.mcp_tokens_list_intro()}
    </p>

    <!-- One-time reveal of a freshly minted token. -->
    {#if createdToken}
      <div class="border-primary/30 bg-primary/5 mt-6 border border-l-4 p-5">
        <p class="text-foreground text-base font-medium">{m.mcp_tokens_created_title()}</p>
        <p class="text-foreground/80 mt-2 text-sm leading-relaxed">
          {m.mcp_tokens_created_body()}
        </p>
        <div class="border-foreground/15 bg-background mt-4 flex items-center gap-3 border p-3">
          <code class="text-foreground min-w-0 flex-1 font-mono text-sm break-all">
            {createdToken.token}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-8 shrink-0 gap-2"
            onclick={() => {
              copy(createdToken.token);
            }}
          >
            <Copy class="size-4" />
            {m.mcp_tokens_created_copy_button()}
          </Button>
        </div>
      </div>
    {/if}

    <!-- Create form. -->
    <form
      method="POST"
      action="?/create"
      class="mt-6"
      use:enhance={() => {
        creating = true;
        return ({ update }) => {
          void update().finally(() => {
            creating = false;
          });
        };
      }}
    >
      <label for="tokenName" class="text-foreground/80 mb-2 block text-sm font-medium">
        {m.mcp_tokens_name_label()}
      </label>
      <div class="flex flex-col gap-3 sm:flex-row">
        <Input
          id="tokenName"
          name="name"
          type="text"
          maxlength={60}
          required
          placeholder={m.mcp_tokens_name_placeholder()}
          class="h-10 sm:flex-1"
        />
        <Button type="submit" disabled={creating} class="h-10 shrink-0 gap-2">
          {creating ? m.mcp_tokens_create_pending() : m.mcp_tokens_create_button()}
        </Button>
      </div>
      {#if nameError}
        <p
          class="text-destructive border-destructive/30 bg-destructive/5 mt-3 border px-3 py-2 text-sm"
        >
          {m.mcp_tokens_error_name()}
        </p>
      {:else}
        <p class="text-muted-foreground mt-2 text-xs">{m.mcp_tokens_name_hint()}</p>
      {/if}
    </form>

    <!-- Existing tokens. -->
    {#if data.tokens.length === 0}
      <p class="text-muted-foreground mt-8 text-sm">{m.mcp_tokens_empty_body()}</p>
    {:else}
      <ul class="divide-foreground/10 border-foreground/15 mt-8 divide-y border">
        {#each data.tokens as token (token.id)}
          <li class="flex items-center gap-4 p-4">
            <div class="min-w-0 flex-1">
              <p class="text-foreground truncate text-sm font-medium">{token.name}</p>
              <p class="text-muted-foreground mt-1 font-mono text-xs">{token.tokenPrefix}...</p>
              <p class="text-muted-foreground mt-1 text-xs">
                {m.mcp_tokens_meta_created({ date: formatDate(token.createdAt) })}
                <span aria-hidden="true">·</span>
                {token.lastUsedAt
                  ? m.mcp_tokens_meta_used({ date: formatDate(token.lastUsedAt) })
                  : m.mcp_tokens_meta_never_used()}
              </p>
            </div>
            <form
              method="POST"
              action="?/revoke"
              use:enhance={() => {
                revokingId = token.id;
                return ({ update }) => {
                  void update().finally(() => {
                    revokingId = null;
                  });
                };
              }}
            >
              <input type="hidden" name="id" value={token.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={revokingId === token.id}
                class="text-muted-foreground hover:text-destructive h-8 shrink-0 gap-2"
              >
                <Trash2 class="size-4" />
                {revokingId === token.id ? m.mcp_tokens_revoke_pending() : m.mcp_tokens_revoke()}
              </Button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
