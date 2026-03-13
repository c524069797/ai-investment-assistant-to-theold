"use client";

import { useState } from "react";
import { Card, Input, Button, Typography, Space, message, Spin } from "antd";
import { UserOutlined, LockOutlined, StockOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface AccountOption {
  username: string;
  name: string;
  avatar: string;
}

const ACCOUNTS: AccountOption[] = [
  { username: "baba", name: "爸爸", avatar: "👨" },
  { username: "mama", name: "妈妈", avatar: "👩" },
];

export default function LoginPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const handleLogin = async () => {
    if (!selected) {
      message.warning("请先选择账号");
      return;
    }
    if (!password) {
      message.warning("请输入密码");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: selected, password }),
      });
      const json = await res.json();

      if (json.success) {
        message.success(`欢迎回来，${json.data.name}！`);
        setRedirecting(true);
        window.location.href = "/";
      } else {
        message.error(json.error || "登录失败");
      }
    } catch {
      message.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, #f7f9fc 0%, #f3f6fb 55%, #eef2f7 100%)",
        padding: 16,
      }}
    >
      {redirecting && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Spin size="large" />
          <Text style={{ fontSize: 16, color: "#334155" }}>登录成功，正在进入首页...</Text>
        </div>
      )}
      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 20,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <StockOutlined style={{ fontSize: 48, color: "#2b56c2", marginBottom: 12 }} />
          <Title level={3} style={{ margin: 0 }}>AI 智能投资助手</Title>
          <Text type="secondary">请选择账号登录</Text>
        </div>

        {/* Account Selection */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {ACCOUNTS.map((acc) => (
            <div
              key={acc.username}
              onClick={() => setSelected(acc.username)}
              style={{
                flex: 1,
                padding: "20px 12px",
                borderRadius: 14,
                border: selected === acc.username
                  ? "2px solid #2b56c2"
                  : "2px solid #e7edf4",
                background: selected === acc.username
                  ? "linear-gradient(135deg, #eef2ff 0%, #dbeafe 100%)"
                  : "#fafbfc",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>{acc.avatar}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{acc.name}</div>
              <div style={{ fontSize: 13, color: "#6d7891" }}>{acc.username}</div>
            </div>
          ))}
        </div>

        {/* Password Input */}
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入密码"
            size="large"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handleLogin}
            style={{ borderRadius: 10, height: 48 }}
          />

          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            onClick={handleLogin}
            icon={<UserOutlined />}
            style={{
              height: 48,
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            登 录
          </Button>
        </Space>

        <div style={{ textAlign: "center", marginTop: 20, color: "#8c8c8c", fontSize: 13 }}>
          由全球最先进的 AI 大模型驱动
        </div>
      </Card>
    </div>
  );
}
