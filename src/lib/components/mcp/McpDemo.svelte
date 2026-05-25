<script lang="ts">
  import { m } from "$paraglide/messages";
  import Check from "@lucide/svelte/icons/check";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";

  // The sample exchange uses illustrative data (handle, title, score, setup),
  // same convention as the home Pillars artifacts. The verification label format
  // ("Pango N") mirrors what the fetch tool actually returns, so the demo can't
  // overstate the product.
</script>

<section class="px-6 py-20 sm:py-24">
  <div class="mx-auto max-w-3xl">
    <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
      {m.mcp_landing_demo_eyebrow()}
    </p>
    <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
      {m.mcp_landing_demo_title()}
    </h2>

    <div class="border-foreground/10 bg-muted/30 mt-10 border p-6 font-mono text-sm sm:p-8">
      <p class="text-foreground/60">
        <span class="text-foreground/35">&rsaquo;</span> set up a firewall on ubuntu 24.04
      </p>

      <p class="mt-5 flex flex-wrap items-center gap-2">
        <span class="text-foreground/40 text-xs">agent calls</span>
        <span class="border-foreground/15 text-foreground/75 border px-1.5 py-0.5 text-[11px]">
          lookup
        </span>
        <ArrowRight class="text-foreground/30 size-3" />
        <span class="border-foreground/15 text-foreground/75 border px-1.5 py-0.5 text-[11px]">
          fetch
        </span>
      </p>

      <div class="border-foreground/10 bg-background mt-4 border p-4">
        <div class="flex items-center justify-between gap-3">
          <span class="text-foreground font-medium">UFW basics</span>
          <span
            class="bg-primary/15 text-primary inline-flex shrink-0 items-center gap-1.5 px-2 py-1 text-[10px] font-medium"
          >
            <Check class="size-3" />
            Pango 920
          </span>
        </div>
        <p class="text-foreground/55 mt-2 text-[11px]">
          <span class="text-foreground/40">by</span>
          <span class="text-primary">@ada</span>
          <span class="text-foreground/30">·</span>
          <span class="text-foreground/40">applies_to:</span>
          <span class="text-primary">ubuntu-24.04</span>
        </p>
      </div>
    </div>

    <p class="text-muted-foreground mt-4 max-w-2xl text-sm leading-relaxed">
      {m.mcp_landing_demo_caption()}
    </p>
  </div>
</section>
