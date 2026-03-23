"use client";

import { useState } from "react";
import { Button, Card, Input, Space, Typography, message } from "antd";
import { ArrowLeftOutlined, CheckOutlined, StockOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title, Text } = Typography;

const AVATARS = ["🙂", "😎", "🧠", "📈", "🚀", "🦉", "👨", "👩"];

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) {
      message.warning("请输入称呼");
      return;
    }

    setLoading(true);

    try {
      const registerRes = await fetch("/api/auth/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), avatar }),
      });
      const registerJson = await registerRes.json();

      if (!registerJson.success) {
        message.error(registerJson.error || "注册失败");
        return;
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: registerJson.data.username }),
      });
      const loginJson = await loginRes.json();

      if (!loginJson.success) {
        message.error(loginJson.error || "注册成功，但自动登录失败");
        return;
      }

      message.success(`欢迎加入，${registerJson.data.name}！`);
      window.location.href = "/";
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
        background: "var(--page-bg)",
        padding: 16,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 24,
          boxShadow: "var(--panel-shadow)",
          border: "1px solid var(--panel-border)",
          background: "var(--panel-bg)",
        }}
      >
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <StockOutlined style={{ fontSize: 48, color: "#2b56c2", marginBottom: 12 }} />
            <Title level={3} style={{ margin: 0, color: "var(--text-main)" }}>注册新角色</Title>
            <Text type="secondary">创建后会自动登录，下次可直接从登录页选择</Text>
          </div>

          <div>
            <Text style={{ display: "block", marginBottom: 8 }}>称呼</Text>
            <Input
              size="large"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={20}
              placeholder="例如：小陈 / 妹妹 / 投资研究"
              onPressEnter={handleRegister}
            />
          </div>

          <div>
            <Text style={{ display: "block", marginBottom: 8 }}>头像</Text>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {AVATARS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAvatar(item)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    border: avatar === item
                      ? "2px solid var(--accent-strong)"
                      : "2px solid var(--panel-border)",
                    background: avatar === item
                      ? "var(--accent-surface)"
                      : "var(--card-muted)",
                    fontSize: 26,
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <Link href="/login">
              <Button icon={<ArrowLeftOutlined />}>返回登录</Button>
            </Link>
            <Button type="primary" icon={<CheckOutlined />} loading={loading} onClick={handleRegister}>
              完成注册
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}
