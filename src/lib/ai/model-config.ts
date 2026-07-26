import { z } from "zod";

export const AI_MODEL_CONFIG_STORAGE_KEY = "ai-investment-assistant-ai-model-config";
export const DEFAULT_OPENAI_BASE_URL = "https://ai.huaibao.top/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-5.4";
export const DEFAULT_OPENAI_FALLBACK_MODEL = "gpt-5.4";

export const AI_PROVIDER_OPTIONS = [
  { label: "OpenAI Compatible", value: "openai" },
] as const;

const aiModelConfigSchema = z.object({
  provider: z.literal("openai").default("openai"),
  apiKey: z.string().trim().max(400).optional(),
  baseUrl: z.string().trim().max(500).optional(),
  model: z.string().trim().max(200).optional(),
  fallbackModel: z.string().trim().max(200).optional(),
});

export interface ClientAiModelConfig {
  provider: "openai";
  apiKey: string;
  baseUrl: string;
  model: string;
  fallbackModel: string;
}

export interface ResolvedAiModelConfig {
  provider: "openai";
  apiKey: string;
  baseUrl: string;
  model: string;
  fallbackModel?: string;
}

function cleanText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeBaseUrl(url?: string | null) {
  const normalized = cleanText(url);
  if (!normalized) {
    return DEFAULT_OPENAI_BASE_URL;
  }
  return normalized.replace(/\/$/, "");
}

export function buildDefaultClientAiModelConfig(): ClientAiModelConfig {
  return {
    provider: "openai",
    apiKey: "",
    baseUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL),
    model: cleanText(process.env.NEXT_PUBLIC_OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
    fallbackModel: cleanText(process.env.NEXT_PUBLIC_OPENAI_FALLBACK_MODEL) || DEFAULT_OPENAI_FALLBACK_MODEL,
  };
}

export function parseClientAiModelConfig(input: unknown): ClientAiModelConfig | null {
  const parsed = aiModelConfigSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }

  const defaults = buildDefaultClientAiModelConfig();

  return {
    provider: parsed.data.provider,
    apiKey: cleanText(parsed.data.apiKey),
    baseUrl: normalizeBaseUrl(parsed.data.baseUrl || defaults.baseUrl),
    model: cleanText(parsed.data.model) || defaults.model,
    fallbackModel: cleanText(parsed.data.fallbackModel) || defaults.fallbackModel,
  };
}

export function resolveServerAiModelConfig(override?: unknown): ResolvedAiModelConfig {
  const parsed = parseClientAiModelConfig(override);

  const apiKey = cleanText(parsed?.apiKey) || cleanText(process.env.OPENAI_API_KEY);
  const baseUrl = normalizeBaseUrl(parsed?.baseUrl || process.env.OPENAI_BASE_URL || process.env.NEXT_PUBLIC_OPENAI_BASE_URL);
  const model = cleanText(parsed?.model) || cleanText(process.env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
  const fallbackModel = cleanText(parsed?.fallbackModel)
    || cleanText(process.env.OPENAI_FALLBACK_MODEL)
    || DEFAULT_OPENAI_FALLBACK_MODEL;

  return {
    provider: "openai",
    apiKey,
    baseUrl,
    model,
    fallbackModel: fallbackModel || undefined,
  };
}

export function hasUsableAiModelConfig(config?: Pick<ResolvedAiModelConfig, "apiKey"> | null) {
  return Boolean(cleanText(config?.apiKey));
}

export function isCustomAiModelConfig(config: ClientAiModelConfig) {
  const defaults = buildDefaultClientAiModelConfig();
  return [
    config.apiKey !== defaults.apiKey,
    normalizeBaseUrl(config.baseUrl) !== normalizeBaseUrl(defaults.baseUrl),
    cleanText(config.model) !== cleanText(defaults.model),
    cleanText(config.fallbackModel) !== cleanText(defaults.fallbackModel),
  ].some(Boolean);
}
