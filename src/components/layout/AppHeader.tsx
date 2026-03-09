"use client";

import { Layout, Space, Button, Typography, Dropdown } from "antd";
import {
  FontSizeOutlined,
  StockOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useFontSize } from "./AntdProvider";
import { useUser } from "@/lib/hooks/useUser";

const { Header } = Layout;
const { Title } = Typography;

export default function AppHeader() {
  const { increase, decrease } = useFontSize();
  const { currentUser, users, switchUser } = useUser();

  const userMenuItems = users.map((u) => ({
    key: u.id,
    label: `${u.avatar} ${u.name}`,
    onClick: () => switchUser(u.id),
  }));

  return (
    <Header
      style={{
        background: "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #e8edf4",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 64,
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <StockOutlined style={{ fontSize: 28, color: "#2b56c2" }} />
        <div>
          <Title level={5} style={{ margin: 0, color: "#1f2d4a", lineHeight: 1.2 }}>
            智能投资助手
          </Title>
          <span style={{ fontSize: 12, color: "#6d7891" }}>A股版</span>
        </div>
      </Link>
      <Space size={8}>
        {currentUser && (
          <Dropdown menu={{ items: userMenuItems }} trigger={["click"]}>
            <Button
              icon={<UserSwitchOutlined />}
              style={{ borderRadius: 10, fontWeight: 600 }}
            >
              {currentUser.avatar} {currentUser.name}
            </Button>
          </Dropdown>
        )}
        <Button size="small" onClick={decrease} style={{ borderRadius: 10 }}>
          A-
        </Button>
        <FontSizeOutlined style={{ fontSize: 18, color: "#4860a8" }} />
        <Button size="small" onClick={increase} style={{ borderRadius: 10 }}>
          A+
        </Button>
      </Space>
    </Header>
  );
}
