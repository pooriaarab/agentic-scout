import { VendorError, type Guards, type Logger } from "./core.js";

export type ScoutSource = "reddit" | "hackernews" | "rss" | "fixture";

export interface Thread {
  id: string;
  title: string;
  body?: string;
  url: string;
  source: ScoutSource | string;
  author?: string;
  createdAt?: string;
  score?: number;
  comments?: number;
  upvotes?: number;
  subscribers?: number;
  tags?: string[];
}

export interface OpportunityScore {
  relevance: number;
  engagementVelocity: number;
  buyingIntent: number;
  competition: number;
  total: number;
}

export interface RankedThread extends Thread {
  opportunity: OpportunityScore;
}

export interface IdeaCard {
  hook: string;
  format: string;
  platform: string;
  sourceThread: { id: string; title: string; url: string; source: string };
  disclosure: string;
}

export type FetchFn = typeof fetch;
export interface SearchOptions {
  fetchFn?: FetchFn;
  fixtures?: Thread[];
  limit?: number;
  redditSubreddit?: string;
  rssUrl?: string;
  guards?: Guards;
  logger?: Logger;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ageHours(thread: Thread): number {
  if (!thread.createdAt) return 24;
  const time = Date.parse(thread.createdAt);
  if (Number.isNaN(time)) return 24;
  return Math.max(1, (Date.now() - time) / 3_600_000);
}

function textOf(thread: Thread): string {
  return `${thread.title} ${thread.body ?? ""} ${(thread.tags ?? []).join(" ")}`.toLowerCase();
}

/** Score a public thread for relevance, momentum, commercial signal, and crowding. */
export function scoreOpportunity(thread: Thread): OpportunityScore {
  const text = textOf(thread);
  const relevance = clamp(Math.min(100, 35 + Math.min(45, thread.title.trim().length) + (thread.tags?.length ?? 0) * 5));
  const engagement = (thread.score ?? thread.upvotes ?? 0) + (thread.comments ?? 0) * 2;
  const engagementVelocity = clamp((engagement / ageHours(thread)) * 4);
  const buyingMatches = text.match(/\b(buy|budget|price|pricing|cost|recommend|alternative|looking for|need|help|hire|subscription)\b/g)?.length ?? 0;
  const buyingIntent = clamp(buyingMatches * 22 + (text.includes("how do i") ? 8 : 0));
  const competition = clamp((thread.comments ?? 0) * 2 + Math.max(0, (thread.subscribers ?? 0) / 20_000));
  const total = clamp(relevance * 0.35 + engagementVelocity * 0.3 + buyingIntent * 0.25 + (100 - competition) * 0.1);
  return { relevance, engagementVelocity, buyingIntent, competition, total };
}

export function rankThreads(threads: Thread[]): RankedThread[] {
  return threads
    .map((thread) => ({ ...thread, opportunity: scoreOpportunity(thread) }))
    .sort((a, b) => b.opportunity.total - a.opportunity.total || a.title.localeCompare(b.title));
}

function queryMatches(thread: Thread, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.length === 0 || tokens.every((token) => textOf(thread).includes(token));
}

async function getJson(fetchFn: FetchFn, url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchFn(url, { headers: { "user-agent": "agentic-scout/0.1" } });
  } catch (error) {
    throw new VendorError(`search request failed for ${url}: ${String(error)}`, { cause: error });
  }
  if (!response.ok) throw new VendorError(`search request got status ${response.status} from ${url}`, { status: response.status });
  try { return await response.json(); } catch (error) {
    throw new VendorError(`search response was not JSON from ${url}`, { cause: error });
  }
}

async function reddit(query: string, fetchFn: FetchFn, subreddit?: string): Promise<Thread[]> {
  const where = subreddit ? `/r/${encodeURIComponent(subreddit)}` : "";
  const payload = await getJson(fetchFn, `https://www.reddit.com${where}/search.json?q=${encodeURIComponent(query)}&restrict_sr=${Boolean(subreddit)}&sort=relevance&t=month&limit=25`);
  const children = (payload as { data?: { children?: Array<{ data?: Record<string, unknown> }> } }).data?.children ?? [];
  return children.map(({ data = {} }) => ({
    id: String(data.id ?? data.name ?? ""), title: String(data.title ?? ""), body: typeof data.selftext === "string" ? data.selftext : undefined,
    url: `https://www.reddit.com${String(data.permalink ?? "")}`, source: "reddit", author: typeof data.author === "string" ? data.author : undefined,
    createdAt: typeof data.created_utc === "number" ? new Date(data.created_utc * 1000).toISOString() : undefined,
    score: typeof data.score === "number" ? data.score : undefined, comments: typeof data.num_comments === "number" ? data.num_comments : undefined,
    subscribers: typeof data.subreddit_subscribers === "number" ? data.subreddit_subscribers : undefined,
  }));
}

async function hackernews(query: string, fetchFn: FetchFn): Promise<Thread[]> {
  const payload = await getJson(fetchFn, `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=25`);
  const hits = (payload as { hits?: Array<Record<string, unknown>> }).hits ?? [];
  return hits.map((hit) => ({
    id: String(hit.objectID ?? ""), title: String(hit.title ?? hit.story_title ?? ""), body: typeof hit.comment_text === "string" ? hit.comment_text : undefined,
    url: String(hit.url ?? hit.story_url ?? `https://news.ycombinator.com/item?id=${String(hit.objectID ?? "")}`), source: "hackernews",
    author: typeof hit.author === "string" ? hit.author : undefined, createdAt: typeof hit.created_at === "string" ? hit.created_at : undefined,
    score: typeof hit.points === "number" ? hit.points : undefined, comments: typeof hit.num_comments === "number" ? hit.num_comments : undefined,
  }));
}

function stripTags(value: string): string { return value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim(); }
function tag(block: string, name: string): string | undefined {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? stripTags(match[1]) : undefined;
}
async function rss(query: string, fetchFn: FetchFn, rssUrl?: string): Promise<Thread[]> {
  if (!rssUrl) throw new VendorError("rss source needs a rssUrl option");
  let response: Response;
  try { response = await fetchFn(rssUrl); } catch (error) { throw new VendorError(`rss request failed for ${rssUrl}: ${String(error)}`, { cause: error }); }
  if (!response.ok) throw new VendorError(`rss request got status ${response.status} from ${rssUrl}`, { status: response.status });
  let xml: string;
  try { xml = await response.text(); } catch (error) { throw new VendorError(`rss response could not be read from ${rssUrl}`, { cause: error }); }
  return [...xml.matchAll(/<(item|entry)[^>]*>([\s\S]*?)<\/\1>/gi)].map((match, index) => {
    const block = match[2]; const title = tag(block, "title") ?? "Untitled";
    return { id: tag(block, "guid") ?? tag(block, "id") ?? `${rssUrl}#${index}`, title, body: tag(block, "description") ?? tag(block, "summary"), url: tag(block, "link") ?? rssUrl, source: "rss", createdAt: tag(block, "pubDate") ?? tag(block, "published") };
  }).filter((thread) => queryMatches(thread, query));
}

/** Search public sources. Supply fetchFn and fixtures in tests; adapters always throw VendorError on failure. */
export async function searchThreads(query: string, sources: ScoutSource[] = ["reddit", "hackernews"], options: SearchOptions = {}): Promise<Thread[]> {
  if (!query.trim()) throw new Error("query must not be empty");
  options.guards?.checkDispatch(query);
  const fetchFn = options.fetchFn ?? fetch;
  const all: Thread[] = [];
  for (const source of sources) {
    let found: Thread[];
    if (source === "fixture") found = (options.fixtures ?? []).filter((thread) => queryMatches(thread, query));
    else if (source === "reddit") found = await reddit(query, fetchFn, options.redditSubreddit);
    else if (source === "hackernews") found = await hackernews(query, fetchFn);
    else found = await rss(query, fetchFn, options.rssUrl);
    all.push(...found);
  }
  options.guards?.recordDispatch();
  options.logger?.info(`found ${all.length} threads for ${query}`);
  return all.slice(0, options.limit ?? 50);
}

/** Produce disclosed, draft-only content ideas from source threads. */
export function suggestIdeas(threads: Thread[]): IdeaCard[] {
  return rankThreads(threads).slice(0, 10).map((thread, index) => ({
    hook: `Why ${thread.title.replace(/[.?!]+$/, "")} is getting attention right now`,
    format: index % 2 === 0 ? "short video" : "carousel post",
    platform: thread.source === "hackernews" ? "LinkedIn" : "X",
    sourceThread: { id: thread.id, title: thread.title, url: thread.url, source: String(thread.source) },
    disclosure: "AI-assisted draft based on a public source thread; review facts and disclose AI assistance before publishing.",
  }));
}
