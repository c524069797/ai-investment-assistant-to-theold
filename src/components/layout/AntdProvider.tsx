"use client";

import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAppTheme, type AppThemeMode } from "@/styles/theme";
import { UserProvider } from "@/lib/hooks/useUser";

interface FontSizeContextValue {
  fontSize: number;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
}

interface ThemeModeContextValue {
  mode: AppThemeMode;
  toggleMode: () => void;
  setMode: (mode: AppThemeMode) => void;
}

const FontSizeContext = createContext<FontSizeContextValue>({
  fontSize: 18,
  increase: () => {},
  decrease: () => {},
  reset: () => {},
});

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: "tech-light",
  toggleMode: () => {},
  setMode: () => {},
});

export const useFontSize = () => useContext(FontSizeContext);
export const useThemeMode = () => useContext(ThemeModeContext);

const FONT_SIZES = [14, 16, 18, 20, 22] as const;
const THEME_STORAGE_KEY = "ai-investment-assistant-theme-mode";

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  const [fontIndex, setFontIndex] = useState(2);
  const [mode, setModeState] = useState<AppThemeMode>(() => {
    if (typeof window === "undefined") return "tech-light";

    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "tech-light" || saved === "tech-dark") return saved;

    return "tech-light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  const increase = useCallback(() => {
    setFontIndex((i) => Math.min(i + 1, FONT_SIZES.length - 1));
  }, []);

  const decrease = useCallback(() => {
    setFontIndex((i) => Math.max(i - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setFontIndex(2);
  }, []);

  const setMode = useCallback((nextMode: AppThemeMode) => {
    setModeState(nextMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => (current === "tech-light" ? "tech-dark" : "tech-light"));
  }, []);

  const fontSize = FONT_SIZES[fontIndex];
  const theme = useMemo(() => getAppTheme(mode, fontSize), [mode, fontSize]);

  const fontSizeValue = useMemo(
    () => ({ fontSize, increase, decrease, reset }),
    [fontSize, increase, decrease, reset],
  );

  const themeModeValue = useMemo(
    () => ({ mode, toggleMode, setMode }),
    [mode, toggleMode, setMode],
  );

  return (
    <ThemeModeContext.Provider value={themeModeValue}>
      <FontSizeContext.Provider value={fontSizeValue}>
        <AntdRegistry>
          <ConfigProvider theme={theme} locale={zhCN}>
            <App>
              <UserProvider>{children}</UserProvider>
            </App>
          </ConfigProvider>
        </AntdRegistry>
      </FontSizeContext.Provider>
    </ThemeModeContext.Provider>
  );
}
