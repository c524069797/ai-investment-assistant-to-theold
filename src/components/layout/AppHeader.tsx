"use client";

import { Layout, Space, Button, Typography } from "antd";
import {
  FontSizeOutlined,
  StockOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useFontSize } from "./AntdProvider";
import { useUser } from "@/lib/hooks/useUser";

const { Header } = Layout;
const { Title } = Typography;

export default function AppHeader() {
  const { increase, decrease } = useFontSize();
  const { currentUser, logout } = useUser();

  return (
    <Header className="app-header">
      <Link href="/" className="app-header-brand">
        <StockOutlined style={{ fontSize: 28, color: "#2b56c2" }} />
        <div>
          <Title level={5} style={{ margin: 0, color: "#1f2d4a", lineHeight: 1.2 }}>
            智能投资助手
          </Title>
          <span style={{ fontSize: 12, color: "#6d7891" }}>A股版</span>
        </div>
      </Link>
      <Space size={8} wrap className="app-header-actions">
        {currentUser && (
          <>
            <span className="app-header-user" style={{ fontWeight: 600, fontSize: 15 }}>
              {currentUser.avatar} {currentUser.name}
            </span>
            <Button
              size="small"
              icon={<LogoutOutlined />}
              onClick={logout}
              style={{ borderRadius: 10 }}
            >
              退出
            </Button>
          </>
        )}
        <Button size="small" onClick={decrease} style={{ borderRadius: 10 }}>
          A-
        </Button>
        <FontSizeOutlined className="app-header-font-icon" style={{ fontSize: 18, color: "#4860a8" }} />
        <Button size="small" onClick={increase} style={{ borderRadius: 10 }}>
          A+
        </Button>
      </Space>
    </Header>
  );
}
