<script lang="ts">
  import { onMount } from "svelte";
  import { m } from "$paraglide/messages";
  import { localizeHref } from "$paraglide/runtime";
  import { Button } from "$lib/components/ui/button";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Plus from "@lucide/svelte/icons/plus";
  import pangolin320 from "$lib/assets/pangolin-sitting-320.webp";
  import pangolin640 from "$lib/assets/pangolin-sitting-640.webp";

  // Per-user data is fetched from /api/dashboard/me client-side. The page
  // itself ships as a session-independent shell so the edge can cache the
  // HTML for every reader; the layout's client-side auth gate handles the
  // unauthed case before this fetch fires.
  interface OrgCard {
    id: string;
    slug: string;
    displayName: string | null;
    isPersonal: boolean;
    projectCount: number;
  }
  interface PendingClaim {
    uid: string;
    slug: string;
    displayName: string | null;
    createdAt: string;
  }
  interface MePayload {
    orgs: OrgCard[];
    pendingClaims: PendingClaim[];
  }

  let payload = $state<MePayload | null>(null);
  let loadError = $state<string | null>(null);

  async function loadDashboard(): Promise<void> {
    loadError = null;
    try {
      const res = await fetch("/api/dashboard/me", { credentials: "same-origin" });
      // 401 means session is stale or expired; the layout-level auth gate
      // will catch it via the session store and bounce. Don't surface a
      // user-facing error for that case.
      if (res.status === 401) return;
      if (!res.ok) {
        loadError = `HTTP ${res.status.toString()}`;
        return;
      }
      payload = (await res.json()) as MePayload;
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  onMount(() => {
    void loadDashboard();
  });

  const isFirstTime = $derived(
    payload !== null && payload.orgs.length === 1 && payload.orgs[0].projectCount === 0,
  );
  const personalOrg = $derived(
    payload === null ? null : (payload.orgs.find((o) => o.isPersonal) ?? payload.orgs[0]),
  );

  function projectCountLabel(n: number): string {
    if (n === 0) return m.dashboard_org_card_projects_zero();
    if (n === 1) return m.dashboard_org_card_projects_one();
    return m.dashboard_org_card_projects_many({ count: n.toString() });
  }
</script>

<svelte:head>
  <title>{m.dashboard_meta_title()}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-6xl">
  <!-- Progressive reveal: the heading and "new org" CTA are static chrome
       that appears immediately; only the data-dependent org cards show as
       skeleton placeholders while /api/dashboard/me loads. Eye lands on the
       heading first either way, so the page feels structurally present
       <50ms after the cached shell hits the browser. -->
  <div class="mb-8">
    <h1 class="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
      {m.dashboard_orgs_heading()}
    </h1>
  </div>

  {#if loadError !== null}
    <div
      class="border-destructive/40 bg-destructive/5 mb-8 flex items-center justify-between gap-4 border p-4"
    >
      <p class="text-destructive text-sm">{m.dashboard_load_error()}</p>
      <Button type="button" variant="outline" size="sm" onclick={() => void loadDashboard()}>
        {m.dashboard_load_error_retry()}
      </Button>
    </div>
  {/if}

  {#if payload === null && loadError === null}
    <!-- Two skeleton card placeholders, no new-org card. Renders the same
         row count as a typical 1-org reader (personal org + new-org card)
         so the new-org CTA stays at the same position once data lands.
         Skeleton omits the CTA to avoid it visually rearranging within the
         row when the real card count differs. -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div class="border-foreground/15 bg-muted h-40 animate-pulse border p-6"></div>
      <div class="border-foreground/15 bg-muted h-40 animate-pulse border p-6"></div>
    </div>
  {:else if payload !== null}
    {#if isFirstTime}
      <!-- Welcome strip renders after data so we don't flash it for users
           who don't qualify. The mb-12 below positions it above the grid
           (which already received its own heading at the top). -->
      <div
        class="border-primary/40 bg-muted mb-12 grid grid-cols-1 items-center gap-6 border border-l-4 p-6 sm:grid-cols-[auto_1fr] sm:gap-10 sm:p-8"
      >
        <picture class="mx-auto sm:mx-0">
          <source media="(min-width: 768px)" srcset={pangolin640} />
          <img
            src={pangolin320}
            alt={m.dashboard_pangolin_alt()}
            width="320"
            height="320"
            class="h-32 w-auto [filter:drop-shadow(0_12px_24px_rgb(0_0_0_/_0.15))] select-none sm:h-44 md:h-48"
            decoding="async"
          />
        </picture>
        <div>
          <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
            {m.dashboard_welcome_strip_eyebrow()}
          </p>
          <h2
            class="text-foreground text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
          >
            {m.dashboard_welcome_strip_title()}
          </h2>
          <p class="text-foreground/80 mt-3 max-w-xl text-base leading-relaxed">
            {m.dashboard_welcome_strip_body()}
          </p>
          {#if personalOrg}
            <div class="mt-6">
              <Button
                href={localizeHref(`/dashboard/${personalOrg.slug}`)}
                size="lg"
                class="group h-11 gap-2 px-5 text-base"
              >
                {m.dashboard_welcome_strip_cta()}
                <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {#each payload.orgs as org (org.id)}
        <a
          href={localizeHref(`/dashboard/${org.slug}`)}
          class="bg-background border-foreground/15 hover:border-primary group flex flex-col border p-6 transition-colors sm:p-7"
        >
          <div class="mb-4 flex items-center justify-between gap-3">
            <span class="text-muted-foreground truncate font-mono text-sm">{org.slug}</span>
            <span
              class="text-muted-foreground border-border inline-block shrink-0 border px-2 py-0.5 font-mono text-xs tracking-tight uppercase"
            >
              {org.isPersonal ? m.dashboard_org_badge_personal() : m.dashboard_org_badge_org()}
            </span>
          </div>
          <h3 class="text-foreground text-xl font-medium tracking-tight">
            {org.displayName ?? org.slug}
          </h3>
          <div
            class="text-muted-foreground mt-auto flex items-center justify-between gap-3 pt-6 text-sm"
          >
            <span>{projectCountLabel(org.projectCount)}</span>
            <ArrowRight
              class="text-muted-foreground/50 group-hover:text-primary size-4 transition-all group-hover:translate-x-0.5"
            />
          </div>
        </a>
      {/each}

      <a
        href={localizeHref("/dashboard/orgs/new")}
        class="bg-background border-foreground/30 hover:border-primary group flex flex-col items-center justify-center gap-3 border-2 border-dashed p-6 text-center transition-colors sm:p-7"
      >
        <span
          class="bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary inline-flex size-10 items-center justify-center transition-colors"
        >
          <Plus class="size-5" />
        </span>
        <p class="text-foreground text-base font-medium">{m.dashboard_new_org_card_title()}</p>
        <p class="text-muted-foreground max-w-[22rem] text-sm leading-relaxed">
          {m.dashboard_new_org_card_body()}
        </p>
      </a>
    </div>

    {#if payload.pendingClaims.length > 0}
      <section class="mt-16">
        <div class="mb-8">
          <h2 class="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
            {m.dashboard_claims_heading()}
          </h2>
        </div>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {#each payload.pendingClaims as claim (claim.uid)}
            <a
              href={localizeHref(`/dashboard/claims/${claim.uid}`)}
              class="bg-background border-foreground/15 hover:border-primary group flex flex-col border p-6 transition-colors sm:p-7"
            >
              <div class="mb-4 flex items-center justify-between gap-3">
                <span class="text-muted-foreground truncate font-mono text-sm">{claim.uid}</span>
                <span
                  class="text-muted-foreground border-border inline-block shrink-0 border px-2 py-0.5 font-mono text-xs tracking-tight uppercase"
                >
                  {m.dashboard_claims_card_badge()}
                </span>
              </div>
              <h3 class="text-foreground text-xl font-medium tracking-tight">
                {claim.displayName ?? claim.slug}
              </h3>
              {#if claim.displayName}
                <span class="text-muted-foreground mt-1 font-mono text-sm">{claim.slug}</span>
              {/if}
              <div
                class="text-muted-foreground mt-auto flex items-center justify-between gap-3 pt-6 text-sm"
              >
                <span>{m.dashboard_claims_card_hint()}</span>
                <ArrowRight
                  class="text-muted-foreground/50 group-hover:text-primary size-4 transition-all group-hover:translate-x-0.5"
                />
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>
