<script lang="ts">
  import { m } from "$paraglide/messages";

  const stats = [
    {
      value: m.home_why_stat1_value(),
      label: m.home_why_stat1_label(),
      source: m.home_why_stat1_source(),
      body: m.home_why_stat1_body(),
      tone: "problem" as const,
    },
    {
      value: m.home_why_stat2_value(),
      label: m.home_why_stat2_label(),
      source: m.home_why_stat2_source(),
      body: m.home_why_stat2_body(),
      tone: "problem" as const,
    },
    {
      value: m.home_why_stat3_value(),
      label: m.home_why_stat3_label(),
      source: m.home_why_stat3_source(),
      body: m.home_why_stat3_body(),
      tone: "answer" as const,
    },
  ];
</script>

<section class="px-6 py-24 sm:py-32">
  <div class="mx-auto max-w-6xl">
    <div class="mb-14 max-w-3xl">
      <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
        {m.home_why_eyebrow()}
      </p>
      <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {m.home_why_title()}
      </h2>
    </div>

    <div class="bg-border/60 grid grid-cols-1 gap-px md:grid-cols-3">
      {#each stats as stat (stat.value)}
        <article class="bg-background flex flex-col p-6 sm:p-8">
          <span
            class={stat.tone === "answer"
              ? "text-primary text-7xl leading-none font-semibold tracking-[-0.04em] sm:text-8xl"
              : "text-foreground text-7xl leading-none font-semibold tracking-[-0.04em] sm:text-8xl"}
          >
            {stat.value}
          </span>
          <p class="text-foreground/80 mt-4 truncate text-base leading-snug font-medium">
            {stat.label}
          </p>
          <p class="text-muted-foreground/70 mt-1.5 truncate font-mono text-[10px] tracking-wide">
            {stat.source}
          </p>
          <p class="text-muted-foreground mt-5 text-sm leading-relaxed">{stat.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>
