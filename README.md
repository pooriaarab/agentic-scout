# Agentic scout

Find relevant threads and viral content ideas across social platforms.

Clone this repo to start a new pack. It gives one core with three
faces: a terminal command, an npm import, and an MCP server.

## What you get

- One core: brand config, logs, guards, routing, dry run, cost reports.
- Three faces over that core: CLI, library, MCP server.
- A frozen core contract, so packs share one API.
- A worker entry and a wrangler sample for edge deploys.
- Build, typecheck, and tests that pass from a fresh clone.

## Quick start

```sh
git clone https://github.com/pooriaarab/agentic-scout.git my-pack
cd my-pack
npm install
npm run build
npm run typecheck
npm test
```

Run the command:

```sh
node dist/cli.js summary --text "hello world hello"
```

Call the library:

```js
import { summarizeText } from "./dist/index.js";

console.log(summarizeText("hello world hello"));
```

Start the MCP server:

```sh
node dist/cli.js mcp
```

## Three usecases

1. You run one text summary from the terminal.
2. You import the summary function in a script.
3. You let an agent call the same function as an MCP tool.

## Clone checklist

This repo is a template. Replace each slot in each file that holds it.

- `agentic-scout`: the directory name, like `my-pack`.
- `agentic-scout`: the npm name, like `agentic-<block>` (bare name, never @pooriaarab/ scoped unless the brief says scoped).
- `agentic-scout`: the terminal command, like `my-pack`.
- `Find relevant threads and viral content ideas across social platforms.`: one plain sentence, under 100 chars.
- `social,discovery,trends,reddit,viral,agentic-suite,cli,mcp`: plain keywords, like `notes, search, cli`.
- `pooriaarab`: the repo owner, like `pooriaarab`.

Slot files: `AGENTS.md`, `SKILL.md`, `RULES.md`, `llms.txt`,
`server.json`, `.mcp.json`, `wrangler.jsonc`.

Then rename the scaffold identity itself:

- `package.json`: name, bin commands, mcpName. Remove `"private": true`.
- `src/index.ts`: the `DEFAULT_BRAND` fields.
- This file: the pitch and the examples above.

At publish time, set `server.json` version to the npm version and
`server.json` repository id from `gh api repos/OWNER/REPO --jq .id`.

## Gates

Run all three before you push a pack:

```sh
npm run build && npm run typecheck && npm test
```

Then run the real installed CLI once from a tarball:

```sh
npm pack
npx --yes --package ./pooriaarab-agentic-scout-0.1.0.tgz agentic-pack summary --text "hello"
```

## Release flow

Push to `main` for review. Merge to `release` to publish. The
publish workflow ships only when the version is new.

## Layout

- `src/index.ts`: the library face.
- `src/cli.ts`: the terminal face.
- `src/mcp.ts`: the MCP server. `src/mcp-bin.ts` starts it.
- `src/worker.ts`: the edge worker face.
- `src/core.ts`: the shared core.
- `agentic-core.d.ts`: the frozen contract.
- `docs/agentic-core.md`: the contract in plain words.

## License

MIT. See `LICENSE`.
