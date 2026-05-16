<script lang="ts">
  import { m } from "$paraglide/messages";
  import Check from "@lucide/svelte/icons/check";

  // Each pillar gets its own evidence artifact instead of an abstract icon.
  // The artifact is the dominant visual; the title and body caption it.
  const verifiedSystems = [
    { name: "ubuntu 24.04", count: 87, width: 100 },
    { name: "pop!_os 22.04", count: 31, width: 36 },
    { name: "fedora 41", count: 24, width: 28 },
  ];
</script>

<section class="px-6 py-24 sm:py-32">
  <div class="mx-auto max-w-6xl">
    <div class="mb-14 max-w-2xl">
      <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
        {m.home_what_eyebrow()}
      </p>
      <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {m.home_what_title()}
      </h2>
    </div>

    <div class="bg-border/60 grid grid-cols-1 gap-px md:grid-cols-3">
      <article class="bg-background flex flex-col p-6 sm:p-8">
        <div
          class="border-foreground/10 bg-muted/30 mb-6 flex h-44 flex-col justify-center border p-5"
        >
          <div class="font-mono text-xs leading-relaxed">
            <div class="text-foreground/25">hardware /</div>
            <div class="text-foreground/40 pl-3">gpu /</div>
            <div class="text-foreground/65 pl-6">nvidia /</div>
            <div class="text-foreground pl-9 font-medium">driver-install</div>
          </div>
          <div class="mt-3">
            <span
              class="border-foreground/15 inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px]"
            >
              <span class="text-foreground/60">applies_to:</span>
              <span class="text-primary">ubuntu-24.04</span>
              <span class="text-foreground/40">·</span>
              <span class="text-primary">nvidia</span>
            </span>
          </div>
        </div>
        <h3 class="text-xl font-medium tracking-tight">{m.home_what_structured_title()}</h3>
        <p class="text-muted-foreground mt-3 leading-relaxed">{m.home_what_structured_body()}</p>
      </article>

      <article class="bg-background flex flex-col p-6 sm:p-8">
        <div
          class="border-foreground/10 bg-muted/30 mb-6 flex h-44 flex-col justify-center border p-5"
        >
          <div class="flex items-center gap-2">
            <span class="bg-primary/15 text-primary inline-flex size-6 items-center justify-center">
              <Check class="size-3.5" />
            </span>
            <span class="text-foreground/85 text-sm font-medium">
              {m.home_what_verified_count()}
            </span>
          </div>
          <div class="mt-4 space-y-2">
            {#each verifiedSystems as system (system.name)}
              <div class="flex items-center gap-3 text-[11px]">
                <span class="text-foreground/55 w-24 font-mono">{system.name}</span>
                <div class="bg-foreground/8 h-1 flex-1">
                  <div class="bg-primary h-full" style="width: {system.width.toString()}%"></div>
                </div>
                <span class="text-foreground/65 w-6 text-right font-mono tabular-nums"
                  >{system.count}</span
                >
              </div>
            {/each}
          </div>
        </div>
        <h3 class="text-xl font-medium tracking-tight">{m.home_what_verified_title()}</h3>
        <p class="text-muted-foreground mt-3 leading-relaxed">{m.home_what_verified_body()}</p>
      </article>

      <article class="bg-background flex flex-col p-6 sm:p-8">
        <div
          class="border-foreground/10 bg-muted/30 mb-6 flex h-44 flex-col justify-between border p-5"
        >
          <div>
            <p class="text-foreground/55 text-[11px] leading-snug">
              <span class="text-foreground/35">›</span>
              {m.home_what_attributed_question()}
            </p>
            <p class="text-foreground/85 mt-2 line-clamp-3 text-xs leading-relaxed">
              {m.home_what_attributed_answer()}
            </p>
          </div>
          <p class="border-foreground/10 mt-3 border-t pt-2 font-mono text-[10px]">
            <span class="text-foreground/55">{m.home_what_attributed_citation()}</span>
            <span class="text-primary">@jhalter</span>
          </p>
        </div>
        <h3 class="text-xl font-medium tracking-tight">{m.home_what_attributed_title()}</h3>
        <p class="text-muted-foreground mt-3 leading-relaxed">{m.home_what_attributed_body()}</p>
      </article>
    </div>
  </div>
</section>
