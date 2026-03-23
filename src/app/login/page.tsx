"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Empty, Spin, Typography, message } from "antd";
import { PlusOutlined, StockOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title, Text } = Typography;

interface AccountOption {
  username: string;
  name: string;
  avatar: string;
}

const DEFAULT_ACCOUNTS: AccountOption[] = [
  { username: "baba", name: "爸爸", avatar: "👨" },
  { username: "mama", name: "妈妈", avatar: "👩" },
];

export default function LoginPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selected, setSelected] = useState("");
  const [loadingUser, setLoadingUser] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountsError, setAccountsError] = useState("");

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    setAccountsError("");

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch("/api/auth/accounts", { signal: controller.signal });
      clearTimeout(timer);
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length) {
        setAccounts(json.data);
        return;
      }

      setAccounts(DEFAULT_ACCOUNTS);
    } catch {
      setAccounts(DEFAULT_ACCOUNTS);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleLogin = async (username: string) => {
    if (loadingUser) {
      return;
    }

    setSelected(username);
    setLoadingUser(username);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const json = await res.json();

      if (json.success) {
        message.success(`欢迎回来，${json.data.name}！`);
        setRedirecting(true);
        window.location.href = "/";
        return;
      }

      message.error(json.error || "进入失败");
    } catch {
      message.error("网络错误，请稍后重试");
    } finally {
      setLoadingUser("");
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
      {redirecting && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--overlay-bg)",
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
          <Text style={{ fontSize: 16, color: "var(--text-main)" }}>正在进入首页...</Text>
        </div>
      )}
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
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <StockOutlined style={{ fontSize: 48, color: "#2b56c2", marginBottom: 12 }} />
          <Title level={3} style={{ margin: 0, color: "var(--text-main)" }}>AI 智能投资助手</Title>
          <Text type="secondary">请选择角色登录，或先注册一个新身份</Text>
        </div>

        {loadingAccounts ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Spin />
          </div>
        ) : accountsError ? (
          <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
            <Empty description={accountsError} style={{ marginBottom: 12 }} />
            <Button onClick={loadAccounts}>重新加载</Button>
          </div>
        ) : accounts.length ? (
          <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            {accounts.map((acc) => {
              const active = selected === acc.username;
              const pending = loadingUser === acc.username;

              return (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleLogin(acc.username)}
                  disabled={!!loadingUser}
                  style={{
                    flex: "1 1 140px",
                    padding: "20px 12px",
                    borderRadius: 14,
                    border: active
                      ? "2px solid var(--accent-strong)"
                      : "2px solid var(--panel-border)",
                    background: active
                      ? "var(--accent-surface)"
                      : "var(--card-muted)",
                    cursor: loadingUser ? "not-allowed" : "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                    appearance: "none",
                    WebkitAppearance: "none",
                    color: "var(--text-main)",
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 8 }}>{pending ? "⏳" : acc.avatar}</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{acc.name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {pending ? "正在进入..." : acc.username}
                  </div>
                </button>
              );
            })}

            <Link href="/register" style={{ flex: "1 1 140px" }}>
              <div
                style={{
                  height: "100%",
                  padding: "20px 12px",
                  borderRadius: 14,
                  border: "2px dashed var(--accent-strong)",
                  background: "var(--accent-soft)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s",
                  color: "var(--text-main)",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}><PlusOutlined /></div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>注册</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>创建新角色</div>
              </div>
            </Link>
          </div>
        ) : (
          <Empty description="暂无可用角色，请先注册" style={{ marginBottom: 12 }} />
        )}

        <div style={{ textAlign: "center", marginTop: 20, color: "var(--text-secondary)", fontSize: 13 }}>
          无需密码，选择角色即可进入
        </div>
      </Card>
    </div>
  );
}
