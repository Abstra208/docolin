<script lang="ts">
  import { m } from "$paraglide/messages";
  import { localizeHref } from "$paraglide/runtime";
  import DocoViewerNavbar from "$lib/components/DocoViewerNavbar.svelte";
  import PawPrint from "@lucide/svelte/icons/paw-print";
  import Check from "@lucide/svelte/icons/check";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import X from "@lucide/svelte/icons/x";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import CircleX from "@lucide/svelte/icons/circle-x";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  // All three outcomes share one button chrome so they read as a single set of
  // choices; only the leading icon's color carries the worked / caveats / failed
  // semantics, which keeps the group consistent instead of three ad-hoc styles.
  const outcomeClass =
    "border-input hover:bg-accent hover:border-foreground/30 flex items-center gap-3 border px-4 py-3 text-left text-sm font-medium transition-colors";
</script>

<svelte:head>
  <title>{m.verify_title()} · docolin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<DocoViewerNavbar kindSegments={[]} />

<main class="mx-auto w-full max-w-md px-6 pt-24 pb-16">
  <div class="border-foreground/10 bg-card border p-6 sm:p-8">
    {#if !data.valid}
      <CircleX class="text-muted-foreground size-6" />
      <h1 class="text-foreground mt-3 text-lg font-medium tracking-tight">
        {m.verify_invalid_title()}
      </h1>
      <p class="text-muted-foreground mt-2 text-sm leading-relaxed">{m.verify_invalid_body()}</p>
    {:else if form?.recorded === true}
      <PawPrint class="text-primary size-6" />
      <h1 class="text-foreground mt-3 text-lg font-medium tracking-tight">
        {m.verify_thanks_title()}
      </h1>
      <p class="text-muted-foreground mt-2 text-sm leading-relaxed">
        {form.signed ? m.verify_thanks_signed() : m.verify_thanks_anon()}
      </p>
      <a
        href={localizeHref(data.docoUrl)}
        class="text-primary mt-5 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline"
      >
        {m.verify_view_doco()}
        <ArrowRight class="size-4" />
      </a>
    {:else if data.alreadyVerified === true || form?.recorded === false}
      <CircleCheck class="text-muted-foreground size-6" />
      <h1 class="text-foreground mt-3 text-lg font-medium tracking-tight">
        {m.verify_already_title()}
      </h1>
      <p class="text-muted-foreground mt-2 text-sm leading-relaxed">{m.verify_already_body()}</p>
    {:else}
      <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
        {m.verify_eyebrow()}
      </p>
      <h1 class="text-foreground text-xl font-semibold tracking-tight text-balance">
        {m.verify_question()}
      </h1>
      <p class="text-muted-foreground mt-3 text-sm leading-relaxed">
        {m.verify_context({ title: data.title })}
      </p>
      {#if data.appliesTo.length > 0}
        <div class="mt-3 flex flex-wrap gap-1.5">
          {#each data.appliesTo as tag (tag)}
            <span
              class="border-foreground/15 text-muted-foreground border px-2 py-0.5 font-mono text-[11px]"
            >
              {tag}
            </span>
          {/each}
        </div>
      {/if}

      <form method="POST" class="mt-6 flex flex-col gap-2">
        <button type="submit" name="outcome" value="worked" class={outcomeClass}>
          <Check class="text-primary size-4 shrink-0" />
          {m.verify_worked()}
        </button>
        <button type="submit" name="outcome" value="worked_with_caveats" class={outcomeClass}>
          <CircleAlert class="text-muted-foreground size-4 shrink-0" />
          {m.verify_caveats()}
        </button>
        <button type="submit" name="outcome" value="didnt_work" class={outcomeClass}>
          <X class="text-destructive size-4 shrink-0" />
          {m.verify_didnt()}
        </button>
      </form>

      <p class="text-muted-foreground mt-4 text-xs leading-relaxed">
        {data.signedIn ? m.verify_signed_note() : m.verify_anon_note()}
      </p>
    {/if}
  </div>
</main>
