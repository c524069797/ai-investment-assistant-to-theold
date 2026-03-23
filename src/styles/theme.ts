import { theme as antdTheme, type ThemeConfig } from "antd";

export type AppThemeMode = "tech-light" | "tech-dark";

const sharedCard = {
  paddingLG: 24,
  headerHeight: 58,
  borderRadiusLG: 22,
};

const sharedComponents: NonNullable<ThemeConfig["components"]> = {
  Button: {
    controlHeight: 46,
    fontSize: 17,
    paddingInline: 22,
    borderRadius: 14,
    fontWeight: 600,
  },
  Input: {
    controlHeight: 46,
    fontSize: 17,
    borderRadius: 14,
  },
  Card: sharedCard,
  Menu: {
    fontSize: 15,
    itemHeight: 46,
  },
  Tabs: {
    horizontalItemPadding: "16px 20px",
  },
  Segmented: {
    controlHeight: 40,
    trackPadding: 4,
  },
  Table: {
    headerBorderRadius: 14,
  },
};

export function getAppTheme(mode: AppThemeMode, fontSize: number): ThemeConfig {
  const commonToken = {
    fontSize,
    fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif",
    lineHeight: 1.75,
    controlHeight: 46,
    borderRadius: 16,
    borderRadiusLG: 22,
    wireframe: false,
  };

  if (mode === "tech-dark") {
    return {
      algorithm: antdTheme.darkAlgorithm,
      token: {
        ...commonToken,
        colorPrimary: "#ff3b43",
        colorSuccess: "#3cb371",
        colorError: "#ff3b43",
        colorWarning: "#ffc857",
        colorInfo: "#ff3b43",
        colorBgLayout: "#08111f",
        colorBgContainer: "#0f1c2f",
        colorBgElevated: "#13233b",
        colorText: "#edf4ff",
        colorTextSecondary: "#abc0dc",
        colorBorder: "rgba(255, 84, 95, 0.22)",
      },
      components: {
        ...sharedComponents,
        Layout: {
          headerBg: "rgba(10, 22, 41, 0.9)",
          bodyBg: "#08111f",
        },
        Card: {
          ...sharedCard,
          colorBorderSecondary: "rgba(255, 84, 95, 0.24)",
        },
      },
    };
  }

  return {
    algorithm: antdTheme.defaultAlgorithm,
    token: {
      ...commonToken,
      colorPrimary: "#d9001b",
      colorSuccess: "#3f9d5a",
      colorError: "#d9001b",
      colorWarning: "#d89c2c",
      colorInfo: "#d9001b",
      colorBgLayout: "#fff5f7",
      colorBgContainer: "#ffffff",
      colorBgElevated: "#ffffff",
      colorText: "#4b1f29",
      colorTextSecondary: "#7d6168",
      colorBorder: "rgba(192, 55, 80, 0.14)",
    },
    components: {
      ...sharedComponents,
      Layout: {
        headerBg: "rgba(255, 255, 255, 0.9)",
        bodyBg: "#fff5f7",
      },
      Card: {
        ...sharedCard,
        colorBorderSecondary: "rgba(217, 0, 27, 0.12)",
      },
    },
  };
}
