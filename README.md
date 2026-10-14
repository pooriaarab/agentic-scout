# agentic-scout

[![npm version](https://img.shields.io/npm/v/agentic-scout)](https://www.npmjs.com/package/agentic-scout)
[![Monthly downloads](https://img.shields.io/npm/dm/agentic-scout)](https://www.npmjs.com/package/agentic-scout)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](https://opensource.org/license/mit)

[Package](https://www.npmjs.com/package/agentic-scout) · [Source and support](https://github.com/pooriaarab/agentic-scout)

agentic-scout is an open-source thread discovery library for developers who research public conversations. It searches Reddit, Hacker News, and RSS feeds. Local scoring and fixed templates produce ranked threads and draft content ideas.

## Install

```sh
npm install agentic-scout
```

Requires Node.js 18 or later. Includes TypeScript declarations and two direct runtime dependencies.

## Find your first thread

Save this as `scout-demo.mjs`, then run `node scout-demo.mjs`. No credentials, environment variables, or `.env` loader are required.

```js
import { searchThreads, suggestIdeas, getCostReport } from "agentic-scout";

const threads = await searchThreads("Node.js", ["fixture"], {
  fixtures: [{
    id: "demo", title: "Node.js tools", source: "fixture",
    url: "https://nodejs.org/", score: 10, comments: 2,
  }],
});
console.log(threads.length, suggestIdeas(threads)[0].hook);
console.log(getCostReport());
```

Success prints `1 Why Node.js tools is getting attention right now` and an empty cost report.
Fixtures run locally. Calling `searchThreads` without source arguments immediately queries Reddit and Hacker News.

Preview a network search with the CLI:

```sh
npx agentic-scout search --query "Node.js" --platforms reddit,hackernews
```

This prints `dryRun: true` and `approvalRequired: true`. Add `--live` after approving network access yourself.

## How it works

```text
Query -> Reddit / Hacker News / RSS / fixtures
                         |
                    Thread records
                         |
                Heuristic opportunity scores
                         |
                 Ranked threads / draft ideas
```

## Why it exists

Developers can combine public thread retrieval and local scoring in their own applications. F5Bot provides keyword alerts; Feedly provides source-following workflows.
This package exposes programmable search results and draft ideas.

## Compare

Scope checked on 2026-10-14 against linked official documentation.

| Scope | agentic-scout | [F5Bot](https://f5bot.com/guides/hacker-news-keyword-alerts) | [Feedly](https://docs.feedly.com/article/768-follow-sources-in-feedly) |
| --- | --- | --- | --- |
| Workflow | On-demand search and local ranking | Keyword monitoring and email alerts | Follow research sources |
| Configuration | SDK arguments, CLI flags, MCP inputs | Keywords | Sources and feeds |
| Operation | User-run Node.js package | Service | Service |

## Coverage

| Source | Retrieval | Verification |
| --- | --- | --- |
| Reddit | ✓ Public search JSON | Live access pending |
| Hacker News via Algolia | ✓ Story search JSON | Live access pending |
| RSS feeds | ✓ Basic item/entry parser | Live feed access pending |
| Local fixtures | ✓ Supplied thread records | Local example verified |

The dispatcher implements four source paths: three network sources and one fixture path.
No credential-checked integrations are claimed. Network availability depends on the upstream endpoint.

## Common use cases

1. Node.js developers retrieve Hacker News stories for a research dashboard.
2. TypeScript teams rank supplied Reddit records with local heuristics.
3. MCP client users score threads before drafting content ideas.
4. RSS tool builders filter feed entries using a query in a Node.js script.

## Features

- **Search:** SDK options include a subreddit, RSS URL, result limit, fixtures, and injected fetch.
- **Scoring:** Scores cover title-based relevance, engagement velocity, buying-intent terms, and competition.
- **Ranking:** Total score orders supplied records; titles break ties.
- **Ideas:** Up to ten template-based cards include source links and disclosure text.
- **Utilities:** Shared SDK helpers provide text statistics, guards, local routing, and HTTP routing.

## Runtime surfaces

The Node.js SDK exports `searchThreads`, `scoreOpportunity`, `rankThreads`, and `suggestIdeas`, plus shared core utilities.

Seven CLI commands: `search`, `trends`, `ideas`, `summary`, `dispatch`, `costs`, and `mcp`.
Use `--help` or `-h` for help; `--version` or `-V` prints the version.
Search and ideas require `--query`; trends uses the fixed query `trending`.
Search commands accept `--platforms`, `--dry-run`, and `--live`.
Summary accepts `--text` and `--top`; dispatch accepts `--text` and `--dry-run`.

```sh
npx agentic-scout mcp
```

Seven MCP tools: `summarize_text`, `dispatch_text`, `score_opportunity`, `rank_threads`, `suggest_ideas`, `search_threads`, and `get_cost_report`.
MCP network search requires both `live: true` and `approved: true`.

A repository Worker handler provides `GET /health` and POST routes `/summarize`, `/score`, `/rank`, and `/ideas`.
Users deploy that source themselves. It is not a managed endpoint or package export.

## Delivery and behavior limits

Search has no pagination, retries, built-in timeout, cache, or deduplication. Sources run sequentially; a failure stops the whole search.
Reddit and Hacker News requests each ask for 25 records. The combined default limit is 50.
RSS uses a basic regular-expression parser; it does not fully implement RSS or Atom.

Relevance uses title length and tags, rather than similarity to the search query. Scores do not establish buying intent or predict virality.
Idea generation uses fixed templates without a model API. LinkedIn and X (Twitter) are idea labels, not publishing integrations.

The CLI accepts RSS but cannot supply `rssUrl`; use the SDK or MCP for feeds.
The CLI accepts `--file`, but its default reader is absent. Use `--text` for statistics and local dispatch.
CLI live search needs `--live`; there is no separate approval flag. SDK searches perform network calls directly.

Local dispatch produces receipts without external delivery. Generic SDK HTTP routing has a ten-second default timeout and no retries.
Cost reports store process-local dispatch units, not billing totals. Searches do not record costs.

## Integration guides

Use the fixture quickstart for offline applications. For RSS, pass `sources: ["rss"]` and `rssUrl` to the MCP search tool.
In the SDK, use `searchThreads(query, ["rss"], { rssUrl })`.
No public documentation site is configured in the repository metadata.

## Status

Version 0.1.0 is an early release; interfaces can change. Report issues through [GitHub support](https://github.com/pooriaarab/agentic-scout/issues).
Public case studies are not yet published in this repository.
Review source facts and draft disclosures before publishing content.

## FAQ

### What is agentic-scout?

agentic-scout is a public thread search and ranking library. It also creates template-based content idea cards.

### Which integrations are verified?

agentic-scout implements Reddit, Hacker News via Algolia, RSS, and fixtures. The local fixture example is verified; live endpoint access is pending.

### Does agentic-scout provide a managed monitoring service?

agentic-scout runs in your own process. It does not provide scheduled monitoring or managed alerts.

### How is agentic-scout different from F5Bot?

agentic-scout exposes on-demand search and local ranking. [F5Bot](https://f5bot.com/guides/hacker-news-keyword-alerts) monitors keywords and emails alerts.

### How is agentic-scout different from Feedly?

agentic-scout returns thread records through a developer API. [Feedly](https://docs.feedly.com/article/768-follow-sources-in-feedly) offers source-following workflows.

### Does it guarantee viral ideas?

agentic-scout makes no virality prediction. Its scores are heuristics and its ideas are fixed templates.

### Does search run in dry-run mode?

agentic-scout CLI search previews by default, while SDK search runs directly. MCP search requires explicit live and approval inputs.

### Does it publish to LinkedIn or X?

agentic-scout uses LinkedIn and X as idea labels. It has no social publishing adapters.

## License

MIT.
