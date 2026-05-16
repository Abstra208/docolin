<script lang="ts">
  import { m } from "$paraglide/messages";
  import Check from "@lucide/svelte/icons/check";
</script>

<section class="px-6 py-24 sm:py-32">
  <div class="mx-auto max-w-6xl">
    <div class="mb-14 max-w-2xl">
      <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
        {m.home_personas_eyebrow()}
      </p>
      <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {m.home_personas_title()}
      </h2>
    </div>

    <div class="bg-border/60 grid grid-cols-1 gap-px md:grid-cols-2">
      <article class="bg-background flex flex-col p-6 sm:p-8">
        <div class="border-foreground/10 bg-muted/30 mb-6 flex min-h-48 flex-col border p-5">
          <p class="text-muted-foreground/80 mb-1 font-mono text-[10px] tracking-tight">
            {m.home_personas_readers_mock_kind()}
          </p>
          <h4 class="text-foreground text-sm leading-snug font-medium">
            {m.home_personas_readers_mock_title()}
          </h4>
          <p class="text-muted-foreground mt-2 line-clamp-3 text-xs leading-relaxed">
            {m.home_personas_readers_mock_snippet()}
          </p>
          <div class="mt-auto flex items-center gap-1.5 pt-3">
            <span class="bg-primary/15 text-primary inline-flex size-5 items-center justify-center">
              <Check class="size-3" />
            </span>
            <span class="text-foreground/70 text-[11px]">verified by 87 readers</span>
          </div>
        </div>
        <h3 class="text-lg font-medium tracking-tight">{m.home_personas_readers_title()}</h3>
        <p class="text-muted-foreground mt-3 leading-relaxed">
          {m.home_personas_readers_body()}
        </p>
      </article>

      <article class="bg-background flex flex-col p-6 sm:p-8">
        <div class="border-foreground/10 bg-muted/30 mb-6 flex min-h-48 flex-col border p-5">
          <div class="font-mono text-xs leading-relaxed">
            <div class="flex gap-3">
              <span class="text-foreground/30 select-none">1</span>
              <span class="text-foreground/85"># Install NVIDIA drivers</span>
            </div>
            <div class="flex gap-3">
              <span class="text-foreground/30 select-none">2</span>
              <span class="text-foreground/60"></span>
            </div>
            <div class="flex gap-3">
              <span class="text-foreground/30 select-none">3</span>
              <span class="text-foreground/75">On Ubuntu 24.04, run:</span>
            </div>
            <div class="flex gap-3">
              <span class="text-foreground/30 select-none">4</span>
              <span class="text-primary">`sudo ubuntu-drivers install`</span>
            </div>
          </div>
          <div
            class="border-foreground/10 mt-auto flex items-center justify-between border-t pt-3 text-[11px]"
          >
            <span class="text-foreground/55">
              {m.home_personas_contributors_mock_by()}
              <span class="text-primary">{m.home_personas_contributors_mock_byline()}</span>
            </span>
            <span class="text-foreground/45 font-mono text-[10px]">
              {m.home_personas_contributors_mock_citations()}
            </span>
          </div>
        </div>
        <h3 class="text-lg font-medium tracking-tight">{m.home_personas_contributors_title()}</h3>
        <p class="text-muted-foreground mt-3 leading-relaxed">
          {m.home_personas_contributors_body()}
        </p>
      </article>

      <article class="bg-background flex flex-col p-6 sm:p-8">
        <div class="border-foreground/10 bg-muted/30 mb-6 flex min-h-48 flex-col border p-5">
          <div
            class="text-foreground/55 mb-4 flex items-center gap-2 font-mono text-[10px] leading-none"
          >
            <span class="bg-foreground/30 inline-block size-2 -translate-y-0.5"></span>
            <span>{m.home_personas_projects_mock_label()}</span>
          </div>

          <div class="space-y-2.5">
            <div>
              <div class="text-foreground/55 mb-1 text-[10px] leading-none">
                {m.home_personas_projects_mock_url_label()}
              </div>
              <div
                class="border-foreground/15 bg-background text-foreground/85 border px-2 py-1.5 font-mono text-[11px]"
              >
                github.com/myproject/docs
              </div>
            </div>
            <div class="flex gap-2">
              <div class="flex-1">
                <div class="text-foreground/55 mb-1 text-[10px] leading-none">
                  {m.home_personas_projects_mock_branch_label()}
                </div>
                <div
                  class="border-foreground/15 bg-background text-foreground/85 border px-2 py-1.5 font-mono text-[11px]"
                >
                  main
                </div>
              </div>
              <div class="flex-1">
                <div class="text-foreground/55 mb-1 text-[10px] leading-none">
                  {m.home_personas_projects_mock_path_label()}
                </div>
                <div
                  class="border-foreground/15 bg-background text-foreground/85 border px-2 py-1.5 font-mono text-[11px]"
                >
                  /docs
                </div>
              </div>
            </div>
          </div>

          <p class="text-primary mt-auto pt-3 text-[10px] leading-none">
            <span class="font-mono">✓ 47 markdown files</span>
            {m.home_personas_projects_mock_status()}
          </p>
        </div>
        <h3 class="text-lg font-medium tracking-tight">{m.home_personas_projects_title()}</h3>
        <p class="text-muted-foreground mt-3 leading-relaxed">
          {m.home_personas_projects_body()}
        </p>
      </article>

      <article class="bg-background flex flex-col p-6 sm:p-8">
        <div class="border-foreground/10 bg-muted/30 mb-6 flex min-h-48 flex-col border p-5">
          <div
            class="text-foreground/55 mb-3 flex items-center gap-2 font-mono text-[10px] leading-none"
          >
            <span class="bg-foreground/30 inline-block size-2 -translate-y-0.5"></span>
            <span>{m.home_personas_ai_mock_label()}</span>
          </div>
          <pre class="text-foreground/85 font-mono text-[11px] leading-relaxed">{"{"}
  <span class="text-primary">"tool"</span>: <span class="text-foreground/70">"docolin.search"</span
            >,
  <span class="text-primary">"query"</span>: <span class="text-foreground/70">"nvidia drivers"</span
            >,
  <span class="text-primary">"context"</span>: {"{"}
    <span class="text-primary">"os"</span>: <span class="text-foreground/70">"ubuntu-24.04"</span>
  }
}</pre>
        </div>
        <h3 class="text-lg font-medium tracking-tight">{m.home_personas_ai_title()}</h3>
        <p class="text-muted-foreground mt-3 leading-relaxed">{m.home_personas_ai_body()}</p>
      </article>
    </div>
  </div>
</section>
