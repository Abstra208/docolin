import { TOOL_DEFINITIONS, executeTool, type ToolContext } from "./tools";
import { buildMcpInstructions } from "./instructions";

// Minimal stateless MCP server over JSON-RPC 2.0 (Streamable HTTP, JSON
// responses, no session). Hand-rolled rather than pulling the SDK or the
// Durable-Object-backed agents helper: we only need initialize / tools.list /
// tools.call, and staying dependency-free keeps it cheap and fully ours.

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "docolin", version: "0.1.0" } as const;

type RpcId = string | number | null;

interface RpcRequest {
  jsonrpc: "2.0";
  id?: RpcId;
  method: string;
  params?: unknown;
}

interface RpcResponse {
  jsonrpc: "2.0";
  id: RpcId;
  result?: unknown;
  error?: { code: number; message: string };
}

function ok(id: RpcId, result: unknown): RpcResponse {
  return { jsonrpc: "2.0", id, result };
}
function err(id: RpcId, code: number, message: string): RpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function isRpcRequest(value: unknown): value is RpcRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.jsonrpc === "2.0" && typeof v.method === "string";
}

// Returns the response, or null for a notification (no reply expected).
async function handleOne(req: RpcRequest, ctx: ToolContext): Promise<RpcResponse | null> {
  const id = req.id ?? null;

  // Notifications (initialized, cancelled, ...) get no response.
  if (req.method.startsWith("notifications/")) return null;

  switch (req.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: buildMcpInstructions(ctx.userId !== null, ctx.origin),
      });
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOL_DEFINITIONS });
    case "tools/call": {
      const params = (req.params ?? {}) as { name?: unknown; arguments?: unknown };
      if (typeof params.name !== "string") return err(id, -32602, "missing tool name");
      const args =
        typeof params.arguments === "object" && params.arguments !== null
          ? (params.arguments as Record<string, unknown>)
          : {};
      try {
        const payload = await executeTool(params.name, args, ctx);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(payload) }] });
      } catch (e) {
        // Tool-level failure is reported in-band (isError) so the agent sees it,
        // per MCP, rather than as a protocol error.
        const message = e instanceof Error ? e.message : "tool execution failed";
        return ok(id, { content: [{ type: "text", text: `Error: ${message}` }], isError: true });
      }
    }
    default:
      return err(id, -32601, `method not found: ${req.method}`);
  }
}

export interface McpResult {
  status: number;
  /** null means "no body" (202 for a notification-only request). */
  body: RpcResponse | RpcResponse[] | null;
}

export async function handleMcp(body: unknown, ctx: ToolContext): Promise<McpResult> {
  if (Array.isArray(body)) {
    const responses: RpcResponse[] = [];
    for (const item of body) {
      if (!isRpcRequest(item)) {
        responses.push(err(null, -32600, "invalid request"));
        continue;
      }
      const resp = await handleOne(item, ctx);
      if (resp !== null) responses.push(resp);
    }
    return responses.length === 0 ? { status: 202, body: null } : { status: 200, body: responses };
  }

  if (!isRpcRequest(body)) return { status: 400, body: err(null, -32600, "invalid request") };
  const resp = await handleOne(body, ctx);
  return resp === null ? { status: 202, body: null } : { status: 200, body: resp };
}
