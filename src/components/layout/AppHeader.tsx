"use client";

import { Layout, Space, Button, Typography } from "antd";
import {
  FontSizeOutlined,
  StockOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useFontSize } from "./AntdProvider";

const { Header } = Layout;
const { Title } = Typography;

export default function AppHeader() {
  const { increase, decrease } = useFontSize();

  return (
    <Header
      style={{
        background: "#fff",
        borderBottom: "1px solid #f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 64,
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <StockOutlined style={{ fontSize: 28, color: "#1677ff" }} />
        <Title level={4} style={{ margin: 0, color: "#1677ff" }}>
          智能投资助手
        </Title>
      </Link>
      <Space>
        <Button size="small" onClick={decrease}>
          A-
        </Button>
        <FontSizeOutlined style={{ fontSize: 18 }} />
        <Button size="small" onClick={increase}>
          A+
        </Button>
      </Space>
    </Header>
  );
}
