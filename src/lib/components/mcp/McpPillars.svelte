<script lang="ts">
  import { m } from "$paraglide/messages";
  import Check from "@lucide/svelte/icons/check";
  import Bot from "@lucide/svelte/icons/bot";
  import Quote from "@lucide/svelte/icons/quote";

  // Two pillars, framed from the agent's point of view: what a base model can't
  // give it. Artifacts reuse the home Pillars visual grammar (mono chips,
  // primary handles, hairline borders) so the marketing surface stays unified.
</script>

<section class="px-6 py-20 sm:py-24">
  <div class="mx-auto max-w-6xl">
    <div class="mb-14 max-w-2xl">
      <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
        {m.mcp_landing_pillars_eyebrow()}
      </p>
      <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {m.mcp_landing_pillars_title()}
      </h2>
    </div>

    <div class="bg-border/60 grid grid-cols-1 gap-px md:grid-cols-2">
      <article class="bg-background flex flex-col p-6 sm:p-8">
        <div
          class="border-foreground/10 bg-muted/30 mb-6 flex h-44 flex-col justify-center border p-5"
        >
          <div class="flex items-center justify-between">
            <span
              class="bg-primary/15 text-primary inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] font-medium"
            >
              <Check class="size-3" />
              Pango 920
            </span>
            <span class="text-foreground/45 font-mono text-[10px]">applies_to: ubuntu-24.04</span>
          </div>
          <p class="text-foreground/85 mt-4 text-xs">
            {m.mcp_landing_pillar_verified_artifact()}
            <span class="text-primary">@ada</span>
          </p>
          <p class="text-foreground/55 mt-1 font-mono text-[10px]">
            Ubuntu 24.04 · kernel 6.8 · UFW 0.36
          </p>
          <p
            class="border-foreground/10 text-foreground/55 mt-3 flex items-center gap-1.5 border-t pt-2.5 text-[10px]"
          >
            <Bot class="text-foreground/40 size-3 shrink-0" />
            {m.mcp_landing_pillar_verified_agent()}
          </p>
        </div>
        <h3 class="text-xl font-medium tracking-tight">{m.mcp_landing_pillar_verified_title()}</h3>
        <p class="text-muted-foreground mt-3 leading-relaxed">
          {m.mcp_landing_pillar_verified_body()}
        </p>
      </article>

      <article class="bg-background flex flex-col p-6 sm:p-8">
        <div
          class="border-foreground/10 bg-muted/30 mb-6 flex h-44 flex-col justify-between border p-5"
        >
          <div>
            <p class="text-foreground/55 flex items-center gap-1.5 text-[11px]">
              <Quote class="text-foreground/35 size-3" />
              {m.mcp_landing_pillar_attributed_artifact_label()}
            </p>
            <p class="text-foreground/85 mt-2 line-clamp-3 text-xs leading-relaxed">
              {m.mcp_landing_pillar_attributed_artifact_body()}
            </p>
          </div>
          <p class="border-foreground/10 mt-3 border-t pt-2 font-mono text-[10px]">
            <span class="text-foreground/55">{m.mcp_landing_pillar_attributed_citation()}</span>
            <span class="text-primary">@ada</span>
            <span class="text-foreground/30">·</span>
            <span class="text-foreground/45">/docolin/linux/ufw-basics</span>
          </p>
        </div>
        <h3 class="text-xl font-medium tracking-tight">
          {m.mcp_landing_pillar_attributed_title()}
        </h3>
        <p class="text-muted-foreground mt-3 leading-relaxed">
          {m.mcp_landing_pillar_attributed_body()}
        </p>
      </article>
    </div>
  </div>
</section>
