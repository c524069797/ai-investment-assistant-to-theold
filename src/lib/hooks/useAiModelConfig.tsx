"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AI_MODEL_CONFIG_STORAGE_KEY,
  buildDefaultClientAiModelConfig,
  isCustomAiModelConfig,
  parseClientAiModelConfig,
  type ClientAiModelConfig,
} from "@/lib/ai/model-config";

interface AiModelConfigContextValue {
  config: ClientAiModelConfig;
  saveConfig: (config: ClientAiModelConfig) => void;
  resetConfig: () => void;
  hasCustomConfig: boolean;
}

const AiModelConfigContext = createContext<AiModelConfigContextValue>({
  config: buildDefaultClientAiModelConfig(),
  saveConfig: () => {},
  resetConfig: () => {},
  hasCustomConfig: false,
});

export function AiModelConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ClientAiModelConfig>(() => {
    const defaults = buildDefaultClientAiModelConfig();
    if (typeof window === "undefined") return defaults;

    try {
      const raw = window.localStorage.getItem(AI_MODEL_CONFIG_STORAGE_KEY);
      return raw ? parseClientAiModelConfig(JSON.parse(raw)) ?? defaults : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(AI_MODEL_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const saveConfig = useCallback((nextConfig: ClientAiModelConfig) => {
    setConfig(parseClientAiModelConfig(nextConfig) ?? buildDefaultClientAiModelConfig());
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(buildDefaultClientAiModelConfig());
  }, []);

  const value = useMemo(
    () => ({
      config,
      saveConfig,
      resetConfig,
      hasCustomConfig: isCustomAiModelConfig(config),
    }),
    [config, resetConfig, saveConfig],
  );

  return (
    <AiModelConfigContext.Provider value={value}>
      {children}
    </AiModelConfigContext.Provider>
  );
}

export function useAiModelConfig() {
  return useContext(AiModelConfigContext);
}
