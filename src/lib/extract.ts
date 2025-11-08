import type { PricePoint, TrendResult, TrendSummary } from "../types.js";

const currencySymbols = ["$", "£", "€", "₹", "¥", "A$", "C$", "₩"];
const currencyCodes = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "KRW"];

const priceRegex = new RegExp(
  [
    `(?:${currencySymbols.map(s => escapeRegex(s)).join("|")})\\s?\\d{1,3}(?:[\\,\\.\\s]\\d{3})*(?:[\\.,]\\d{1,2})?`,
    `\\d{1,3}(?:[\\,\\.\\s]\\d{3})*(?:[\\.,]\\d{1,2})?\\s?(?:${currencyCodes.join("|")})`
  ].join("|"),
  "gi"
);

const yearRegex = /\b(20\d{2}|19\d{2})\b/g;
const monthNames =
  "january,february,march,april,may,june,july,august,september,october,november,december".split(",");
const monthRegex =
  new RegExp(`\\b(?:${monthNames.join("|")})\\b`, "gi");
const monthYearRegex =
  new RegExp(`\\b(?:${monthNames.join("|")})\\s+(20\\d{2}|19\\d{2})\\b`, "gi");

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function symbolToCode(sym: string): string | undefined {
  switch (sym) {
    case "$":
      return "USD";
    case "£":
      return "GBP";
    case "€":
      return "EUR";
    case "₹":
      return "INR";
    case "¥":
      return "JPY";
    case "A$":
      return "AUD";
    case "C$":
      return "CAD";
    case "₩":
      return "KRW";
    default:
      return undefined;
  }
}

function parsePrice(raw: string): { price: number; currency?: string } | undefined {
  let currency: string | undefined;
  for (const sym of currencySymbols) {
    if (raw.includes(sym)) {
      currency = symbolToCode(sym);
      break;
    }
  }
  for (const code of currencyCodes) {
    if (raw.toUpperCase().includes(code)) {
      currency = code;
      break;
    }
  }
  const numeric = raw
    .replace(/[^\d.,]/g, "")
    .replace(/\s/g, "")
    // Heuristic: if both comma and dot present, assume comma thousand sep, dot decimal
    .replace(/(\d),(\d{3}\b)/g, "$1$2");
  const normalized = numeric.includes(".")
    ? numeric.replace(/,/g, "")
    : numeric.replace(/\./g, "").replace(/,/g, ".");
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return undefined;
  return { price: n, currency };
}

function monthToNumber(m: string): number {
  const idx = monthNames.findIndex(x => x === m.toLowerCase());
  return idx >= 0 ? idx + 1 : 1;
}

function firstDateFrom(text: string): string | undefined {
  // Prefer Month YYYY, else bare year
  const my = [...text.matchAll(monthYearRegex)][0];
  if (my) {
    const month = (my[0].split(/\s+/)[0] ?? "") as string;
    const year = my[1] as string;
    const mm = String(monthToNumber(month)).padStart(2, "0");
    return `${year}-${mm}-01`;
  }
  const y = [...text.matchAll(yearRegex)][0];
  if (y) return `${y[0]}-01-01`;
  return undefined;
}

export function extractFromSnippet(snippet: string, base: { url: string; title?: string }): PricePoint[] {
  const prices = [...snippet.matchAll(priceRegex)].map(m => m[0]);
  const date = firstDateFrom(snippet);
  const points: PricePoint[] = [];
  for (const raw of prices) {
    const parsed = parsePrice(raw);
    if (!parsed) continue;
    points.push({
      date: date ?? new Date().toISOString().slice(0, 10),
      price: parsed.price,
      currency: parsed.currency,
      sourceUrl: base.url,
      title: base.title,
      snippet
    });
  }
  return points;
}

export function aggregateSeries(points: PricePoint[]): PricePoint[] {
  // Deduplicate by date+price+url, keep earliest per date
  const key = (p: PricePoint) => `${p.date}|${p.price}|${p.sourceUrl}`;
  const map = new Map<string, PricePoint>();
  for (const p of points) {
    const k = key(p);
    if (!map.has(k)) {
      map.set(k, p);
    }
  }
  const series = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  return series;
}

export function summarizeSeries(series: PricePoint[]): TrendSummary {
  if (series.length === 0) return { direction: "unknown" };
  const first = series[0]!;
  const last = series[series.length - 1]!;
  const start = first.price;
  const end = last.price;
  const absoluteChange = end - start;
  const pctChange = start !== 0 ? (absoluteChange / start) * 100 : undefined;
  let direction: TrendSummary["direction"] = "flat";
  if (pctChange === undefined) {
    direction = "unknown";
  } else if (Math.abs(pctChange) < 1e-2) {
    direction = "flat";
  } else {
    direction = pctChange > 0 ? "increase" : "decrease";
  }
  const currency = last.currency ?? first.currency;
  return {
    currency,
    start,
    end,
    absoluteChange,
    pctChange: pctChange !== undefined ? Number(pctChange.toFixed(2)) : undefined,
    direction
  };
}

export function buildTrend(points: PricePoint[]): TrendResult {
  const series = aggregateSeries(points);
  const summary = summarizeSeries(series);
  const sources = [...new Map(series.map(p => [p.sourceUrl, { url: p.sourceUrl, title: p.title }])).values()];
  return { series, summary, sources };
}

