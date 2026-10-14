---
name: agentic-scout
description: Find relevant threads and viral content ideas across social platforms. Keywords: social,discovery,trends,reddit,viral,agentic-suite,cli,mcp.
---

# agentic-scout

Find relevant threads and viral content ideas across social platforms.

## Use the SDK

```js
import { summarizeText, dispatchText } from "agentic-scout";

summarizeText("some text");
await dispatchText("some text", { dryRun: true });
```

## Use the CLI

```sh
agentic-scout summary --text "some text"
agentic-scout dispatch --text "some text" --dry-run
```

## Use the MCP server

Start the server with `agentic-scout mcp`. Call `summarize_text`
for stats, `dispatch_text` for routes, `get_cost_report` for costs.

## Rules

- Preview each route with dry run first.
- Report guard denials and adapter errors as failures.
- Read the cost report at the end.
