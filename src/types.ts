export type PricePoint = {
  date: string; // ISO date or YYYY-MM-DD
  price: number;
  currency?: string;
  sourceUrl: string;
  title?: string;
  snippet?: string;
};

export type TrendSummary = {
  currency?: string;
  start?: number;
  end?: number;
  absoluteChange?: number;
  pctChange?: number;
  direction?: "increase" | "decrease" | "flat" | "unknown";
};

export type TrendResult = {
  series: PricePoint[];
  summary: TrendSummary;
  sources: { url: string; title?: string }[];
};

