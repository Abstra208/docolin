<script lang="ts">
  import { Command as CommandPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";
  import SearchIcon from "@lucide/svelte/icons/search";

  let {
    ref = $bindable(null),
    class: className,
    value = $bindable(""),
    ...restProps
  }: CommandPrimitive.InputProps = $props();
</script>

<div
  data-slot="command-input-wrapper"
  class="border-input flex h-11 items-center gap-2 border-b px-3"
>
  <SearchIcon class="text-muted-foreground size-4 shrink-0" />
  <CommandPrimitive.Input
    bind:ref
    bind:value
    data-slot="command-input"
    class={cn(
      "placeholder:text-muted-foreground flex h-full w-full bg-transparent text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...restProps}
  />
</div>
