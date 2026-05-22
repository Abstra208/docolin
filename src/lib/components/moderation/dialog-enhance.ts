import { applyAction } from "$app/forms";
import type { ActionResult } from "@sveltejs/kit";

type ResultData = Record<string, unknown> | undefined;

// Shared use:enhance result handler for the moderation dialogs. Redirects (an
// action sends you away, e.g. after deleting a thread's original post) are
// applied by SvelteKit; everything else is handed to onResult so each dialog
// decides what to do (show a success state, close + refresh, surface an error).
export function applyEnhance(opts: {
  onResult: (type: "success" | "failure" | "error", data: ResultData) => void | Promise<void>;
}): (event: { result: ActionResult }) => Promise<void> {
  return async ({ result }) => {
    if (result.type === "redirect") {
      await applyAction(result);
      return;
    }
    const data = "data" in result ? (result.data as ResultData) : undefined;
    await opts.onResult(result.type, data);
  };
}
