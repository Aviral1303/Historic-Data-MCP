import { getEnv, USER_AGENT } from "../config.js";
export async function groqSuggestUrls(params) {
    const apiKey = getEnv("GROQ_API_KEY");
    const max = Math.min(Math.max(params.max ?? 10, 1), 20);
    const model = process.env.GROQ_MODEL ?? "llama-3.1-70b-versatile";
    const system = [
        "You help find URLs that likely contain historical price trends for a product/category.",
        "Return strict JSON only, no extra text.",
        "JSON shape: {\"results\":[{\"url\":\"...\",\"title\":\"...\",\"rationale\":\"...\"}]}",
        "Prefer pages with explicit price history over years/months, reputable sources, news analyses, blogs with charts.",
        "Avoid irrelevant pages; no login walls when possible."
    ].join(" ");
    const user = `Query: ${params.query}\nReturn up to ${max} results.`;
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
        throw new Error(`Groq API error: ${res.status} ${res.statusText} ${body}`);
    }
    const data = (await res.json());
    const content = data.choices?.[0]?.message?.content ?? "";
    try {
        const parsed = JSON.parse(content);
        return (parsed.results ?? []).filter(r => !!r.url).slice(0, max);
    }
    catch {
        // Fallback: try to extract URLs via regex if JSON parse fails
        const urls = Array.from(content.matchAll(/https?:\/\/[^\s"'<>]+/g)).map(m => m[0]);
        return urls.slice(0, max).map(u => ({ url: u }));
    }
}
export async function groqAnalyzeSentiment(params) {
    const apiKey = getEnv("GROQ_API_KEY");
    const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
    const system = [
        "You are a market analyst. Analyze public sentiment regarding demand for the given topic.",
        "Return strictly a JSON object with fields:",
        "{ \"topic\": string, \"overallSentiment\": \"positive|negative|mixed|neutral\",",
        "\"demandLevel\": \"high|medium|low\" (optional), \"confidence\": number 0-1 (optional),",
        "\"timeWindow\": string (optional), \"keyDrivers\": string[] (optional),",
        "\"summary\": string, \"sources\": [{\"url\": string, \"note\"?: string}] (optional) }"
    ].join(" ");
    const user = `Topic: ${params.topic}\nBe concise but complete.`;
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
        throw new Error(`Groq API error: ${res.status} ${res.statusText} ${body}`);
    }
    const data = (await res.json());
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return parsed;
}
