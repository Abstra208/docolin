import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { createMcpToken, listMcpTokens, revokeMcpToken } from "$lib/server/mcp-tokens";

// Personal MCP token management. Per-user and secret-bearing (a freshly minted
// token is shown once), so always no-store; never an edge-cached shell.

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
  setHeaders({ "cache-control": "private, no-store" });
  const user = locals.dbUser;
  return {
    endpoint: `${url.origin}/api/mcp`,
    tokens: user ? await listMcpTokens(user.id) : [],
  };
};

const MAX_NAME_LENGTH = 60;

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const user = locals.dbUser;
    if (!user) return fail(401, { error: "auth" });
    const form = await request.formData();
    const name = form.get("name");
    if (typeof name !== "string" || name.trim().length === 0) return fail(400, { error: "name" });
    const created = await createMcpToken(user.id, name.trim().slice(0, MAX_NAME_LENGTH));
    // The plaintext is surfaced exactly here and never recoverable again.
    return { created };
  },
  revoke: async ({ request, locals }) => {
    const user = locals.dbUser;
    if (!user) return fail(401, { error: "auth" });
    const form = await request.formData();
    const id = form.get("id");
    if (typeof id !== "string" || id.length === 0) return fail(400, { error: "id" });
    await revokeMcpToken(user.id, id);
    return { revoked: true };
  },
};
