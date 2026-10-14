import { rankThreads, scoreOpportunity, suggestIdeas, type Thread } from "./scout.js";
import { summarizeText } from "./core.js";
import { VERSION } from "./version.js";
export interface WorkerEnv { PACK_NAME?: string; }
function json(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } }); }
export default { async fetch(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, pack: env.PACK_NAME ?? "agentic-scout", version: VERSION });
  if (request.method === "POST" && url.pathname === "/summarize") { let body: { text?: unknown }; try { body = await request.json() as typeof body; } catch { return json({ error: "body must be JSON" }, 400); } return typeof body.text === "string" ? json(summarizeText(body.text)) : json({ error: "body needs a text string" }, 400); }
  if (request.method === "POST" && ["/score", "/rank", "/ideas"].includes(url.pathname)) {
    let body: { thread?: Thread; threads?: Thread[] }; try { body = await request.json() as typeof body; } catch { return json({ error: "body must be JSON" }, 400); }
    if (url.pathname === "/score" && body.thread) return json(scoreOpportunity(body.thread));
    if (url.pathname === "/rank" && body.threads) return json(rankThreads(body.threads));
    if (url.pathname === "/ideas" && body.threads) return json(suggestIdeas(body.threads));
    return json({ error: "invalid thread body" }, 400);
  }
  return json({ error: "not found" }, 404);
} };
