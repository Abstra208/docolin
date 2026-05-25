import { json, text } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { handleMcp } from "$lib/server/mcp/server";
import { resolveMcpToken } from "$lib/server/mcp-tokens";

// docolin's MCP endpoint: stateless Streamable HTTP, JSON-RPC 2.0 over POST.
// Public read-only grounding (docs are public); the optional personal-token
// Bearer auth is layered on later. No SSE/session, so GET is not a stream.

export const POST: RequestHandler = async ({ request, fetch, url }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Malformed JSON; the only thing that can throw before dispatch.
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } });
  }

  // Optional personal-token auth: a valid Bearer token attributes verifications
  // to the owning user (signed). Absent/invalid -> anonymous; read tools work
  // either way (docs are public).
  const userId = await resolveMcpToken(request.headers.get("authorization"));
  const result = await handleMcp(body, { fetch, userId, origin: url.origin });
  if (result.body === null) return new Response(null, { status: result.status });
  return json(result.body, { status: result.status });
};

// This endpoint does not offer a server-initiated SSE stream (stateless), so a
// GET gets 405 per the Streamable HTTP spec; clients use POST.
export const GET: RequestHandler = () => {
  return text("MCP endpoint: POST JSON-RPC only.", {
    status: 405,
    headers: { allow: "POST" },
  });
};
