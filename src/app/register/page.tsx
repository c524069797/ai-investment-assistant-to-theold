"use client";

import { useState } from "react";
import { Button, Card, Input, Typography, message } from "antd";
import { ArrowLeftOutlined, CheckOutlined, StockOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title, Text, Paragraph } = Typography;

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
    <div className="auth-shell">
      <div className="auth-shell__backdrop" />
      <Card className="auth-card auth-card--register">
        <div className="auth-card__header auth-card__header--compact">
          <div className="auth-card__logo">
            <StockOutlined />
          </div>
          <Text className="auth-card__eyebrow">创建家庭身份</Text>
          <Title level={2} className="auth-card__title">注册新角色</Title>
          <Paragraph className="auth-card__desc">
            创建后会自动登录。你可以为自己、家人或测试用途分别建立独立身份，后续自选和历史会话会自动区分。
          </Paragraph>
        </div>

        <div className="auth-form-grid">
          <div className="auth-form-section">
            <Text className="auth-form-label">称呼</Text>
            <Input
              size="large"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={20}
              placeholder="例如：小陈 / 妹妹 / 投资研究"
              onPressEnter={handleRegister}
              className="auth-form-input"
            />
            <Text className="auth-form-help">建议输入一个容易识别的称呼，方便在登录页快速切换。</Text>
          </div>

          <div className="auth-form-section">
            <Text className="auth-form-label">头像</Text>
            <div className="auth-avatar-grid">
              {AVATARS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAvatar(item)}
                  className={`auth-avatar-option${avatar === item ? " auth-avatar-option--active" : ""}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <Text className="auth-form-help">当前选择：{avatar}，后续仍可以继续扩展更多角色。</Text>
          </div>
        </div>

        <div className="auth-form-actions">
          <Link href="/login" className="auth-form-actions__link">
            <Button icon={<ArrowLeftOutlined />}>返回登录</Button>
          </Link>
          <Button type="primary" icon={<CheckOutlined />} loading={loading} onClick={handleRegister}>
            完成注册
          </Button>
        </div>
      </Card>
    </div>
  );
}
