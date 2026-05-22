<script lang="ts">
  import { m } from "$paraglide/messages";
  import { localizeHref } from "$paraglide/runtime";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import FileCheck from "@lucide/svelte/icons/file-check";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  // Admin hub. Lists the platform-staff tools; the parent +layout.server.ts
  // gates the whole section to platform admins. New admin surfaces get a card
  // here rather than another top-level nav entry.
  const tools = [
    {
      key: "claims" as const,
      href: "/dashboard/admin/claims",
      icon: FileCheck,
      title: m.admin_home_claims_title(),
      description: m.admin_home_claims_desc(),
    },
    {
      key: "moderation" as const,
      href: "/dashboard/admin/moderation",
      icon: ShieldAlert,
      title: m.admin_home_moderation_title(),
      description: m.admin_home_moderation_desc(),
    },
  ];
</script>

<svelte:head>
  <title>{m.admin_home_meta_title()} · docolin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-5xl">
  <div class="mb-10">
    <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.22em] uppercase">
      {m.admin_home_eyebrow()}
    </p>
    <h1 class="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
      {m.admin_home_heading()}
    </h1>
  </div>

  <div class="grid gap-4 sm:grid-cols-2">
    {#each tools as tool (tool.href)}
      {@const Icon = tool.icon}
      <a
        href={localizeHref(tool.href)}
        class="bg-background border-foreground/15 hover:border-primary group flex flex-col gap-2 border p-6 transition-colors"
      >
        <div class="flex items-center justify-between gap-3">
          <Icon class="text-muted-foreground group-hover:text-primary size-5 transition-colors" />
          <ArrowRight
            class="text-muted-foreground/50 group-hover:text-primary size-4 transition-all group-hover:translate-x-0.5"
          />
        </div>
        <h2 class="text-foreground text-lg font-medium tracking-tight">{tool.title}</h2>
        <p class="text-muted-foreground text-sm leading-relaxed">{tool.description}</p>
        {#if tool.key === "moderation" && (data.urgentReports > 0 || data.pendingDeletions > 0)}
          <div class="mt-1 flex flex-wrap gap-2">
            {#if data.urgentReports > 0}
              <span
                class="border-destructive/40 bg-destructive/5 text-destructive border px-1.5 py-0.5 text-xs font-medium"
              >
                {m.admin_home_badge_urgent({ count: data.urgentReports })}
              </span>
            {/if}
            {#if data.pendingDeletions > 0}
              <span class="border-foreground/15 text-muted-foreground border px-1.5 py-0.5 text-xs">
                {m.admin_home_badge_pending({ count: data.pendingDeletions })}
              </span>
            {/if}
          </div>
        {/if}
      </a>
    {/each}
  </div>
</div>
