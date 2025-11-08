# MCP: Historic Price Server

Server Name: `historic-price`

## Tools

### price_trend_search
Searches the web for historic price signals related to a product/category.
- Inputs:
  - `query` (string): e.g., "concert ticket for Shawn Mendes"
  - `maxResults` (number, optional): default 20
  - `country` (string, optional): e.g., "US"
- Returns:
  - `series`: Array of `{ date, price, currency, sourceUrl, title, snippet }`
  - `summary`: `{ currency, start, end, absoluteChange, pctChange, direction }`
  - `sources`: Array of `{ url, title }`

### scrape_price_from_url
Scrapes a specific URL for price/date mentions.
- Inputs:
  - `url` (string): page URL
- Returns:
  - `series`: extracted time series if available
  - `meta`: extracted page metadata where possible

## Environment
Required:
- `BRAVE_API_KEY`

Optional:
- `DEFAULT_COUNTRY` (default: `US`)
- `USER_AGENT`

## Transport
Runs over stdio; see README for Docker and NPX usage and examples.

