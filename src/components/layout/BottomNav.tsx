"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
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
  const hideOnAuthPage = pathname === "/login" || pathname === "/register";

  const getActiveKey = () => {
    if (pathname === "/") return "/";
    const match = NAV_ITEMS.find((item) => item.key !== "/" && pathname.startsWith(item.key));
    return match?.key ?? "/";
  };

  const activeKey = getActiveKey();

  if (hideOnAuthPage) {
    return null;
  }

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
            <motion.span
              className="bottom-nav-icon"
              animate={isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {item.icon}
            </motion.span>
            <span>{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="bottom-nav-indicator"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 20,
                  height: 3,
                  borderRadius: 2,
                  background: "var(--accent-strong)",
                }}
                transition={{ duration: 0.2 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
