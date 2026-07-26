import { describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  NEXT_PUBLIC_OPENAI_BASE_URL: "https://default.gateway/v1/",
  NEXT_PUBLIC_OPENAI_MODEL: "default-model",
  NEXT_PUBLIC_OPENAI_FALLBACK_MODEL: "default-fallback",
  OPENAI_API_KEY: "server-key",
  OPENAI_BASE_URL: "https://server.gateway/v1/",
  OPENAI_MODEL: "server-model",
  OPENAI_FALLBACK_MODEL: "server-fallback",
}));

vi.stubEnv("NEXT_PUBLIC_OPENAI_BASE_URL", env.NEXT_PUBLIC_OPENAI_BASE_URL);
vi.stubEnv("NEXT_PUBLIC_OPENAI_MODEL", env.NEXT_PUBLIC_OPENAI_MODEL);
vi.stubEnv("NEXT_PUBLIC_OPENAI_FALLBACK_MODEL", env.NEXT_PUBLIC_OPENAI_FALLBACK_MODEL);
vi.stubEnv("OPENAI_API_KEY", env.OPENAI_API_KEY);
vi.stubEnv("OPENAI_BASE_URL", env.OPENAI_BASE_URL);
vi.stubEnv("OPENAI_MODEL", env.OPENAI_MODEL);
vi.stubEnv("OPENAI_FALLBACK_MODEL", env.OPENAI_FALLBACK_MODEL);

import {
  buildDefaultClientAiModelConfig,
  hasUsableAiModelConfig,
  normalizeBaseUrl,
  parseClientAiModelConfig,
  resolveServerAiModelConfig,
} from "./model-config";

describe("src/lib/ai/model-config.ts", () => {
  it("normalizes trailing slash in base url", () => {
    expect(normalizeBaseUrl("https://example.com/v1/")).toBe("https://example.com/v1");
  });

  it("fills missing client fields with defaults", () => {
    expect(parseClientAiModelConfig({ apiKey: " sk-user " })).toEqual({
      provider: "openai",
      apiKey: "sk-user",
      baseUrl: "https://default.gateway/v1",
      model: "default-model",
      fallbackModel: "default-fallback",
    });
  });

  it("prefers user config over server env", () => {
    expect(resolveServerAiModelConfig({
      apiKey: "custom-key",
      baseUrl: "https://custom.gateway/v1/",
      model: "custom-model",
      fallbackModel: "custom-fallback",
    })).toEqual({
      provider: "openai",
      apiKey: "custom-key",
      baseUrl: "https://custom.gateway/v1",
      model: "custom-model",
      fallbackModel: "custom-fallback",
    });
  });

  it("falls back to server env when client key is empty", () => {
    expect(resolveServerAiModelConfig(buildDefaultClientAiModelConfig())).toEqual({
      provider: "openai",
      apiKey: "server-key",
      baseUrl: "https://default.gateway/v1",
      model: "default-model",
      fallbackModel: "default-fallback",
    });
  });

  it("detects whether an api key is available", () => {
    expect(hasUsableAiModelConfig({ apiKey: "abc" })).toBe(true);
    expect(hasUsableAiModelConfig({ apiKey: "" })).toBe(false);
  });
});
