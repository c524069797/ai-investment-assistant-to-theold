"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Empty, Spin, Tag, Typography, message } from "antd";
import { ArrowRightOutlined, PlusOutlined, StockOutlined } from "@ant-design/icons";
import Link from "next/link";
import { cacheCurrentUser } from "@/lib/hooks/useUser";

const { Title, Text, Paragraph } = Typography;

interface AccountOption {
  username: string;
  name: string;
  avatar: string;
}

const DEFAULT_ACCOUNTS: AccountOption[] = [
  { username: "baba", name: "爸爸", avatar: "👨" },
  { username: "mama", name: "妈妈", avatar: "👩" },
];

const LOGIN_HIGHLIGHTS = ["适老化界面", "自选股跟踪", "AI 问答陪伴"];

export default function LoginPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selected, setSelected] = useState("");
  const [loadingUser, setLoadingUser] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountsError, setAccountsError] = useState("");

  const accountCountLabel = useMemo(() => {
    if (!accounts.length) {
      return "先创建一个家庭角色，再开始使用";
    }

    return `当前可直接进入 ${accounts.length} 个角色`;
  }, [accounts.length]);

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
        cacheCurrentUser(json.data);
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

  const enterGuestMode = () => {
    cacheCurrentUser(null);
    message.info("已进入游客模式，可浏览行情、观点和课程；登录后可保存自选与对话记录。");
    window.location.href = "/?mode=guest";
  };

  return (
    <div className="auth-shell">
      <div className="auth-shell__backdrop" />
      {redirecting && (
        <div className="auth-redirect-mask">
          <Spin size="large" />
          <Text className="auth-redirect-mask__text">正在进入首页，请稍候...</Text>
        </div>
      )}
      <Card className="auth-card auth-card--login">
        <div className="auth-card__header">
          <div className="auth-card__logo">
            <StockOutlined />
          </div>
          <Text className="auth-card__eyebrow">家庭投研入口</Text>
          <Title level={2} className="auth-card__title">AI 智能投资助手</Title>
          <Paragraph className="auth-card__desc">
            选择角色即可继续使用首页、AI 问答、自选股分析和大V观点，不需要额外输入密码。
          </Paragraph>
          <div className="auth-card__tag-row">
            {LOGIN_HIGHLIGHTS.map((item) => (
              <Tag key={item} className="auth-card__tag">{item}</Tag>
            ))}
          </div>
        </div>

        <div className="auth-card__section-head">
          <Text className="auth-card__section-title">选择身份</Text>
          <Text className="auth-card__section-meta">{accountCountLabel}</Text>
        </div>

        <button
          type="button"
          className="auth-account-option auth-account-option--guest"
          onClick={enterGuestMode}
          disabled={!!loadingUser || redirecting}
        >
          <div className="auth-account-option__avatar">👀</div>
          <div className="auth-account-option__name">游客模式</div>
          <div className="auth-account-option__username">无需登录，先浏览行情、观点和课程</div>
          <div className="auth-account-option__action">
            <span>直接体验</span>
            <ArrowRightOutlined />
          </div>
        </button>

        {loadingAccounts ? (
          <div className="auth-loading-state">
            <Spin />
            <Text className="auth-loading-state__text">正在准备可用角色...</Text>
          </div>
        ) : accountsError ? (
          <div className="auth-empty-state">
            <Empty description={accountsError} style={{ marginBottom: 12 }} />
            <Button onClick={loadAccounts}>重新加载</Button>
          </div>
        ) : accounts.length ? (
          <div className="auth-account-grid">
            {accounts.map((acc) => {
              const active = selected === acc.username;
              const pending = loadingUser === acc.username;

              return (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleLogin(acc.username)}
                  disabled={!!loadingUser}
                  className={`auth-account-option${active ? " auth-account-option--active" : ""}${pending ? " auth-account-option--pending" : ""}`}
                >
                  <div className="auth-account-option__avatar">{pending ? "⏳" : acc.avatar}</div>
                  <div className="auth-account-option__name">{acc.name}</div>
                  <div className="auth-account-option__username">{pending ? "正在进入..." : acc.username}</div>
                  <div className="auth-account-option__action">
                    <span>进入这个角色</span>
                    <ArrowRightOutlined />
                  </div>
                </button>
              );
            })}

            <Link href="/register" className="auth-account-link">
              <div className="auth-account-option auth-account-option--create">
                <div className="auth-account-option__avatar auth-account-option__avatar--create">
                  <PlusOutlined />
                </div>
                <div className="auth-account-option__name">注册新角色</div>
                <div className="auth-account-option__username">给家人或自己创建专属身份</div>
                <div className="auth-account-option__action">
                  <span>去注册</span>
                  <ArrowRightOutlined />
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="auth-empty-state">
            <Empty description="暂无可用角色，请先注册" style={{ marginBottom: 12 }} />
            <Link href="/register">
              <Button type="primary">去注册</Button>
            </Link>
          </div>
        )}

        <div className="auth-card__footer">
          <Text className="auth-card__footer-text">支持多角色切换，便于区分爸爸、妈妈或测试账号的自选与对话记录。</Text>
        </div>
      </Card>
    </div>
  );
}
