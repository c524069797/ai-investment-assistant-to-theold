import type { ThemeConfig } from "antd";

export const elderlyTheme: ThemeConfig = {
  token: {
    fontSize: 18,
    fontFamily:
      "'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif",
    lineHeight: 1.8,
    controlHeight: 48,
    borderRadius: 12,
    colorPrimary: "#1677ff",
    colorSuccess: "#389e0d",
    colorError: "#cf1322",
    colorWarning: "#faad14",
    colorBgLayout: "#f5f5f5",
    colorText: "rgba(0, 0, 0, 0.88)",
  },
  components: {
    Button: {
      controlHeight: 48,
      fontSize: 18,
      paddingInline: 24,
    },
    Input: {
      controlHeight: 48,
      fontSize: 18,
    },
    Card: {
      paddingLG: 24,
    },
    Menu: {
      fontSize: 16,
      itemHeight: 48,
    },
    Tabs: {
      horizontalItemPadding: "16px 20px",
    },
  },
};
