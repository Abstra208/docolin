<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { m } from "$paraglide/messages";
  import { localizeHref } from "$paraglide/runtime";
  import { Button } from "$lib/components/ui/button";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Copy from "@lucide/svelte/icons/copy";
  import Check from "@lucide/svelte/icons/check";
  import Mail from "@lucide/svelte/icons/mail";

  // URL-derived UID renders immediately in the reference block while the
  // rest of the claim (slug, requester displayName, etc.) fetches from
  // /api/dashboard/claims/[uid]. Reference id is the page's main payload so
  // showing it instantly is more valuable than blocking on the full fetch.
  const uidFromUrl = $derived(page.params.uid ?? "");

  interface ClaimPayload {
    claim: {
      uid: string;
      slug: string;
      displayName: string | null;
      status: string;
      details: string | null;
      createdAt: string;
    };
    requesterDisplayName: string | null;
  }

  let payload = $state<ClaimPayload | null>(null);
  let loadError = $state<string | null>(null);

  async function loadClaim(): Promise<void> {
    loadError = null;
    try {
      const res = await fetch(`/api/dashboard/claims/${encodeURIComponent(uidFromUrl)}`, {
        credentials: "same-origin",
      });
      if (res.status === 401) return;
      if (!res.ok) {
        loadError = `HTTP ${res.status.toString()}`;
        return;
      }
      payload = (await res.json()) as ClaimPayload;
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  onMount(() => {
    void loadClaim();
  });

  const claim = $derived(payload?.claim ?? null);

  // mailto: link with subject + body prefilled from i18n templates, then URL-
  // encoded. The user's mail client opens with everything filled in; they can
  // edit before sending. Context comes from `claim.details`, name from the
  // requester's displayName. Both fall back to bracketed placeholders.
  const mailtoHref = $derived(() => {
    if (claim === null) return "";
    const detailsText = claim.details?.trim() ?? "";
    const context =
      detailsText.length > 0
        ? detailsText
        : m.dashboard_new_org_claim_filed_mail_context_placeholder();
    const displayName = payload?.requesterDisplayName?.trim() ?? "";
    const name =
      displayName.length > 0
        ? displayName
        : m.dashboard_new_org_claim_filed_mail_name_placeholder();
    const subject = m.dashboard_new_org_claim_filed_mail_subject({
      slug: claim.slug,
      uid: claim.uid,
    });
    const body = m.dashboard_new_org_claim_filed_mail_body({
      slug: claim.slug,
      uid: claim.uid,
      context,
      name,
    });
    return `mailto:support@docolin.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  let copied = $state(false);
  let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  async function copyUid(): Promise<void> {
    await navigator.clipboard.writeText(uidFromUrl);
    copied = true;
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<svelte:head>
  <title>{m.dashboard_new_org_claim_filed_eyebrow()}, docolin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-2xl">
  {#if loadError !== null}
    <div
      class="border-destructive/40 bg-destructive/5 mb-8 flex items-center justify-between gap-4 border p-4"
    >
      <p class="text-destructive text-sm">{m.dashboard_load_error()}</p>
      <Button type="button" variant="outline" size="sm" onclick={() => void loadClaim()}>
        {m.dashboard_load_error_retry()}
      </Button>
    </div>
  {/if}

  <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.22em] uppercase">
    {m.dashboard_new_org_claim_filed_eyebrow()}
  </p>
  <!-- Slug-bearing title needs the slug from the fetch. Skeleton matches the
       eventual heading height so the reference block below doesn't shift. -->
  {#if claim}
    <h1 class="text-foreground text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
      {m.dashboard_new_org_claim_filed_title({ slug: claim.slug })}
    </h1>
  {:else if loadError === null}
    <div class="bg-muted h-9 w-3/4 animate-pulse sm:h-10"></div>
  {/if}
  <p class="text-foreground/80 mt-4 max-w-xl text-base leading-relaxed">
    {m.dashboard_new_org_claim_filed_body()}
  </p>

  <!-- Reference id block + inline copy button. UID is in the URL so it renders
       instantly; no skeleton needed here. select-all so users can grab it
       manually too. -->
  <div class="border-primary/40 bg-muted mt-8 border border-l-4 p-6">
    <p class="text-muted-foreground mb-2 font-mono text-xs tracking-[0.18em] uppercase">
      {m.dashboard_new_org_claim_filed_uid_label()}
    </p>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <p class="text-foreground font-mono text-2xl font-semibold tracking-tight select-all">
        {uidFromUrl}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="h-9 gap-1.5"
        onclick={copyUid}
        aria-live="polite"
      >
        {#if copied}
          <Check class="size-3.5" />
          {m.dashboard_new_org_claim_filed_copy_done()}
        {:else}
          <Copy class="size-3.5" />
          {m.dashboard_new_org_claim_filed_copy_default()}
        {/if}
      </Button>
    </div>
  </div>

  <!-- Primary CTA. Disabled while claim data is loading because the mailto
       template needs slug + name to be useful; once loaded the button enables
       in place (no layout shift). -->
  <div class="mt-8">
    <Button
      href={claim ? mailtoHref() : undefined}
      target="_blank"
      rel="noopener noreferrer"
      size="lg"
      class="group h-12 gap-2 px-5 text-base"
      disabled={claim === null}
    >
      <Mail class="size-4" />
      {m.dashboard_new_org_claim_filed_mail_cta()}
    </Button>
    <p class="text-muted-foreground mt-3 text-sm leading-relaxed">
      {m.dashboard_new_org_claim_filed_mail_fallback()}
    </p>
  </div>

  <div class="mt-12">
    <Button
      href={localizeHref("/dashboard")}
      variant="ghost"
      size="lg"
      class="group h-11 gap-2 px-3 text-base"
    >
      <ArrowLeft class="size-4 transition-transform group-hover:-translate-x-0.5" />
      {m.dashboard_new_org_claim_filed_back()}
    </Button>
  </div>
</div>
