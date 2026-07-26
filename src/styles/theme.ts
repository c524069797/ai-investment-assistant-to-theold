import { theme as antdTheme, type ThemeConfig } from "antd";

export type AppThemeMode = "tech-light" | "tech-dark";

/**
 * 双轨密度。与 globals.css 的 1024px 断点保持一致：
 * - comfortable：移动端适老化轨道，大字号 + 48px 控件，满足触控最小尺寸
 * - compact：桌面科技风轨道，紧凑控件 + 更小圆角
 */
export type AppDensity = "comfortable" | "compact";

interface DensitySpec {
  controlHeight: number;
  fontDelta: number;      // 相对用户选定字号的偏移，桌面整体收小
  paddingInline: number;
  radius: number;
  radiusLG: number;
  cardPaddingLG: number;
  cardHeaderHeight: number;
  lineHeight: number;
  segmentedHeight: number;
  menuItemHeight: number;
  tabsPadding: string;
}

const DENSITY: Record<AppDensity, DensitySpec> = {
  comfortable: {
    controlHeight: 48,
    fontDelta: 0,
    paddingInline: 22,
    radius: 16,
    radiusLG: 22,
    cardPaddingLG: 20,
    cardHeaderHeight: 58,
    lineHeight: 1.75,
    segmentedHeight: 44,
    menuItemHeight: 48,
    tabsPadding: "14px 18px",
  },
  compact: {
    controlHeight: 36,
    fontDelta: -3,
    paddingInline: 16,
    radius: 12,
    radiusLG: 16,
    cardPaddingLG: 20,
    cardHeaderHeight: 48,
    lineHeight: 1.65,
    segmentedHeight: 34,
    menuItemHeight: 36,
    tabsPadding: "10px 16px",
  },
};

function buildComponents(d: DensitySpec, bodyFont: number): NonNullable<ThemeConfig["components"]> {
  const card = {
    paddingLG: d.cardPaddingLG,
    headerHeight: d.cardHeaderHeight,
    borderRadiusLG: d.radiusLG,
  };

  return {
    Button: {
      controlHeight: d.controlHeight,
      fontSize: bodyFont,
      paddingInline: d.paddingInline,
      borderRadius: d.radius,
      fontWeight: 600,
    },
    Input: {
      controlHeight: d.controlHeight,
      fontSize: bodyFont,
      borderRadius: d.radius,
    },
    Select: {
      controlHeight: d.controlHeight,
      fontSize: bodyFont,
      borderRadius: d.radius,
    },
    Card: card,
    Menu: {
      fontSize: bodyFont,
      itemHeight: d.menuItemHeight,
    },
    Tabs: {
      horizontalItemPadding: d.tabsPadding,
    },
    Segmented: {
      controlHeight: d.segmentedHeight,
      trackPadding: 4,
    },
    Table: {
      headerBorderRadius: d.radius,
      fontSize: bodyFont,
      cellPaddingBlock: d.controlHeight >= 44 ? 14 : 10,
      cellPaddingInline: d.controlHeight >= 44 ? 14 : 12,
    },
  };
}

export function getAppTheme(
  mode: AppThemeMode,
  fontSize: number,
  density: AppDensity = "comfortable",
): ThemeConfig {
  const d = DENSITY[density];
  // 桌面轨道整体收小 3px，但仍跟随用户的 A−/A+ 选择，适老化调节不失效。
  const bodyFont = Math.max(12, fontSize + d.fontDelta);
  const sharedComponents = buildComponents(d, bodyFont);

  const commonToken = {
    fontSize: bodyFont,
    fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif",
    lineHeight: d.lineHeight,
    controlHeight: d.controlHeight,
    borderRadius: d.radius,
    borderRadiusLG: d.radiusLG,
    wireframe: false,
  };

  const sharedCard = {
    paddingLG: d.cardPaddingLG,
    headerHeight: d.cardHeaderHeight,
    borderRadiusLG: d.radiusLG,
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
