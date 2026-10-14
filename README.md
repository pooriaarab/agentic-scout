# Agentic Scout

Find relevant public threads and create viral content ideas.

## Install and run

```sh
npm install
npm run build
node dist/cli.js scout search --query "AI agents"
```

The CLI defaults to a safe dry run. Use `--live` only after explicit approval:

```sh
node dist/cli.js search --query "AI agents" --platforms reddit,hackernews --live
node dist/cli.js ideas --query "AI agents" --live
```

## Library

```ts
import { searchThreads, rankThreads, suggestIdeas } from "agentic-scout";
const threads = await searchThreads("AI agents", ["reddit", "hackernews"]);
const ranked = rankThreads(threads);
const ideas = suggestIdeas(ranked); // includes AI disclosure text
```

`searchThreads` supports Reddit public JSON, Hacker News Algolia, RSS (pass `rssUrl`), and deterministic local fixtures. Inject `fetchFn` in tests; adapter failures throw `VendorError`.

## MCP

Run `node dist/cli.js mcp`. Tools mirror the library: `search_threads`, `score_opportunity`, `rank_threads`, `suggest_ideas`, and `get_cost_report`. MCP live search requires both `live: true` and `approved: true`; otherwise it returns a dry-run/guard response.

Only use accounts and sources you are authorized to use. Review AI-assisted drafts and retain the included disclosure before publishing.
