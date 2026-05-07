"use client";

import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAppTheme, type AppThemeMode } from "@/styles/theme";
import { UserProvider } from "@/lib/hooks/useUser";

// 这个 Provider 是前端技术栈的汇合点：
// - AntdRegistry：解决 Ant Design 在 Next.js App Router 下的 SSR 样式收集问题
// - ConfigProvider：统一主题 token、组件尺寸、中文 locale
// - React Context：管理字号和主题模式
// - UserProvider：在客户端缓存当前登录用户，避免每个组件重复请求

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
    // 同步到 html[data-theme]，让全局 CSS 和组件主题都能感知当前模式。
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
            {/*
              Antd 的 message / modal / notification 依赖 <App /> 作为宿主。
              UserProvider 放在这里，页面内所有 Client Component 都能直接拿到 currentUser。
            */}
            <App>
              <UserProvider>{children}</UserProvider>
            </App>
          </ConfigProvider>
        </AntdRegistry>
      </FontSizeContext.Provider>
    </ThemeModeContext.Provider>
  );
}
