<script lang="ts">
  import "./layout.css";
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { baseLocale, deLocalizeUrl, localizeUrl, locales } from "$paraglide/runtime";
  import { SITE_URL } from "$lib/site";

  let { children }: { children: Snippet } = $props();

  // Build localized canonical URLs for each locale of the current path so
  // search engines can index every language variant of every page.
  const altLinks = $derived.by(() => {
    const dePath = deLocalizeUrl(page.url).pathname;
    return locales.map((loc) => ({
      loc,
      href: localizeUrl(`${SITE_URL}${dePath}`, { locale: loc }).href,
    }));
  });

  const canonical = $derived(`${SITE_URL}${page.url.pathname}`);
  const xDefault = $derived(altLinks.find((l) => l.loc === baseLocale)?.href ?? SITE_URL);
</script>

<svelte:head>
  <link rel="canonical" href={canonical} />
  {#each altLinks as link (link.loc)}
    <link rel="alternate" hreflang={link.loc} href={link.href} />
  {/each}
  <link rel="alternate" hreflang="x-default" href={xDefault} />
</svelte:head>

{@render children()}
