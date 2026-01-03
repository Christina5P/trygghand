// Lätta, trygghetsfokuserade helpers för frontend/TS-projekt

export const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

export const uid = (len = 8) =>
  Math.random().toString(36).slice(2, 2 + Math.max(4, len));

export const formatDate = (iso?: string | number | Date, locale = "sv-SE", opts?: Intl.DateTimeFormatOptions) => {
  if (!iso) return "";
  const d = typeof iso === "string" || typeof iso === "number" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, opts);
};

export const formatPercent = (value: number | null | undefined, digits = 0) =>
  value == null || Number.isNaN(Number(value)) ? "–" : `${Number(value).toFixed(digits)}%`;

export const safeGet = (obj: any, path: string, fallback: any = undefined) => {
  try {
    return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj) ?? fallback;
  } catch {
    return fallback;
  }
};

export const debounce = <T extends (...args: any[]) => any>(fn: T, wait = 250) => {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

export const toCamelCase = (s: string) =>
  s.replace(/[_-][a-z]/gi, (m) => m.charAt(1).toUpperCase());

export const keysToCamel = (o: any): any => {
  if (Array.isArray(o)) return o.map(keysToCamel);
  if (o !== null && o.constructor === Object) {
    return Object.keys(o).reduce((acc: any, key: string) => {
      const v = o[key];
      acc[toCamelCase(key)] = keysToCamel(v);
      return acc;
    }, {});
  }
  return o;
};

// Valuation helpers
export const getCleanDescription = (analysis: string): string => {
  if (!analysis) return "";
  try {
    const parsed = typeof analysis === "string" ? JSON.parse(analysis) : analysis;
    return parsed?.analysis_result?.foremal_beskrivning ??
           parsed?.analysis_result?.motivering ??
           parsed?.foremal_beskrivning ??
           parsed?.motivering ??
           "";
  } catch {
    return "";
  }
};

export const getPriceLabel = (analysis: string): string | null => {
  if (!analysis) return null;
  try {
    const parsed = typeof analysis === "string" ? JSON.parse(analysis) : analysis;
    const min = parsed?.analysis_result?.varde_min_sek ?? parsed?.varde_min_sek ?? null;
    const max = parsed?.analysis_result?.varde_max_sek ?? parsed?.varde_max_sek ?? null;
    const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
    if (min && max) return `Värde: ${fmt(Number(min))} – ${fmt(Number(max))} kr`;
    if (min) return `Värde: ${fmt(Number(min))} kr`;
    return null;
  } catch {
    return null;
  }
};

export const normalizeCustomer = (raw: any) => {
  if (!raw) return raw;
  const n = keysToCamel(raw);
  n.isAdmin = raw.is_admin ?? raw.isAdmin ?? n.isAdmin ?? false;
  return n;
};

export async function fetchJSON(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? JSON.parse(text || "{}") : text;
  if (!res.ok) {
    const err = new Error(body?.message || res.statusText || "Network error");
    (err as any).status = res.status;
    (err as any).body = body;
    throw err;
  }
  return body;
}