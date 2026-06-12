import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { deleteAccount, getAccountView, updateDisplayName } from "$lib/server/account";
import { LIMITS, isRequestBodyTooLarge } from "$lib/limits";
import { localizeHref } from "$paraglide/runtime";

// Personal account page: identity (display name, handle, email) and account
// deletion. Per-user SSR, the admin-surface exception to the cached shell.

function fieldStr(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
  setHeaders({ "cache-control": "private, no-store" });
  if (!locals.dbUser) {
    redirect(303, localizeHref(`/signin?returnTo=${encodeURIComponent("/dashboard/account")}`));
  }
  const account = await getAccountView(locals.dbUser.id);
  if (account === null) error(404);
  return { account };
};

export const actions = {
  rename: async ({ request, locals }) => {
    if (!locals.dbUser) return fail(401, { action: "rename", error: "generic" });
    if (isRequestBodyTooLarge(request)) return fail(413, { action: "rename", error: "generic" });

    const form = await request.formData();
    const raw = fieldStr(form, "displayName").trim().slice(0, LIMITS.displayName);
    await updateDisplayName(locals.dbUser.id, raw.length > 0 ? raw : null);
    return { action: "rename", ok: true };
  },

  deleteAccount: async ({ request, locals }) => {
    if (!locals.dbUser) return fail(401, { action: "deleteAccount", error: "generic" });
    if (isRequestBodyTooLarge(request)) {
      return fail(413, { action: "deleteAccount", error: "generic" });
    }

    const form = await request.formData();
    if (fieldStr(form, "confirmHandle").trim().replace("@", "") !== locals.dbUser.handle) {
      return fail(400, { action: "deleteAccount", error: "confirm_mismatch" });
    }

    const res = await deleteAccount(locals.dbUser.id);
    if (!res.ok) {
      return fail(res.reason === "workos_failed" ? 502 : 400, {
        action: "deleteAccount",
        error: res.reason,
      });
    }
    // The WorkOS user is gone, so the session can't refresh; /signout clears
    // what it can and falls back to the homepage redirect for a session that
    // no longer validates.
    redirect(303, localizeHref("/signout"));
  },
} satisfies Actions;
