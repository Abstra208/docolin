<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { m } from "$paraglide/messages";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import type { ModerationTargetType } from "$lib/moderation-reasons";
  import { applyEnhance } from "./dialog-enhance";

  // Author deleting their own content. Hides it immediately and queues it for
  // platform-staff review (the deletion-request flow with reason "author_request").
  // No reason picker, just a confirm. Submits to ?/requestDeletion.
  let {
    open = $bindable(false),
    target,
  }: {
    open?: boolean;
    target: { type: ModerationTargetType; id: string } | null;
  } = $props();

  let submitting = $state(false);
  let errored = $state(false);

  let wasOpen = false;
  $effect(() => {
    if (open && !wasOpen) {
      submitting = false;
      errored = false;
    }
    wasOpen = open;
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>{m.moderation_delete_title()}</Dialog.Title>
      <Dialog.Description>{m.moderation_delete_description()}</Dialog.Description>
    </Dialog.Header>

    {#if errored}
      <p class="text-destructive text-sm">{m.moderation_report_error_generic()}</p>
    {/if}

    <form
      method="POST"
      action="?/requestDeletion"
      use:enhance={() => {
        submitting = true;
        errored = false;
        return applyEnhance({
          onResult: async (type) => {
            submitting = false;
            if (type === "success") {
              open = false;
              await invalidateAll();
            } else {
              errored = true;
            }
          },
        });
      }}
    >
      <input type="hidden" name="targetType" value={target?.type ?? ""} />
      <input type="hidden" name="targetId" value={target?.id ?? ""} />
      <input type="hidden" name="reason" value="author_request" />
      <Dialog.Footer>
        <Button type="button" variant="ghost" onclick={() => (open = false)}>
          {m.moderation_dialog_cancel()}
        </Button>
        <Button type="submit" variant="destructive" disabled={submitting}>
          {submitting ? m.moderation_delete_submitting() : m.moderation_delete_confirm()}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
