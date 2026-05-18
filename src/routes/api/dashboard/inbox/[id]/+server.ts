import { error, json } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { inboxMessages } from "$lib/server/db/schema";
import { renderMarkdown } from "$lib/server/markdown";

// Per-user message detail. The GET also auto-marks the message read (opening
// the page counts as reading) so the inbox bell clears on first view. The
// update is idempotent: only touches rows where readAt is still null, so
// re-fetches don't overwrite the original read timestamp.
//
// Page itself is a session-independent shell that fetches this endpoint.
export const GET: RequestHandler = async ({ locals, params, setHeaders }) => {
  const userId = locals.dbUser?.id;
  if (!userId) error(401, "not_authenticated");

  setHeaders({ "cache-control": "private, no-store" });

  const rows = await db
    .select({
      id: inboxMessages.id,
      kind: inboxMessages.kind,
      subject: inboxMessages.subject,
      bodyMarkdown: inboxMessages.bodyMarkdown,
      linkUrl: inboxMessages.linkUrl,
      readAt: inboxMessages.readAt,
      doneAt: inboxMessages.doneAt,
      createdAt: inboxMessages.createdAt,
    })
    .from(inboxMessages)
    .where(and(eq(inboxMessages.id, params.id), eq(inboxMessages.userId, userId)))
    .limit(1);
  if (rows.length === 0) error(404);
  const row = rows[0];

  if (row.readAt === null) {
    await db
      .update(inboxMessages)
      .set({ readAt: new Date() })
      .where(and(eq(inboxMessages.id, row.id), isNull(inboxMessages.readAt)));
  }

  return json({
    message: {
      id: row.id,
      kind: row.kind,
      subject: row.subject,
      bodyHtml: await renderMarkdown(row.bodyMarkdown),
      linkUrl: row.linkUrl,
      doneAt: row.doneAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    },
  });
};
