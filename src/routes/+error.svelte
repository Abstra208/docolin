<script lang="ts">
  import { page } from "$app/state";
  import { m } from "$paraglide/messages";
  import { localizeHref } from "$paraglide/runtime";
  import Navbar from "$lib/components/Navbar.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { Button } from "$lib/components/ui/button";
  import { SITE_REPO } from "$lib/site";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Github from "$lib/components/icons/Github.svelte";
  import pangolin320 from "$lib/assets/pangolin-sitting-320.webp";
  import pangolin640 from "$lib/assets/pangolin-sitting-640.webp";

  const status = $derived(page.status);
  const isNotFound = $derived(status === 404);
  const isServerError = $derived(status >= 500);

  // 404 leans on docolin's mascot for warmth instead of the clinical
  // big-number treatment. The friendly title ("You found the pangolin")
  // reframes the failure as a discovery. The failed URL still shows up as
  // a small mono breadcrumb so the visitor sees what actually didn't resolve.
  const pathDisplay = $derived(page.url.pathname);
</script>

<svelte:head>
  <title>{m.error_meta_title()}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="bg-background text-foreground flex min-h-screen flex-col">
  <Navbar />

  <main class="flex flex-1 items-center justify-center px-6 pt-32 pb-24">
    <div class="mx-auto w-full max-w-2xl">
      {#if isNotFound}
        <div class="text-center">
          <picture>
            <source media="(min-width: 768px)" srcset={pangolin640} />
            <img
              src={pangolin320}
              alt={m.error_404_pangolin_alt()}
              width="320"
              height="320"
              class="mx-auto h-56 w-auto [filter:drop-shadow(0_18px_28px_rgb(0_0_0_/_0.18))] select-none sm:h-64 md:h-72"
              decoding="async"
            />
          </picture>

          <h1
            class="text-foreground mt-8 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            {m.error_404_title()}
          </h1>

          <p
            class="text-foreground/60 mx-auto mt-5 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-sm tracking-tight"
          >
            <span class="text-foreground/55">{m.error_404_eyebrow()}</span>
            <span class="text-foreground/25">·</span>
            <span class="text-foreground break-all">{pathDisplay}</span>
            <span class="text-foreground/25">·</span>
            <span class="text-destructive/80">{m.error_404_failure_label()}</span>
          </p>

          <p class="text-muted-foreground mx-auto mt-6 max-w-xl leading-relaxed">
            {m.error_404_body()}
          </p>

          <div class="mt-10 flex justify-center">
            <Button href={localizeHref("/")} size="lg" class="group h-12 gap-2 px-5 text-base">
              {m.error_back_home()}
              <ArrowRight class="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      {:else}
        <div class="text-center">
          <p class="text-muted-foreground mb-6 font-mono text-xs tracking-[0.22em] uppercase">
            {isServerError ? m.error_5xx_eyebrow() : m.error_generic_eyebrow()}
          </p>

          <p
            class="text-primary text-7xl leading-none font-semibold tracking-[-0.04em] sm:text-8xl md:text-9xl"
          >
            {status}
          </p>

          <h1
            class="text-foreground mt-8 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            {isServerError ? m.error_5xx_title() : m.error_generic_title()}
          </h1>

          <p class="text-muted-foreground mx-auto mt-5 max-w-xl leading-relaxed">
            {isServerError ? m.error_5xx_body() : m.error_generic_body()}
          </p>

          <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button href={localizeHref("/")} size="lg" class="group h-12 gap-2 px-5 text-base">
              {m.error_back_home()}
              <ArrowRight class="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              href={`${SITE_REPO}/issues/new`}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="lg"
              class="h-12 gap-2 px-5 text-base"
            >
              <Github class="size-4" />
              {m.error_report()}
            </Button>
          </div>

          {#if page.error?.message}
            <details class="text-muted-foreground/70 mx-auto mt-12 max-w-md text-left text-xs">
              <summary class="cursor-pointer font-mono">technical detail</summary>
              <pre
                class="border-foreground/10 bg-muted/40 mt-3 overflow-x-auto border p-3 font-mono text-[11px]">{page
                  .error.message}</pre>
            </details>
          {/if}
        </div>
      {/if}
    </div>
  </main>

  <Footer />
</div>
