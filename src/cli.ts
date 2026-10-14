#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
import { createGuards, getCostReport, GuardError, VendorError, summarizeText, dispatchText, LocalRouterAdapter } from "./core.js";
import { searchThreads, rankThreads, suggestIdeas, type ScoutSource } from "./scout.js";
import { DEFAULT_BRAND } from "./index.js";
import { VERSION } from "./version.js";

export class UsageError extends Error { constructor(message: string) { super(message); this.name = "UsageError"; } }
export type CliCommand = "search" | "trends" | "ideas" | "summary" | "dispatch" | "costs" | "mcp" | "help" | "version";
export interface CliRequest { command: CliCommand; query?: string; platforms?: ScoutSource[]; dryRun: boolean; text?: string; file?: string; topN?: number; }
export interface CliIo { out(line: string): void; err(line: string): void; fetchFn?: typeof fetch; readFile?(path: string): string; router?: unknown; }

export function parseArgs(argv: string[]): CliRequest {
  const request: CliRequest = { command: "help", dryRun: false };
  const args = [...argv]; const first = args.shift();
  if (first === undefined || first === "--help" || first === "-h") return request;
  if (first === "--version" || first === "-V") return { ...request, command: "version" };
  if (!["search", "trends", "ideas", "summary", "dispatch", "costs", "mcp"].includes(first)) throw new UsageError(`unknown command "${first}"`);
  request.command = first as CliCommand;
  while (args.length) {
    const flag = args.shift() as string;
    if (flag === "--live") { request.dryRun = false; continue; }
    if (flag === "--dry-run") { request.dryRun = true; continue; }
    if ((flag === "--text" || flag === "--file" || flag === "--top") && args.length) { const value = args.shift() as string; if (flag === "--text") request.text = value; else if (flag === "--file") request.file = value; else { const n = Number.parseInt(value, 10); if (!Number.isInteger(n) || n < 0) throw new UsageError(`--top needs an integer of 0 or more, got "${value}"`); request.topN = n; } continue; }
    if ((flag === "--query" || flag === "--platforms") && args.length) {
      const value = args.shift() as string;
      if (flag === "--query") request.query = value;
      else {
        const valid: ScoutSource[] = ["reddit", "hackernews", "rss", "fixture"];
        const platforms = value.split(",").map((v) => v.trim()).filter(Boolean) as ScoutSource[];
        if (platforms.some((platform) => !valid.includes(platform))) throw new UsageError("--platforms supports reddit,hackernews,rss,fixture");
        request.platforms = platforms;
      }
      continue;
    }
    throw new UsageError(`unknown flag "${flag}" for "${request.command}"`);
  }
  if (["summary", "dispatch"].includes(request.command) && !request.text && !request.file) throw new UsageError(`${request.command} needs --text or --file`);
  if (["search", "ideas"].includes(request.command) && !request.query) throw new UsageError(`${request.command} needs --query`);
  return request;
}
function helpText(): string { return `${DEFAULT_BRAND.name} ${VERSION}\n${DEFAULT_BRAND.description}\n\nUsage: agentic-scout <command> [flags]\n\nCommands:\n  search --query <q> [--platforms reddit,hackernews] [--live]\n  trends [--platforms reddit,hackernews] [--live]\n  ideas --query <q> [--platforms reddit,hackernews] [--live]\n  costs\n  mcp\n\nDry-run is the default. Use --live only after approval; live searches use public APIs.`; }
function defaultIo(): CliIo { return { out: (line) => console.log(line), err: (line) => console.error(line) }; }
export async function runCli(argv: string[], io: CliIo = defaultIo()): Promise<number> {
  let request: CliRequest;
  try { request = parseArgs(argv); } catch (error) { io.err(error instanceof Error ? error.message : String(error)); return 2; }
  try {
    if (request.command === "help") { io.out(helpText()); return 0; }
    if (request.command === "version") { io.out(VERSION); return 0; }
    if (request.command === "summary") { const text = request.file ? io.readFile?.(request.file) ?? "" : request.text ?? ""; io.out(JSON.stringify(summarizeText(text, { topN: request.topN }))); return 0; }
    if (request.command === "dispatch") { const text = request.file ? io.readFile?.(request.file) ?? "" : request.text ?? ""; io.out(JSON.stringify(await dispatchText(text, { adapter: io.router instanceof LocalRouterAdapter ? io.router : new LocalRouterAdapter(), dryRun: request.dryRun }))); return 0; }
    if (request.command === "costs") { io.out(JSON.stringify(getCostReport())); return 0; }
    if (request.command === "mcp") { const { startMcp } = await import("./mcp.js"); await startMcp(); return 0; }
    const query = request.command === "trends" ? "trending" : request.query as string;
    const scoutDryRun = request.dryRun || !argv.includes("--live");
    if (scoutDryRun) { io.out(JSON.stringify({ dryRun: true, query, sources: request.platforms ?? ["reddit", "hackernews"], approvalRequired: true })); return 0; }
    const threads = await searchThreads(query, request.platforms ?? ["reddit", "hackernews"], { fetchFn: io.fetchFn, guards: createGuards() });
    io.out(JSON.stringify(request.command === "ideas" ? suggestIdeas(threads) : rankThreads(threads)));
    return 0;
  } catch (error) {
    if (error instanceof GuardError || error instanceof VendorError) { io.err(`${error.name}: ${error.message}`); return 1; }
    throw error;
  }
}
function isMainModule(): boolean { try { return typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; } }
if (isMainModule()) runCli(process.argv.slice(2)).then((code) => { if (code) process.exit(code); }, (error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
