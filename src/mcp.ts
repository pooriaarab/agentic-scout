import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createLogger, getCostReport, GuardError, VendorError, type Logger, type Guards, summarizeText, dispatchText, LocalRouterAdapter } from "./core.js";
import { rankThreads, scoreOpportunity, searchThreads, suggestIdeas, type Thread } from "./scout.js";
import { DEFAULT_BRAND } from "./index.js";

export interface McpDeps { fetchFn?: typeof fetch; logger?: Logger; guards?: Guards; }
const threadSchema = z.object({ id: z.string(), title: z.string(), body: z.string().optional(), url: z.string(), source: z.string(), author: z.string().optional(), createdAt: z.string().optional(), score: z.number().optional(), comments: z.number().optional(), upvotes: z.number().optional(), subscribers: z.number().optional(), tags: z.array(z.string()).optional() });
function okResult(value: unknown) { return { content: [{ type: "text" as const, text: JSON.stringify(value) }] }; }
function errorResult(error: unknown) { return { content: [{ type: "text" as const, text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) }], isError: true as const }; }
export function createMcpServer(deps: McpDeps = {}): McpServer {
  const server = new McpServer({ name: DEFAULT_BRAND.command, version: DEFAULT_BRAND.version });
  server.registerTool("summarize_text", { description: "Compatibility text summary.", inputSchema: { text: z.string() }, annotations: { readOnlyHint: true } }, async ({ text }) => okResult(summarizeText(text)));
  server.registerTool("dispatch_text", { description: "Compatibility local dispatch.", inputSchema: { text: z.string(), dryRun: z.boolean().optional() } }, async ({ text, dryRun }) => { try { return okResult(await dispatchText(text, { adapter: new LocalRouterAdapter(), guards: deps.guards, dryRun: dryRun ?? false })); } catch (error) { return errorResult(error); } });
  server.registerTool("score_opportunity", { description: "Score one public thread for relevance, velocity, buying intent, and competition.", inputSchema: { thread: threadSchema }, annotations: { readOnlyHint: true } }, async ({ thread }) => okResult(scoreOpportunity(thread as Thread)));
  server.registerTool("rank_threads", { description: "Rank supplied public threads by opportunity.", inputSchema: { threads: z.array(threadSchema) }, annotations: { readOnlyHint: true } }, async ({ threads }) => okResult(rankThreads(threads as Thread[])));
  server.registerTool("suggest_ideas", { description: "Create AI-assisted, disclosure-bearing draft ideas from supplied threads.", inputSchema: { threads: z.array(threadSchema) }, annotations: { readOnlyHint: true } }, async ({ threads }) => okResult(suggestIdeas(threads as Thread[])));
  server.registerTool("search_threads", { description: "Search public Reddit, Hacker News, or RSS sources. Dry run is default; live requires explicit approval.", inputSchema: { query: z.string(), sources: z.array(z.enum(["reddit", "hackernews", "rss", "fixture"])).optional(), live: z.boolean().optional(), approved: z.boolean().optional(), rssUrl: z.string().url().optional() }, annotations: { readOnlyHint: true, openWorldHint: true } }, async ({ query, sources, live, approved, rssUrl }) => {
    if (!live) return okResult({ dryRun: true, query, sources: sources ?? ["reddit", "hackernews"], approvalRequired: true });
    if (!approved) return errorResult(new GuardError("live search requires approved: true"));
    try { return okResult(await searchThreads(query, sources, { fetchFn: deps.fetchFn, rssUrl, logger: deps.logger ?? createLogger({ quiet: true }) })); }
    catch (error) { if (error instanceof GuardError || error instanceof VendorError) return errorResult(error); throw error; }
  });
  server.registerTool("get_cost_report", { description: "Read session cost totals.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () => okResult(getCostReport()));
  return server;
}
export async function startMcp(deps: McpDeps = {}): Promise<void> { const server = createMcpServer(deps); await server.connect(new StdioServerTransport()); }
