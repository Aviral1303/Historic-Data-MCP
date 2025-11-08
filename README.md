# Historic Price MCP Server

An MCP server that looks up historic price trends for user-specified products or categories using Groq-powered URL suggestions and page scraping, then returns a structured time series and a concise trend summary.

This project follows the structure of the Brave Search MCP server reference from dedalus-labs.

## Features

- URL discovery via Groq chat completions (OpenAI-compatible API)
- Optional page scraping to extract price and date mentions
- Heuristic parsing of prices and dates from snippets and HTML
- Aggregation into a deduplicated time series and trend summary

## Tools

- **price_trend_search**
  - Inputs:
    - `query` (string, required): Product/category query (e.g., "concert ticket for Shawn Mendes")
    - `maxResults` (number, optional, default 20): Max web results to examine (capped internally)
    - `country` (string, optional): Country code for search (e.g., "US")
  - Output: JSON with `series` (date/price points), `summary` (direction, change, currency), and `sources`.

- **scrape_price_from_url**
  - Inputs:
    - `url` (string, required): URL to scrape for price mentions and dates
  - Output: JSON with any extracted `series` and `meta`.

## Configuration

### Groq API Key

1. Obtain a Groq API key and set it as `GROQ_API_KEY` (see env example).
2. Optional: Set `GROQ_MODEL` (default: `llama-3.1-70b-versatile`) and `USER_AGENT`.

Create a local `.env` (or export env vars) based on `env.example`.

### NPX (Claude Desktop / VS Code)

Add this to your configuration:

```json
{
  "mcpServers": {
    "historic-price": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-historic-price"],
      "env": {
        "GROQ_API_KEY": "YOUR_API_KEY_HERE",
        "GROQ_MODEL": "llama-3.1-70b-versatile"
      }
    }
  }
}
```

### Docker

Build and run:

```bash
docker build -t mcp/historic-price:latest .
docker run -i --rm \
  -e GROQ_API_KEY="$GROQ_API_KEY" \
  -e GROQ_MODEL="llama-3.1-70b-versatile" \
  mcp/historic-price:latest
```

Configure your client to run the container command similarly to the Brave reference.

## Development

```bash
pnpm i # or npm i / bun i
pnpm dev
pnpm build && pnpm start
```

## License

MIT

## Reference

This implementation follows the structure and configuration patterns from the dedalus-labs Brave Search MCP server, replacing Brave search with Groq-assisted URL discovery.

