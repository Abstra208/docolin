<script lang="ts">
  import { m } from "$paraglide/messages";

  // Formatting help line for composer footers: a short prompt plus a link to
  // the (not-yet-built) markdown guide. The link is an inert placeholder until
  // the guide ships, so it doesn't 404. Lives in the form footer next to the
  // submit buttons rather than glued to the editor, so the footer reads as one
  // row: help on the left, actions on the right.
</script>

<p class="text-muted-foreground text-xs">
  {m.discussion_editor_hint()}
  <button
    type="button"
    class="cursor-not-allowed underline underline-offset-2"
    title={m.discussion_editor_guide_soon()}
    aria-disabled="true"
  >
    {m.discussion_editor_guide()}
  </button>
</p>
