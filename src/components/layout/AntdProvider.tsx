"use client";

import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { elderlyTheme } from "@/styles/theme";
import type { ThemeConfig } from "antd";

interface FontSizeContextValue {
  fontSize: number;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
}

const FontSizeContext = createContext<FontSizeContextValue>({
  fontSize: 18,
  increase: () => {},
  decrease: () => {},
  reset: () => {},
});

export const useFontSize = () => useContext(FontSizeContext);

const FONT_SIZES = [14, 16, 18, 20, 22] as const;

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  const [fontIndex, setFontIndex] = useState(2); // default 18px

  const increase = useCallback(() => {
    setFontIndex((i) => Math.min(i + 1, FONT_SIZES.length - 1));
  }, []);

  const decrease = useCallback(() => {
    setFontIndex((i) => Math.max(i - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setFontIndex(2);
  }, []);

  const fontSize = FONT_SIZES[fontIndex];

  const theme: ThemeConfig = useMemo(
    () => ({
      ...elderlyTheme,
      token: {
        ...elderlyTheme.token,
        fontSize,
      },
    }),
    [fontSize],
  );

  const fontSizeValue = useMemo(
    () => ({ fontSize, increase, decrease, reset }),
    [fontSize, increase, decrease, reset],
  );

  return (
    <FontSizeContext.Provider value={fontSizeValue}>
      <AntdRegistry>
        <ConfigProvider theme={theme} locale={zhCN}>
          <App>{children}</App>
        </ConfigProvider>
      </AntdRegistry>
    </FontSizeContext.Provider>
  );
}
