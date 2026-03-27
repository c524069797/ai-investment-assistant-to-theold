export interface UserInvestmentProfileData {
  riskPreference: string;
  investmentStyle: string[];
  holdingPeriodPreference: string;
  preferredEvidence: string[];
  dislikedPatterns: string[];
  summary: string;
}

export interface WatchlistThesisData {
  code: string;
  market: number;
  type: string;
  name: string;
  watchReason: string;
  bullPoints: string[];
  bearPoints: string[];
  watchSignals: string[];
  invalidationConditions: string[];
  lastJudgement: string;
}

export interface AnalysisSnapshotData {
  code?: string;
  market?: number;
  type?: string;
  title: string;
  summary: string;
  bullPoints?: string[];
  bearPoints?: string[];
  keyChange?: string;
  confidence?: number | null;
  sourceType?: string;
}

export const RISK_PREFERENCE_OPTIONS = [
  { label: "保守型", value: "conservative" },
  { label: "平衡型", value: "balanced" },
  { label: "进取型", value: "aggressive" },
] as const;

export const INVESTMENT_STYLE_OPTIONS = [
  { label: "成长", value: "growth" },
  { label: "红利", value: "dividend" },
  { label: "低估值", value: "value" },
  { label: "事件驱动", value: "event-driven" },
  { label: "主题轮动", value: "thematic" },
  { label: "趋势跟随", value: "trend-following" },
] as const;

export const HOLDING_PERIOD_OPTIONS = [
  { label: "短线", value: "short-term" },
  { label: "波段", value: "swing" },
  { label: "中期", value: "mid-term" },
  { label: "长期", value: "long-term" },
] as const;

export const EVIDENCE_OPTIONS = [
  { label: "财报", value: "earnings" },
  { label: "订单", value: "orders" },
  { label: "政策", value: "policy" },
  { label: "资金面", value: "fund-flow" },
  { label: "估值", value: "valuation" },
  { label: "新闻催化", value: "news" },
] as const;

export const DISLIKED_PATTERN_OPTIONS = [
  { label: "纯题材炒作", value: "pure-theme-hype" },
  { label: "高波动小盘股", value: "high-volatility-small-caps" },
  { label: "无业绩支撑", value: "no-fundamental-support" },
  { label: "高位追涨", value: "chase-at-high" },
] as const;

export function createDefaultUserInvestmentProfile(): UserInvestmentProfileData {
  return {
    riskPreference: "balanced",
    investmentStyle: [],
    holdingPeriodPreference: "mid-term",
    preferredEvidence: [],
    dislikedPatterns: [],
    summary: "",
  };
}

export function createDefaultWatchlistThesis(code: string, market = 1, name = "", type = "stock"): WatchlistThesisData {
  return {
    code,
    market,
    type,
    name,
    watchReason: "",
    bullPoints: [],
    bearPoints: [],
    watchSignals: [],
    invalidationConditions: [],
    lastJudgement: "",
  };
}

export function normalizeStringList(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof input !== "string") {
    return [];
  }

  return input
    .split(/[\n,，、;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeOptionalText(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

export function extractStockCodeFromText(text: string) {
  const matched = text.match(/(?:^|\D)([036]\d{5})(?!\d)/);
  return matched?.[1] ?? "";
}

export function normalizeMatchText(text: string) {
  return text.replace(/\s+/g, "").toLowerCase();
}

export function summarizeAssistantText(text: string, maxLength = 180) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}…`;
}

export function mapInvestmentStyleLabel(value: string) {
  return INVESTMENT_STYLE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function mapRiskPreferenceLabel(value: string) {
  return RISK_PREFERENCE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function mapHoldingPeriodLabel(value: string) {
  return HOLDING_PERIOD_OPTIONS.find((item) => item.value === value)?.label ?? value;
}
