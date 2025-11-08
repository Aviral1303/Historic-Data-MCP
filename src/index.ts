import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import http from "node:http";
import { URL } from "node:url";
import { buildTrend } from "./lib/extract.js";
import { scrapePricesFromUrl } from "./lib/scrape.js";
import { z } from "zod";
import type { PricePoint, TrendResult } from "./types.js";
import { groqSuggestUrls, groqAnalyzeSentiment } from "./lib/groq.js";
import pLimit from "p-limit";
import { GROQ_MAX_CONCURRENCY } from "./config.js";

const mcp = new McpServer({ name: "historic-price", version: "0.1.0" });

mcp;
const PricePointShape = {
  date: z.string(),
  price: z.number(),
  currency: z.string().optional(),
  sourceUrl: z.string(),
  title: z.string().optional(),
  snippet: z.string().optional()
} as const;

const TrendSummaryShape = {
  currency: z.string().optional(),
  start: z.number().optional(),
  end: z.number().optional(),
  absoluteChange: z.number().optional(),
  pctChange: z.number().optional(),
  direction: z.enum(["increase", "decrease", "flat", "unknown"]).optional()
} as const;

const TrendResultShape = {
  series: z.array(z.object(PricePointShape)),
  summary: z.object(TrendSummaryShape),
  sources: z.array(z.object({ url: z.string(), title: z.string().optional() }))
} as const;

mcp;
const SentimentShape = {
  topic: z.string(),
  overallSentiment: z.enum(["positive", "negative", "mixed", "neutral"]),
  demandLevel: z.enum(["high", "medium", "low"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  timeWindow: z.string().optional(),
  keyDrivers: z.array(z.string()).optional(),
  summary: z.string(),
  sources: z.array(z.object({ url: z.string(), note: z.string().optional() })).optional()
} as const;

mcp.registerTool(
  "price_trend_search",
  {
    title: "Price Trend Search",
    description: "Search the web for historic price signals and return a time series and summary.",
    inputSchema: {
      query: z.string().min(2).describe("Product/category query, e.g., 'concert ticket for Shawn Mendes'."),
      maxResults: z.number().int().positive().max(50).optional().describe("Max results to analyze (default 20, max 50)."),
      country: z.string().length(2).optional().describe("Two-letter country code, e.g., 'US'.")
    },
    outputSchema: TrendResultShape
  },
  async (args) => {
    const { query, maxResults = 20 } = args;
    const maxSites = Math.min(maxResults, 8);
    const suggestions = await groqSuggestUrls({ query, max: maxSites });
    const limit = pLimit(GROQ_MAX_CONCURRENCY());
    const allPoints: PricePoint[] = [];
    const scrapeTasks = suggestions.map(s => limit(async () => {
      try {
        const { series } = await scrapePricesFromUrl(s.url);
        allPoints.push(...series);
      } catch {
        // ignore individual failures
      }
    }));
    await Promise.all(scrapeTasks);

    const trend: TrendResult = buildTrend(allPoints);
    return {
      content: [{ type: "text", text: "price_trend_search completed" }],
      structuredContent: trend
    };
  }
);

mcp;
mcp;
mcp;
mcp.registerTool(
  "scrape_price_from_url",
  {
    title: "Scrape Price From URL",
    description: "Scrape a specified URL for price/date mentions to build a time series.",
    inputSchema: {
      url: z.string().url().describe("Page URL to scrape for price history.")
    },
    outputSchema: {
      ...TrendResultShape,
      meta: z.record(z.unknown())
    }
  },
  async (args) => {
    const { url } = args;
    const { series, meta } = await scrapePricesFromUrl(url);
    const trend = buildTrend(series);
    return {
      content: [{ type: "text", text: "scrape_price_from_url completed" }],
      structuredContent: { ...trend, meta }
    };
  }
);

mcp.registerTool(
  "sentiment_demand_analysis",
  {
    title: "Sentiment Demand Analysis",
    description: "Analyze public sentiment of demand for a topic using Groq and return a structured summary.",
    inputSchema: {
      topic: z.string().min(2).describe("Topic to analyze, e.g., 'Travis Scott concert tickets'.")
    },
    outputSchema: SentimentShape
  },
  async (args) => {
    const { topic } = args;
    const sentiment = await groqAnalyzeSentiment({ topic });
    return {
      content: [{ type: "text", text: `sentiment_demand_analysis completed for: ${topic}` }],
      structuredContent: sentiment
    };
  }
);

// Connect transport: prefer HTTP if requested (for dedalus-labs deployment)
const useHttp = process.env.MCP_HTTP === "1" || !!process.env.PORT;
if (useHttp) {
  const port = Number(process.env.PORT ?? 3000);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
  await mcp.connect(transport);
  // Minimal HTTP server that routes /mcp to the transport and serves a health check
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      if (url.pathname === "/healthz") {
        res.statusCode = 200;
        res.setHeader("content-type", "text/plain");
        res.end("ok");
        return;
      }
      if (url.pathname === "/mcp" || url.pathname === "/") {
        let parsedBody: unknown = undefined;
        if (req.method === "POST") {
          // Collect body for JSON POST
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on("data", (c) => chunks.push(Buffer.from(c)));
            req.on("end", () => resolve());
            req.on("error", reject);
          });
          const raw = Buffer.concat(chunks).toString("utf8");
          const ct = (req.headers["content-type"] ?? "").toString();
          if (ct.includes("application/json") && raw) {
            try {
              parsedBody = JSON.parse(raw);
            } catch {
              // fallthrough; transport will handle error
              parsedBody = undefined;
            }
          }
        }
        // Ensure Accept header includes both types expected by transport
        const accept = (req.headers["accept"] ?? "").toString();
        const neededJson = "application/json";
        const neededSse = "text/event-stream";
        if (!accept.includes(neededJson) || !accept.includes(neededSse)) {
          req.headers["accept"] = [neededJson, neededSse].join(", ");
        }
        await transport.handleRequest(req as any, res as any, parsedBody);
        return;
      }
      res.statusCode = 404;
      res.end("Not Found");
    } catch (err) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`MCP Streamable HTTP server listening on :${port}`);
  });
} else {
  await mcp.connect(new StdioServerTransport());
}

