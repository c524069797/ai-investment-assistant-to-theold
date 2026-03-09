"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  HomeOutlined,
  RobotOutlined,
  StockOutlined,
  AimOutlined,
  ReadOutlined,
  FundOutlined,
} from "@ant-design/icons";

const NAV_ITEMS = [
  { key: "/", icon: <HomeOutlined />, label: "首页" },
  { key: "/chat", icon: <RobotOutlined />, label: "AI助手" },
  { key: "/strategy", icon: <AimOutlined />, label: "策略" },
  { key: "/stocks", icon: <StockOutlined />, label: "股票" },
  { key: "/funds", icon: <FundOutlined />, label: "基金" },
  { key: "/education", icon: <ReadOutlined />, label: "学堂" },
];

export default function BottomNav() {
  const pathname = usePathname();

  const getActiveKey = () => {
    if (pathname === "/") return "/";
    const match = NAV_ITEMS.find((item) => item.key !== "/" && pathname.startsWith(item.key));
    return match?.key ?? "/";
  };

  const activeKey = getActiveKey();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid #e8edf4",
        boxShadow: "0 -6px 20px rgba(15, 23, 42, 0.08)",
        display: "flex",
        justifyContent: "space-around",
        padding: "6px 0 env(safe-area-inset-bottom, 8px)",
        zIndex: 100,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeKey === item.key;
        return (
          <Link
            key={item.key}
            href={item.key}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              color: isActive ? "#2b56c2" : "#7f889d",
              fontSize: 12,
              textDecoration: "none",
              padding: "4px 8px",
              minWidth: 48,
            }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
