import { getEnv, USER_AGENT } from "../config.js";

export type GroqUrlSuggestion = {
  url: string;
  title?: string;
  rationale?: string;
};

type GroqChatResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

export async function groqSuggestUrls(params: {
  query: string;
  max?: number;
}): Promise<GroqUrlSuggestion[]> {
  const apiKey = getEnv("GROQ_API_KEY");
  const max = Math.min(Math.max(params.max ?? 10, 1), 20);
  const modelPrimary = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
  const modelFallback = "openai/gpt-oss-20b";

  const system = [
    "You help find URLs that likely contain historical price trends for a product/category.",
    "Return strict JSON only, no extra text.",
    "JSON shape: {\"results\":[{\"url\":\"...\",\"title\":\"...\",\"rationale\":\"...\"}]}",
    "Prefer pages with explicit year-by-year prices, charts, or 'price history' tables.",
    "Good keywords: 'price history', 'historical price', 'by year', 'chart', 'average ticket price by year'.",
    "Avoid paywalled or login-only sources like Statista, Ticketmaster account-only, Songkick sign-in pages.",
    "Prefer extractable sources like CNET, MacRumors, The Verge, Tom's Hardware, Macworld, Investopedia, KBB, PriceCharting, manufacturer and reputable blogs."
  ].join(" ");

  const user = `Query: ${params.query}\nReturn up to ${max} results.`;

  async function callModel(model: string): Promise<GroqChatResponse> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT()
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // If model is decommissioned or invalid, try fallback once
      if (/decommissioned|no longer supported|invalid model/i.test(body) && model !== modelFallback) {
        return await callModel(modelFallback);
      }
      throw new Error(`Groq API error: ${res.status} ${res.statusText} ${body}`);
    }
    return (await res.json()) as GroqChatResponse;
  }

  const data = await callModel(modelPrimary);
  const content = data.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(content) as { results?: GroqUrlSuggestion[] };
    return (parsed.results ?? []).filter(r => !!r.url).slice(0, max);
  } catch {
    // Fallback: try to extract URLs via regex if JSON parse fails
    const urls = Array.from(content.matchAll(/https?:\/\/[^\s"'<>]+/g)).map(m => m[0]);
    return urls.slice(0, max).map(u => ({ url: u }));
  }
}

export type GroqSentiment = {
  topic: string;
  overallSentiment: "positive" | "negative" | "mixed" | "neutral";
  demandLevel?: "high" | "medium" | "low";
  confidence?: number;
  timeWindow?: string;
  keyDrivers?: string[];
  summary: string;
  sources?: Array<{ url: string; note?: string }>;
};

export async function groqAnalyzeSentiment(params: {
  topic: string;
}): Promise<GroqSentiment> {
  const apiKey = getEnv("GROQ_API_KEY");
  const modelPrimary = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
  const modelFallback = "openai/gpt-oss-20b";
  const system = [
    "You are a market analyst. Analyze public sentiment regarding demand for the given topic.",
    "Return strictly a JSON object with fields:",
    "{ \"topic\": string, \"overallSentiment\": \"positive|negative|mixed|neutral\",",
    "\"demandLevel\": \"high|medium|low\" (optional), \"confidence\": number 0-1 (optional),",
    "\"timeWindow\": string (optional), \"keyDrivers\": string[] (optional),",
    "\"summary\": string, \"sources\": [{\"url\": string, \"note\"?: string}] (optional) }"
  ].join(" ");
  const user = `Topic: ${params.topic}\nBe concise but complete.`;
  async function callModel(model: string): Promise<GroqChatResponse> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT()
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (/decommissioned|no longer supported|invalid model/i.test(body) && model !== modelFallback) {
        return await callModel(modelFallback);
      }
      throw new Error(`Groq API error: ${res.status} ${res.statusText} ${body}`);
    }
    return (await res.json()) as GroqChatResponse;
  }
  const data = await callModel(modelPrimary);
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as GroqSentiment;
  return parsed;
}

