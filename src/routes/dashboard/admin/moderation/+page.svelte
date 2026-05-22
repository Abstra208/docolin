<script lang="ts">
  import { enhance } from "$app/forms";
  import { m } from "$paraglide/messages";
  import { getLocale, localizeHref } from "$paraglide/runtime";
  import Search from "@lucide/svelte/icons/search";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Check from "@lucide/svelte/icons/check";
  import X from "@lucide/svelte/icons/x";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as Select from "$lib/components/ui/select";
  import { REPORT_REASONS, tierForReasons, type ReportReason } from "$lib/moderation-reasons";
  import {
    actionTypeLabel,
    reasonLabel,
    reasonLabelLoose,
  } from "$lib/components/moderation/reason-label";
  import { relativeTime } from "$lib/relative-time";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  // A report sitting unhandled longer than this with no moderator action counts
  // as escalated ("mod inactive"). A starting guess; tune from real data.
  const STALE_DAYS = 3;
  const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

  type Tab = "reports" | "mod" | "deletions" | "history";

  let tab = $state<Tab>("reports");
  let query = $state("");
  let reasonFilter = $state("all");
  let expanded = $state<string | null>(null);
  // Redaction editor for the currently expanded report (one card open at a
  // time): the admin edits the body in place to scrub the offending part.
  let redacting = $state(false);
  let redactBody = $state("");

  function switchTab(next: Tab): void {
    tab = next;
    expanded = null;
    redacting = false;
  }
  function toggle(key: string): void {
    expanded = expanded === key ? null : key;
    redacting = false;
  }
  function startRedact(body: string): void {
    redactBody = body;
    redacting = true;
  }

  const locale = $derived(getLocale());
  function age(iso: string): string {
    return relativeTime(iso, locale);
  }

  type ReportGroup = PageProps["data"]["reportGroups"][number];

  // Effective importance, which is dynamic: baseline severity of the worst
  // reason, promoted when a report escalates (re-reported after dismissal, or
  // gone stale with no mod action). Routine mod reports stay dormant until then.
  function oldestAt(g: ReportGroup): string {
    let min = g.reports[0].createdAt;
    for (const r of g.reports) {
      if (r.createdAt < min) min = r.createdAt;
    }
    return min;
  }
  function isStale(g: ReportGroup): boolean {
    return Date.now() - Date.parse(oldestAt(g)) > STALE_MS;
  }
  function isEscalated(g: ReportGroup): boolean {
    return g.reReportCount > 0 || isStale(g);
  }
  function reasonsOf(g: ReportGroup): string[] {
    return [...new Set(g.reports.map((r) => r.reason))];
  }
  // Distinct people who reported this target (not raw rows), so the badge
  // reflects how many humans flagged it.
  function reporterCount(g: ReportGroup): number {
    return new Set(g.reports.map((r) => r.reporterHandle)).size;
  }
  // 0 urgent, 1 admin/legal, 2 escalated mod, 3 routine mod. Lower = sooner.
  function rank(g: ReportGroup): number {
    const t = tierForReasons(reasonsOf(g));
    if (t === "urgent") return 0;
    if (t === "admin") return 1;
    return isEscalated(g) ? 2 : 3;
  }
  function needsYou(g: ReportGroup): boolean {
    return rank(g) <= 2;
  }
  function level(g: ReportGroup): "urgent" | "attention" | "routine" {
    const r = rank(g);
    return r === 0 ? "urgent" : r <= 2 ? "attention" : "routine";
  }

  function railClass(lvl: "urgent" | "attention" | "routine"): string {
    if (lvl === "urgent") return "border-l-2 border-l-destructive";
    if (lvl === "attention") return "border-l-2 border-l-amber-500";
    return "border-l-2 border-l-foreground/15";
  }

  function matchesQuery(haystackParts: string[]): boolean {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return true;
    return haystackParts.join(" ").toLowerCase().includes(q);
  }

  const urgentCount = $derived(data.reportGroups.filter((g) => level(g) === "urgent").length);
  const needsCount = $derived(data.reportGroups.filter(needsYou).length);
  const modCount = $derived(data.reportGroups.filter((g) => !needsYou(g)).length);

  // The Reports tab holds what needs platform-staff attention (urgent / legal /
  // escalated); the Mod queue tab holds routine mod-tier reports (an org
  // moderator's normal job) so they stay visible and actionable here too.
  function inActiveReportTab(g: ReportGroup): boolean {
    return tab === "mod" ? !needsYou(g) : needsYou(g);
  }
  const reportsBaseCount = $derived(data.reportGroups.filter(inActiveReportTab).length);

  const filteredReports = $derived.by(() => {
    const out = data.reportGroups.filter((g) => {
      if (!inActiveReportTab(g)) return false;
      if (reasonFilter !== "all" && !reasonsOf(g).includes(reasonFilter)) return false;
      return matchesQuery([
        g.target?.contextLabel ?? "",
        ...g.reports.map((r) => r.reporterHandle),
        ...reasonsOf(g).map(reasonLabelLoose),
      ]);
    });
    return out.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        b.reReportCount - a.reReportCount ||
        oldestAt(a).localeCompare(oldestAt(b)),
    );
  });

  type DeletionRow = PageProps["data"]["deletionRequests"][number];
  function isAuthorReq(r: DeletionRow): boolean {
    return r.reason === "author_request";
  }
  const filteredDeletions = $derived.by(() => {
    const out = data.deletionRequests.filter((r) =>
      matchesQuery([r.target?.contextLabel ?? "", r.requesterHandle, reasonLabelLoose(r.reason)]),
    );
    // Moderator requests (need scrutiny) before author self-deletes; oldest
    // first within each, since the content is already hidden and waiting.
    return out.sort(
      (a, b) =>
        Number(isAuthorReq(a)) - Number(isAuthorReq(b)) || a.createdAt.localeCompare(b.createdAt),
    );
  });

  const countChipClass =
    "border-foreground/15 text-muted-foreground inline-block border px-1.5 py-0.5 text-xs whitespace-nowrap";
  const escalatedChipClass =
    "border-amber-500/40 bg-amber-50 text-amber-700 inline-block border px-1.5 py-0.5 text-xs whitespace-nowrap";
</script>

<svelte:head>
  <title>{m.admin_moderation_meta_title()} · docolin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-5xl">
  <div class="mb-6">
    <p class="text-muted-foreground mb-3 font-mono text-xs tracking-[0.22em] uppercase">
      {m.admin_moderation_eyebrow()}
    </p>
    <h1 class="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
      {m.admin_moderation_heading()}
    </h1>
  </div>

  <!-- Tabs: two genuinely different decisions (act-on-content vs approve/deny). -->
  <div class="border-foreground/15 mb-5 flex gap-1 border-b">
    <button
      type="button"
      onclick={() => {
        switchTab("reports");
      }}
      class="-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors {tab === 'reports'
        ? 'border-primary text-foreground'
        : 'text-muted-foreground hover:text-foreground border-transparent'}"
    >
      {m.admin_moderation_tab_reports()}
      {#if needsCount > 0}
        <span class="text-muted-foreground">({needsCount})</span>
      {/if}
    </button>
    <button
      type="button"
      onclick={() => {
        switchTab("mod");
      }}
      class="-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors {tab === 'mod'
        ? 'border-primary text-foreground'
        : 'text-muted-foreground hover:text-foreground border-transparent'}"
    >
      {m.admin_moderation_tab_mod()}
      {#if modCount > 0}
        <span class="text-muted-foreground">({modCount})</span>
      {/if}
    </button>
    <button
      type="button"
      onclick={() => {
        switchTab("deletions");
      }}
      class="-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors {tab === 'deletions'
        ? 'border-primary text-foreground'
        : 'text-muted-foreground hover:text-foreground border-transparent'}"
    >
      {m.admin_moderation_tab_deletions()}
      {#if data.deletionRequests.length > 0}
        <span class="text-muted-foreground">({data.deletionRequests.length})</span>
      {/if}
    </button>
    <button
      type="button"
      onclick={() => {
        switchTab("history");
      }}
      class="-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors {tab === 'history'
        ? 'border-primary text-foreground'
        : 'text-muted-foreground hover:text-foreground border-transparent'}"
    >
      {m.admin_moderation_tab_history()}
    </button>
  </div>

  {#if tab === "reports" || tab === "mod"}
    {#if tab === "reports" && urgentCount > 0}
      <div
        class="border-destructive/40 bg-destructive/5 text-destructive mb-4 flex w-full items-center gap-2 border px-4 py-2.5 text-sm font-medium"
      >
        <TriangleAlert class="size-4 shrink-0" />
        {m.admin_moderation_urgent_banner({ count: urgentCount })}
      </div>
    {/if}

    <!-- Toolbar: search + reason filter. -->
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="relative min-w-48 flex-1">
        <Search
          class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          bind:value={query}
          placeholder={m.admin_moderation_search_placeholder()}
          aria-label={m.admin_moderation_search_placeholder()}
          class="h-9 pl-9"
        />
      </div>
      <Select.Root type="single" bind:value={reasonFilter}>
        <Select.Trigger class="h-9! w-44" aria-label={m.admin_moderation_filter_reason_all()}>
          {reasonFilter === "all"
            ? m.admin_moderation_filter_reason_all()
            : reasonLabel(reasonFilter as ReportReason)}
        </Select.Trigger>
        <Select.Content preventScroll={false}>
          <Select.Item value="all" label={m.admin_moderation_filter_reason_all()}>
            {m.admin_moderation_filter_reason_all()}
          </Select.Item>
          {#each REPORT_REASONS as r (r)}
            <Select.Item value={r} label={reasonLabel(r)}>{reasonLabel(r)}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    {#if reportsBaseCount === 0}
      <p class="text-muted-foreground text-sm">
        {tab === "mod" ? m.admin_moderation_mod_empty() : m.admin_moderation_reports_empty()}
      </p>
    {:else if filteredReports.length === 0}
      <p class="text-muted-foreground text-sm">{m.admin_moderation_reports_none_match()}</p>
    {:else}
      <div class="flex flex-col gap-2">
        {#each filteredReports as group (`${group.targetType}:${group.targetId}`)}
          {@const key = `r:${group.targetType}:${group.targetId}`}
          {@const lvl = level(group)}
          {@const reasons = reasonsOf(group)}
          {@const open = expanded === key}
          {@const hideable = group.targetType !== "version"}
          {@const isRedacted = group.target?.isRedacted ?? false}
          {@const isHidden = group.target?.isHidden ?? false}
          {@const canHideActions = hideable && !isRedacted}
          <article class="border-foreground/15 border {railClass(lvl)}">
            <button
              type="button"
              onclick={() => {
                toggle(key);
              }}
              class="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
            >
              <span class="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                {group.target?.contextLabel ?? m.admin_moderation_no_content()}
              </span>
              <span class="text-muted-foreground hidden max-w-48 truncate text-xs sm:inline">
                {reasons.length > 1
                  ? `${reasonLabelLoose(reasons[0])} +${String(reasons.length - 1)}`
                  : reasonLabelLoose(reasons[0])}
              </span>
              {#if group.reReportCount > 0}
                <span class={escalatedChipClass}>{m.admin_moderation_chip_rereported()}</span>
              {:else if lvl === "attention" && isStale(group)}
                <span class={escalatedChipClass}>{m.admin_moderation_chip_stale()}</span>
              {/if}
              <span class={countChipClass}>
                {m.admin_moderation_reports_badge({ count: reporterCount(group) })}
              </span>
              <span class="text-muted-foreground hidden text-xs whitespace-nowrap md:inline">
                {age(oldestAt(group))}
              </span>
              <ChevronDown
                class="text-muted-foreground size-4 shrink-0 transition-transform {open
                  ? 'rotate-180'
                  : ''}"
              />
            </button>

            {#if open}
              <div class="border-foreground/15 flex flex-col gap-3 border-t px-4 py-3">
                {#if group.target?.url}
                  <a
                    href={localizeHref(group.target.url)}
                    class="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
                  >
                    {m.admin_moderation_open_content()}
                    <ExternalLink class="size-3.5" />
                  </a>
                {/if}

                {#if group.target && (group.target.isHidden || group.target.isRedacted)}
                  <span class="text-muted-foreground text-xs">
                    {group.target.isRedacted
                      ? m.admin_moderation_redacted_badge()
                      : m.admin_moderation_hidden_badge()}
                  </span>
                {/if}

                {#if group.target && group.target.bodyText.length > 0}
                  <div class="border-foreground/10 bg-muted/30 border p-3">
                    <p class="text-foreground/80 line-clamp-6 text-sm whitespace-pre-wrap">
                      {group.target.bodyText}
                    </p>
                  </div>
                {/if}

                <ul class="border-foreground/10 flex flex-col gap-2 border-l pl-3 text-sm">
                  {#each group.reports as rep (rep.id)}
                    <li class="flex flex-col gap-0.5">
                      <span class="text-muted-foreground text-xs">
                        @{rep.reporterHandle} · {reasonLabelLoose(rep.reason)} · {age(
                          rep.createdAt,
                        )}
                      </span>
                      {#if rep.details}
                        <span class="text-foreground/80 whitespace-pre-wrap">{rep.details}</span>
                      {/if}
                    </li>
                  {/each}
                </ul>

                {#if !hideable}
                  <p class="text-muted-foreground text-xs">{m.admin_moderation_version_hint()}</p>
                {/if}

                {#if redacting}
                  <!-- Redaction editor: scrub the offending part in place, keep
                       the rest. Saving destroys the original; this stays visible. -->
                  <form method="POST" action="?/redact" use:enhance class="flex flex-col gap-2">
                    <input type="hidden" name="targetType" value={group.targetType} />
                    <input type="hidden" name="targetId" value={group.targetId} />
                    <p class="text-muted-foreground text-xs">{m.admin_moderation_redact_help()}</p>
                    <Textarea name="newBody" bind:value={redactBody} rows={6} />
                    <Textarea
                      name="notes"
                      rows={1}
                      placeholder={m.admin_moderation_notes_placeholder()}
                    />
                    <div class="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="h-9"
                        onclick={() => {
                          redacting = false;
                        }}
                      >
                        {m.admin_moderation_redact_cancel()}
                      </Button>
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        class="h-9 gap-1.5"
                        disabled={redactBody.trim().length === 0}
                      >
                        <Trash2 class="size-4" />
                        {m.admin_moderation_redact_save()}
                      </Button>
                    </div>
                  </form>
                {:else}
                  <form method="POST" use:enhance class="flex flex-col gap-2">
                    <input type="hidden" name="targetType" value={group.targetType} />
                    <input type="hidden" name="targetId" value={group.targetId} />
                    <Textarea
                      name="notes"
                      rows={1}
                      placeholder={m.admin_moderation_notes_placeholder()}
                    />
                    <div class="ml-auto flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        formaction="?/dismiss"
                        variant="ghost"
                        size="sm"
                        class="h-9 gap-1.5"
                      >
                        <X class="size-4" />
                        {m.admin_moderation_action_dismiss()}
                      </Button>
                      {#if canHideActions}
                        {#if isHidden}
                          <Button
                            type="submit"
                            formaction="?/unhide"
                            variant="outline"
                            size="sm"
                            class="h-9 gap-1.5"
                          >
                            <Eye class="size-4" />
                            {m.admin_moderation_action_unhide()}
                          </Button>
                        {:else}
                          <Button
                            type="submit"
                            formaction="?/hide"
                            variant="outline"
                            size="sm"
                            class="h-9 gap-1.5"
                          >
                            <EyeOff class="size-4" />
                            {m.admin_moderation_action_hide()}
                          </Button>
                        {/if}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          class="h-9 gap-1.5"
                          onclick={() => {
                            startRedact(group.target?.bodyText ?? "");
                          }}
                        >
                          <Trash2 class="size-4" />
                          {m.admin_moderation_action_redact()}
                        </Button>
                      {/if}
                    </div>
                  </form>
                {/if}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  {:else if tab === "deletions"}
    <!-- Deletions: content is already hidden, waiting on approve/deny. -->
    <div class="mb-4 max-w-md">
      <div class="relative">
        <Search
          class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          bind:value={query}
          placeholder={m.admin_moderation_search_placeholder()}
          aria-label={m.admin_moderation_search_placeholder()}
          class="h-9 pl-9"
        />
      </div>
    </div>

    {#if data.deletionRequests.length === 0}
      <p class="text-muted-foreground text-sm">{m.admin_moderation_requests_empty()}</p>
    {:else if filteredDeletions.length === 0}
      <p class="text-muted-foreground text-sm">{m.admin_moderation_reports_none_match()}</p>
    {:else}
      <div class="flex flex-col gap-2">
        {#each filteredDeletions as req (req.id)}
          {@const key = `d:${req.id}`}
          {@const open = expanded === key}
          {@const author = isAuthorReq(req)}
          <article
            class="border-foreground/15 border {author
              ? 'border-l-foreground/15 border-l-2'
              : 'border-l-2 border-l-amber-500'}"
          >
            <button
              type="button"
              onclick={() => {
                toggle(key);
              }}
              class="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
            >
              <span class={author ? countChipClass : escalatedChipClass}>
                {author ? m.admin_moderation_deletion_author() : m.admin_moderation_deletion_mod()}
              </span>
              <span class="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                {req.target?.contextLabel ?? m.admin_moderation_no_content()}
              </span>
              <span class="text-muted-foreground hidden text-xs whitespace-nowrap md:inline">
                {m.admin_moderation_hidden_ago({ when: age(req.createdAt) })}
              </span>
              <ChevronDown
                class="text-muted-foreground size-4 shrink-0 transition-transform {open
                  ? 'rotate-180'
                  : ''}"
              />
            </button>

            {#if open}
              <div class="border-foreground/15 flex flex-col gap-3 border-t px-4 py-3">
                <p class="text-muted-foreground text-sm">
                  {m.admin_moderation_requested_by({ handle: `@${req.requesterHandle}` })} ·
                  <span class="text-foreground">{reasonLabelLoose(req.reason)}</span>
                </p>

                {#if req.target?.url}
                  <a
                    href={localizeHref(req.target.url)}
                    class="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
                  >
                    {m.admin_moderation_open_content()}
                    <ExternalLink class="size-3.5" />
                  </a>
                {/if}

                {#if req.details}
                  <p class="text-foreground/80 text-sm whitespace-pre-wrap">{req.details}</p>
                {/if}

                {#if req.target && req.target.bodyText.length > 0}
                  <div class="border-foreground/10 bg-muted/30 border p-3">
                    <p class="text-foreground/80 line-clamp-6 text-sm whitespace-pre-wrap">
                      {req.target.bodyText}
                    </p>
                  </div>
                {/if}

                <form method="POST" use:enhance class="flex flex-col gap-2">
                  <input type="hidden" name="requestId" value={req.id} />
                  <Textarea
                    name="notes"
                    rows={1}
                    placeholder={m.admin_moderation_notes_placeholder()}
                  />
                  <div class="flex justify-end gap-2">
                    <Button
                      type="submit"
                      formaction="?/approve"
                      variant="outline"
                      size="sm"
                      class="h-9 gap-1.5"
                    >
                      <Check class="size-4" />
                      {m.admin_moderation_action_approve()}
                    </Button>
                    <Button
                      type="submit"
                      formaction="?/deny"
                      variant="ghost"
                      size="sm"
                      class="h-9 gap-1.5"
                    >
                      <X class="size-4" />
                      {m.admin_moderation_action_deny()}
                    </Button>
                  </div>
                </form>
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  {:else}
    <!-- History: the audit trail of resolved actions, so a past decision can be
         revisited. Read-only; click through to the content. -->
    {#if data.actionLog.length === 0}
      <p class="text-muted-foreground text-sm">{m.admin_moderation_history_empty()}</p>
    {:else}
      <div class="flex flex-col gap-2">
        {#each data.actionLog as entry (entry.id)}
          <article class="border-foreground/15 flex flex-col gap-1 border px-4 py-2.5">
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span class="text-foreground text-sm font-medium">
                {actionTypeLabel(entry.actionType)}
              </span>
              {#if entry.target?.url}
                <a
                  href={localizeHref(entry.target.url)}
                  class="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                >
                  {entry.target.contextLabel}
                  <ExternalLink class="size-3.5" />
                </a>
              {:else}
                <span class="text-muted-foreground text-sm">
                  {entry.target?.contextLabel ?? m.admin_moderation_no_content()}
                </span>
              {/if}
              <span class="text-muted-foreground ml-auto text-xs whitespace-nowrap">
                {entry.actorHandle ? `@${entry.actorHandle} · ` : ""}{age(entry.createdAt)}
              </span>
            </div>
            {#if entry.reason !== null || entry.notes !== null}
              <p class="text-muted-foreground text-xs">
                {#if entry.reason}{reasonLabelLoose(
                    entry.reason,
                  )}{/if}{#if entry.reason && entry.notes}
                  ·
                {/if}{#if entry.notes}{entry.notes}{/if}
              </p>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  {/if}
</div>
