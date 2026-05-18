import { error, json } from "@sveltejs/kit";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { inboxMessages } from "$lib/server/db/schema";

// Per-user inbox listing. `?bucket=inbox` returns un-done messages; `?bucket=
// done` returns done ones. Both buckets share this endpoint so the page that
// fetches them stays consistent in cache policy and error handling.
export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
  const userId = locals.dbUser?.id;
  if (!userId) error(401, "not_authenticated");

  setHeaders({ "cache-control": "private, no-store" });

  const bucket = url.searchParams.get("bucket") === "done" ? "done" : "inbox";

  const baseSelect = db
    .select({
      id: inboxMessages.id,
      kind: inboxMessages.kind,
      subject: inboxMessages.subject,
      preview: inboxMessages.preview,
      linkUrl: inboxMessages.linkUrl,
      readAt: inboxMessages.readAt,
      createdAt: inboxMessages.createdAt,
    })
    .from(inboxMessages);

  const rows =
    bucket === "inbox"
      ? await baseSelect
          .where(and(eq(inboxMessages.userId, userId), isNull(inboxMessages.doneAt)))
          .orderBy(desc(inboxMessages.createdAt))
          .limit(100)
      : await baseSelect
          .where(and(eq(inboxMessages.userId, userId), isNotNull(inboxMessages.doneAt)))
          .orderBy(desc(inboxMessages.createdAt))
          .limit(100);

  return json({
    bucket,
    messages: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      subject: r.subject,
      preview: r.preview,
      hasLink: r.linkUrl !== null,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
};
