<script lang="ts">
  import { m } from "$paraglide/messages";
  import { Button } from "$lib/components/ui/button";
  import Plus from "@lucide/svelte/icons/plus";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  function memberCountLabel(n: number): string {
    if (n === 1) return m.dashboard_org_meta_member_one();
    return m.dashboard_org_meta_member_many({ count: n.toString() });
  }
</script>

<svelte:head>
  <title>{data.org.displayName ?? data.org.slug} · {m.dashboard_meta_title()}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-6xl">
  <!-- Org meta strip -->
  <div class="mb-14">
    <div class="flex flex-wrap items-center gap-3">
      <span class="text-muted-foreground/80 font-mono text-sm">{data.org.slug}</span>
      {#if data.org.isPersonal}
        <span
          class="text-muted-foreground border-foreground/10 inline-block border px-2 py-0.5 font-mono text-[10px] tracking-tight uppercase"
        >
          {m.dashboard_org_badge_personal()}
        </span>
      {/if}
    </div>
    <h1 class="text-foreground mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
      {data.org.displayName ?? data.org.slug}
    </h1>
    <p class="text-muted-foreground mt-3 text-sm">
      {memberCountLabel(data.org.memberCount)}
    </p>
  </div>

  <!-- Projects section -->
  <section class="mb-16">
    <div class="mb-6 flex items-baseline justify-between gap-4">
      <h2 class="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
        {m.dashboard_org_projects_heading()}
      </h2>
    </div>

    {#if data.projects.length === 0}
      <div
        class="border-foreground/10 bg-muted/30 flex flex-col items-center border px-6 py-16 text-center sm:py-20"
      >
        <p class="text-muted-foreground mb-4 font-mono text-xs tracking-[0.18em] uppercase">
          {m.dashboard_org_projects_empty_eyebrow()}
        </p>
        <h3 class="text-foreground text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {m.dashboard_org_projects_empty_title()}
        </h3>
        <p class="text-muted-foreground mt-3 max-w-md leading-relaxed">
          {m.dashboard_org_projects_empty_body()}
        </p>
        <Button disabled size="lg" class="mt-8 h-12 gap-2 px-5 text-base">
          <Plus class="size-4" />
          {m.dashboard_org_projects_empty_action()}
        </Button>
        <p class="text-muted-foreground/70 mt-3 font-mono text-xs">
          {m.dashboard_org_projects_coming_next()}
        </p>
      </div>
    {:else}
      <div class="bg-border/60 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3">
        {#each data.projects as project (project.id)}
          <a
            href="/dashboard/{data.org.slug}/{project.slug}"
            class="bg-background hover:bg-muted/30 flex flex-col gap-2 p-6 transition-colors"
          >
            <span class="text-muted-foreground/80 truncate font-mono text-xs">{project.slug}</span>
            <h3 class="text-foreground text-lg font-medium tracking-tight">
              {project.displayName ?? project.slug}
            </h3>
            <p class="text-muted-foreground/80 mt-1 font-mono text-[10px] tracking-tight">
              {project.sourceMode === "git"
                ? m.dashboard_org_project_source_git()
                : m.dashboard_org_project_source_native()}
            </p>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Members section -->
  <section>
    <h2 class="text-foreground mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
      {m.dashboard_org_members_heading()}
    </h2>
    <p class="text-muted-foreground text-sm">
      {memberCountLabel(data.org.memberCount)}
      {#if data.org.memberCount === 1}
        · {m.dashboard_org_members_only_you()}
      {/if}
    </p>
  </section>
</div>
