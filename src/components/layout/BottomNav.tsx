"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  HomeOutlined,
  RobotOutlined,
  StockOutlined,
  TeamOutlined,
  ReadOutlined,
  FundOutlined,
} from "@ant-design/icons";

const NAV_ITEMS = [
  { key: "/", icon: <HomeOutlined />, label: "首页" },
  { key: "/chat", icon: <RobotOutlined />, label: "AI助手" },
  { key: "/experts", icon: <TeamOutlined />, label: "大V" },
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
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        const isActive = activeKey === item.key;
        return (
          <Link
            key={item.key}
            href={item.key}
            className="bottom-nav-item"
            data-active={isActive}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
