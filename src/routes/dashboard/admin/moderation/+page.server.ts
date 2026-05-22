import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  adminHide,
  adminRedact,
  adminUnhide,
  approveDeletion,
  denyDeletion,
  dismissReports,
  listOpenReports,
  listPendingDeletionRequests,
  listRecentActions,
} from "$lib/server/moderation-review";
import type { ModerationTargetType } from "$lib/moderation-reasons";

// Platform-admin moderation queue: open reports (grouped per target) plus
// pending deletion requests, with the actions to resolve them. The parent
// admin +layout.server.ts gates the *load* to platform admins and sets
// no-store; form actions run independently of that load, so each one re-checks
// isPlatformAdmin itself.

export const load: PageServerLoad = async () => {
  const [reportGroups, deletionRequests, actionLog] = await Promise.all([
    listOpenReports(),
    listPendingDeletionRequests(),
    listRecentActions(),
  ]);
  return { reportGroups, deletionRequests, actionLog };
};

function fieldStr(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

function parseTargetType(raw: string): ModerationTargetType | null {
  if (
    raw === "discussion" ||
    raw === "discussion_reply" ||
    raw === "version" ||
    raw === "discussion_edit" ||
    raw === "discussion_reply_edit"
  ) {
    return raw;
  }
  return null;
}

export const actions = {
  dismiss: async ({ request, locals }) => {
    if (!locals.dbUser?.isPlatformAdmin) return fail(403, { error: "forbidden" });
    const form = await request.formData();
    const targetType = parseTargetType(fieldStr(form, "targetType"));
    const targetId = fieldStr(form, "targetId");
    if (targetType === null || targetId.length === 0) return fail(400, { error: "generic" });
    const res = await dismissReports({
      targetType,
      targetId,
      actorUserId: locals.dbUser.id,
      notes: fieldStr(form, "notes").trim(),
    });
    return res.ok ? { ok: true } : fail(404, { error: res.reason });
  },

  hide: async ({ request, locals }) => {
    if (!locals.dbUser?.isPlatformAdmin) return fail(403, { error: "forbidden" });
    const form = await request.formData();
    const targetType = parseTargetType(fieldStr(form, "targetType"));
    const targetId = fieldStr(form, "targetId");
    if (targetType === null || targetId.length === 0) return fail(400, { error: "generic" });
    const res = await adminHide({
      targetType,
      targetId,
      actorUserId: locals.dbUser.id,
      notes: fieldStr(form, "notes").trim(),
    });
    return res.ok
      ? { ok: true }
      : fail(res.reason === "unsupported" ? 400 : 404, { error: res.reason });
  },

  redact: async ({ request, locals }) => {
    if (!locals.dbUser?.isPlatformAdmin) return fail(403, { error: "forbidden" });
    const form = await request.formData();
    const targetType = parseTargetType(fieldStr(form, "targetType"));
    const targetId = fieldStr(form, "targetId");
    const newBody = fieldStr(form, "newBody").trim();
    if (targetType === null || targetId.length === 0 || newBody.length === 0) {
      return fail(400, { error: "generic" });
    }
    const res = await adminRedact({
      targetType,
      targetId,
      actorUserId: locals.dbUser.id,
      newBody,
      notes: fieldStr(form, "notes").trim(),
    });
    return res.ok
      ? { ok: true }
      : fail(res.reason === "unsupported" ? 400 : 404, { error: res.reason });
  },

  unhide: async ({ request, locals }) => {
    if (!locals.dbUser?.isPlatformAdmin) return fail(403, { error: "forbidden" });
    const form = await request.formData();
    const targetType = parseTargetType(fieldStr(form, "targetType"));
    const targetId = fieldStr(form, "targetId");
    if (targetType === null || targetId.length === 0) return fail(400, { error: "generic" });
    const res = await adminUnhide({
      targetType,
      targetId,
      actorUserId: locals.dbUser.id,
      notes: fieldStr(form, "notes").trim(),
    });
    return res.ok
      ? { ok: true }
      : fail(res.reason === "unsupported" ? 400 : 404, { error: res.reason });
  },

  approve: async ({ request, locals }) => {
    if (!locals.dbUser?.isPlatformAdmin) return fail(403, { error: "forbidden" });
    const form = await request.formData();
    const requestId = fieldStr(form, "requestId");
    if (requestId.length === 0) return fail(400, { error: "generic" });
    const res = await approveDeletion({
      requestId,
      actorUserId: locals.dbUser.id,
      notes: fieldStr(form, "notes").trim(),
    });
    return res.ok ? { ok: true } : fail(404, { error: res.reason });
  },

  deny: async ({ request, locals }) => {
    if (!locals.dbUser?.isPlatformAdmin) return fail(403, { error: "forbidden" });
    const form = await request.formData();
    const requestId = fieldStr(form, "requestId");
    if (requestId.length === 0) return fail(400, { error: "generic" });
    const res = await denyDeletion({
      requestId,
      actorUserId: locals.dbUser.id,
      notes: fieldStr(form, "notes").trim(),
    });
    return res.ok ? { ok: true } : fail(404, { error: res.reason });
  },
} satisfies Actions;
