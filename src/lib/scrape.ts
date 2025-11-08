import { load } from "cheerio";
import { USER_AGENT, USE_JINA_READER } from "../config.js";
import type { PricePoint } from "../types.js";
import { extractFromSnippet } from "./extract.js";

export async function fetchHtml(url: string): Promise<string> {
  const headers = {
    "User-Agent": USER_AGENT(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/"
  };
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 1000) return text;
      }
      lastErr = new Error(`Fetch failed for ${url}: ${res.status}`);
    } catch (e) {
      lastErr = e as Error;
    }
    await new Promise(r => setTimeout(r, 300));
  }
  if (USE_JINA_READER()) {
    const proxyUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
    const res2 = await fetch(proxyUrl, { headers: { "User-Agent": USER_AGENT() } });
    if (res2.ok) {
      return await res2.text();
    }
  }
  throw lastErr ?? new Error(`Fetch failed for ${url}`);
}

export async function scrapePricesFromUrl(url: string): Promise<{ series: PricePoint[]; meta: Record<string, unknown> }> {
  const html = await fetchHtml(url);
  // If Jina returns plain text, skip cheerio and treat as text snippet
  if (!/^<!doctype html/i.test(html) && !/<html[\s>]/i.test(html)) {
    const text = html;
    const points = extractFromSnippet(text, { url });
    return { series: points, meta: {} };
  }
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
  $("p, li, h1, h2, h3, h4, td, th, caption").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length >= 10) textChunks.push(t);
  });
  const joined = textChunks.join(" • ");
  const points = extractFromSnippet(joined, { url, title });
  return { series: points, meta: { title, ...metas } };
}

