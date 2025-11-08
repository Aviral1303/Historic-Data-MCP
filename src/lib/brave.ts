import { BRAVE_API_KEY, DEFAULT_COUNTRY, USER_AGENT } from "../config.js";

export type BraveWebResult = {
  title: string;
  url: string;
  description?: string;
};

type BraveResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
    }>;
  };
};

export async function braveWebSearch(params: {
  query: string;
  count?: number;
  offset?: number;
  country?: string;
}): Promise<BraveWebResult[]> {
  const apiKey = BRAVE_API_KEY();
  const count = Math.min(Math.max(params.count ?? 10, 1), 20);
  const offset = Math.min(Math.max(params.offset ?? 0, 0), 9);
  const country = params.country ?? DEFAULT_COUNTRY();
  const q = params.query;

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", q);
  url.searchParams.set("count", String(count));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("country", country);
  url.searchParams.set("freshness", "pd3y"); // last 3 years by default
  url.searchParams.set("spellcheck", "1");

  const res = await fetch(url, {
    headers: {
      "X-Subscription-Token": apiKey,
      "Accept": "application/json",
      "User-Agent": USER_AGENT()
    }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brave API error: ${res.status} ${res.statusText} ${body}`);
  }

  const data = (await res.json()) as BraveResponse;
  const results = data.web?.results ?? [];
  return results
    .filter(r => r.url && r.title)
    .map(r => ({
      title: r.title ?? "",
      url: r.url ?? "",
      description: r.description
    }));
}