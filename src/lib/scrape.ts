import { load } from "cheerio";
import { USER_AGENT } from "../config.js";
import type { PricePoint } from "../types.js";
import { extractFromSnippet } from "./extract.js";

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT(),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });
  if (!res.ok) throw new Error(`Fetch failed for ${url}: ${res.status}`);
  return await res.text();
}

export async function scrapePricesFromUrl(url: string): Promise<{ series: PricePoint[]; meta: Record<string, unknown> }> {
  const html = await fetchHtml(url);
  const $ = load(html);
  const title = $("title").first().text().trim();
  const metas: Record<string, unknown> = {};
  $('meta').each((_, el) => {
    const name = $(el).attr("name") ?? $(el).attr("property");
    const content = $(el).attr("content");
    if (name && content) {
      if (name.toLowerCase().includes("published") || name.toLowerCase().includes("date")) {
        metas[name] = content;
      }
    }
  });
  const textChunks: string[] = [];
  $("p, li, h1, h2, h3, h4").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length >= 10) textChunks.push(t);
  });
  const joined = textChunks.join(" • ");
  const points = extractFromSnippet(joined, { url, title });
  return { series: points, meta: { title, ...metas } };
}

