export function getEnv(name, fallback) {
    const value = process.env[name] ?? fallback;
    if (value === undefined) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
export const BRAVE_API_KEY = () => getEnv("BRAVE_API_KEY");
export const DEFAULT_COUNTRY = () => process.env.DEFAULT_COUNTRY ?? "US";
export const USER_AGENT = () => process.env.USER_AGENT ?? "HistoricPriceMCP/0.1 (+https://github.com/dedalus-labs)";
export const GROQ_MAX_CONCURRENCY = () => {
    const raw = process.env.GROQ_MAX_CONCURRENCY;
    const n = raw ? Number.parseInt(raw, 10) : 2;
    return Number.isFinite(n) && n > 0 ? n : 2;
};
