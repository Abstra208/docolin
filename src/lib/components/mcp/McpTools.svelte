<script lang="ts">
  import { m } from "$paraglide/messages";
  import { localizeHref } from "$paraglide/runtime";
  import { Button } from "$lib/components/ui/button";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";

  // Tool names are the literal MCP method names (not translated); only the
  // one-line descriptions go through i18n.
  const tools: { name: string; description: () => string }[] = [
    { name: "lookup", description: m.mcp_landing_tool_lookup },
    { name: "search", description: m.mcp_landing_tool_search },
    { name: "browse_kind", description: m.mcp_landing_tool_browse_kind },
    { name: "fetch", description: m.mcp_landing_tool_fetch },
    { name: "list_discussions", description: m.mcp_landing_tool_list_discussions },
    { name: "verify", description: m.mcp_landing_tool_verify },
  ];
</script>

<section class="px-6 py-20 sm:py-24">
  <div class="mx-auto max-w-6xl">
    <div class="mb-12 max-w-2xl">
      <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
        {m.mcp_landing_tools_eyebrow()}
      </p>
      <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {m.mcp_landing_tools_title()}
      </h2>
    </div>

    <div class="bg-border/60 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3">
      {#each tools as tool (tool.name)}
        <div class="bg-background flex flex-col p-6">
          <code class="text-primary font-mono text-sm font-medium">{tool.name}</code>
          <p class="text-muted-foreground mt-2 text-sm leading-relaxed">{tool.description()}</p>
        </div>
      {/each}
    </div>

    <div class="mt-20 flex flex-col items-center text-center">
      <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {m.mcp_landing_cta_title()}
      </h2>
      <p class="text-muted-foreground mt-4 max-w-xl leading-relaxed">
        {m.mcp_landing_cta_body()}
      </p>
      <Button
        href={localizeHref("/dashboard/mcp")}
        size="lg"
        class="group mt-8 h-11 gap-2 px-6 text-base"
      >
        {m.mcp_landing_cta_button()}
        <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
      </Button>
    </div>
  </div>
</section>
