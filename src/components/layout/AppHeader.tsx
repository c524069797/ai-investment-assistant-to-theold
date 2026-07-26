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
  LoginOutlined,
  LogoutOutlined,
  ClusterOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFontSize, useThemeMode } from "./AntdProvider";
import { useUser } from "@/lib/hooks/useUser";
import AiSettingsDrawer from "@/components/settings/AiSettingsDrawer";

const { Header } = Layout;
const { Title } = Typography;

const NAV_ITEMS = [
  { href: "/", label: "首页", icon: <HomeOutlined /> },
  { href: "/agents", label: "Agent中心", icon: <ClusterOutlined /> },
  { href: "/chat", label: "AI助手", icon: <RobotOutlined /> },
  { href: "/experts", label: "大V观点", icon: <TeamOutlined /> },
  { href: "/stocks", label: "股票", icon: <StockOutlined /> },
  { href: "/funds", label: "基金", icon: <FundOutlined /> },
  { href: "/education", label: "投资学堂", icon: <ReadOutlined /> },
  { href: "/board", label: "留言板", icon: <BulbOutlined /> },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { increase, decrease } = useFontSize();
  const { mode, toggleMode } = useThemeMode();
  const { currentUser, isLoading, logout } = useUser();
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
            {/* 桌面工具区：科技风走紧凑 icon-only，文字说明放 Tooltip。
                移动端整组隐藏，所有工具收进汉堡菜单（适老化大按钮）。 */}
            <Space size={6} className="app-header-actions app-header-tools">
              {currentUser ? (
                <>
                  <span className="app-header-user">
                    {currentUser.avatar} {currentUser.name}
                  </span>
                  <Tooltip title="退出登录">
                    <Button
                      size="small"
                      icon={<LogoutOutlined />}
                      onClick={logout}
                      className="app-header-action-btn"
                      aria-label="退出登录"
                    />
                  </Tooltip>
                </>
              ) : isLoading ? (
                <span className="app-header-user" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Spin size="small" /> 正在加载用户...
                </span>
              ) : (
                <>
                  <span className="app-header-user app-header-user--guest">游客模式</span>
                  <Link href="/login">
                    <Button size="small" type="primary" icon={<LoginOutlined />} className="app-header-action-btn">
                      登录
                    </Button>
                  </Link>
                </>
              )}
              <Tooltip title={isDark ? "切换到浅色主题" : "切换到深色主题"}>
                <Button
                  size="small"
                  icon={isDark ? <BulbOutlined /> : <MoonOutlined />}
                  onClick={toggleMode}
                  className="app-header-action-btn"
                  aria-label={isDark ? "切换到浅色主题" : "切换到深色主题"}
                />
              </Tooltip>
              <Tooltip title="AI 设置">
                <Button
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => setSettingsOpen(true)}
                  className="app-header-action-btn"
                  aria-label="AI 设置"
                />
              </Tooltip>
              <span className="app-header-font-group">
                <Tooltip title="调小字号">
                  <Button size="small" onClick={decrease} className="app-header-action-btn app-header-font-btn">
                    A-
                  </Button>
                </Tooltip>
                <Tooltip title="调大字号">
                  <Button size="small" onClick={increase} className="app-header-action-btn app-header-font-btn">
                    A+
                  </Button>
                </Tooltip>
              </span>
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
            {/* 用户状态：登录/退出是低频但重要的入口，放菜单首行 */}
            <div className="app-header-mobile-user">
              {currentUser ? (
                <>
                  <span className="app-header-mobile-user__name">
                    {currentUser.avatar} {currentUser.name}
                  </span>
                  <Button
                    icon={<LogoutOutlined />}
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    退出登录
                  </Button>
                </>
              ) : (
                <>
                  <span className="app-header-mobile-user__name app-header-user--guest">游客模式</span>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button type="primary" icon={<LoginOutlined />}>选择身份登录</Button>
                  </Link>
                </>
              )}
            </div>

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

            {/* 工具区：主题/设置/字号，适老化 48px 大按钮 */}
            <div className="app-header-mobile-tools">
              <Button
                icon={isDark ? <BulbOutlined /> : <MoonOutlined />}
                onClick={toggleMode}
              >
                {isDark ? "浅色主题" : "深色主题"}
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={() => {
                  setSettingsOpen(true);
                  setMobileMenuOpen(false);
                }}
              >
                AI 设置
              </Button>
              <Button icon={<FontSizeOutlined />} onClick={decrease}>
                字体调小
              </Button>
              <Button icon={<FontSizeOutlined />} onClick={increase}>
                字体调大
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <AiSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Header>
  );
}
