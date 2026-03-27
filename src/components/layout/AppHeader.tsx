"use client";

import { useMemo, useState } from "react";
import { Layout, Space, Button, Typography, Spin, Tooltip } from "antd";
import {
  FontSizeOutlined,
  StockOutlined,
  BulbOutlined,
  MoonOutlined,
  HomeOutlined,
  RobotOutlined,
  TeamOutlined,
  ReadOutlined,
  FundOutlined,
  MenuOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFontSize, useThemeMode } from "./AntdProvider";
import { useUser } from "@/lib/hooks/useUser";

const { Header } = Layout;
const { Title } = Typography;

const NAV_ITEMS = [
  { href: "/", label: "首页", icon: <HomeOutlined /> },
  { href: "/chat", label: "AI助手", icon: <RobotOutlined /> },
  { href: "/experts", label: "大V观点", icon: <TeamOutlined /> },
  { href: "/stocks", label: "股票", icon: <StockOutlined /> },
  { href: "/funds", label: "基金", icon: <FundOutlined /> },
  { href: "/education", label: "投资学堂", icon: <ReadOutlined /> },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { increase, decrease } = useFontSize();
  const { mode, toggleMode } = useThemeMode();
  const { currentUser, isLoading } = useUser();
  const isDark = mode === "tech-dark";
  const hideOnAuthPage = pathname === "/login" || pathname === "/register";

  const activeKey = useMemo(() => {
    if (pathname === "/") {
      return "/";
    }

    return NAV_ITEMS.find((item) => item.href !== "/" && pathname.startsWith(item.href))?.href ?? "/";
  }, [pathname]);

  if (hideOnAuthPage) {
    return null;
  }

  return (
    <Header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-main">
          <div className="app-header-left">
            <Link href="/" className="app-header-brand" onClick={() => setMobileMenuOpen(false)}>
              <div className="app-header-brand-icon">
                <StockOutlined style={{ fontSize: 26 }} />
              </div>
              <div>
                <Title level={5} className="app-header-brand-title">
                  智能投资助手
                </Title>
                <span className="app-header-brand-subtitle">适老化投研界面 · 双端可读</span>
              </div>
            </Link>

            <nav className="app-header-nav">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="app-header-nav-link"
                  data-active={activeKey === item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="app-header-nav-link__icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="app-header-right">
            <Space size={8} className="app-header-actions app-header-tools">
              {isLoading ? (
                <span className="app-header-user" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Spin size="small" /> 正在加载用户...
                </span>
              ) : currentUser ? (
                <span className="app-header-user">
                  {currentUser.avatar} {currentUser.name}
                </span>
              ) : null}
              <Tooltip title={isDark ? "切换到科技浅色主题" : "切换到科技深色主题"}>
                <Button
                  size="small"
                  icon={isDark ? <BulbOutlined /> : <MoonOutlined />}
                  onClick={toggleMode}
                  className="app-header-action-btn app-header-theme-btn"
                >
                  <span className="app-header-action-label">{isDark ? "浅色" : "深色"}</span>
                </Button>
              </Tooltip>
              <Button size="small" onClick={decrease} className="app-header-action-btn app-header-font-btn">
                A-
              </Button>
              <FontSizeOutlined className="app-header-font-icon" style={{ fontSize: 18 }} />
              <Button size="small" onClick={increase} className="app-header-action-btn app-header-font-btn">
                A+
              </Button>
            </Space>

            <button
              type="button"
              className="app-header-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="切换导航菜单"
            >
              {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="app-header-mobile-menu">
            <nav className="app-header-mobile-nav">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="app-header-mobile-link"
                  data-active={activeKey === item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="app-header-mobile-link__icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </div>
    </Header>
  );
}
