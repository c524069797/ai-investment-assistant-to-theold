"use client";

import Link from "next/link";
import { Alert, Button, Card, Empty, Space, Spin, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useUser } from "@/lib/hooks/useUser";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import UserInvestmentProfileCard from "@/components/memory/UserInvestmentProfileCard";
import StockMemoryCard from "@/components/memory/StockMemoryCard";
import MarketingVisual from "@/components/marketing/MarketingVisual";

const { Paragraph, Title } = Typography;

export default function MemoryPage() {
  const { currentUser, isLoading: userLoading } = useUser();
  const { items, isLoading: watchlistLoading } = useWatchlist();
  const stocks = items.filter((item) => item.type === "stock");

  if (userLoading || watchlistLoading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="page-container">
        <Card className="guest-gate-card">
          <div className="guest-gate-card__icon">🧠</div>
          <Title level={3} style={{ marginBottom: 8 }}>登录后启用 MemBrain 记忆</Title>
          <Paragraph className="guest-gate-card__desc">
            记忆中心会保存你的投资画像、自选股关注逻辑和聊天分析快照。游客模式不会写入个人数据，适合先浏览功能。
          </Paragraph>
          <MarketingVisual
            alt="投资记忆中心界面展示"
            className="guest-gate-card__media"
            src="/marketing/hero-agents.png"
            tone="compact"
          />
          <div className="guest-gate-card__actions">
            <Link href="/login">
              <Button type="primary" size="large">选择身份登录</Button>
            </Link>
            <Link href="/education">
              <Button size="large">先看投资学堂</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="summary-card marketing-strip-card" style={{ padding: 20, marginBottom: 16 }}>
        <Space direction="vertical" size={4}>
          <Space wrap>
            <Link href="/watchlist">
              <Button icon={<ArrowLeftOutlined />}>返回自选</Button>
            </Link>
          </Space>
          <Title level={3} style={{ marginBottom: 0 }}>🧠 {currentUser?.name ?? "我的"} MemBrain 记忆中心</Title>
          <Paragraph style={{ marginBottom: 0, color: "#666" }}>
            先管理投资画像，再补齐每只自选股的关注逻辑。后续聊天时，AI 会参考这些长期记忆，而不是每次都从零开始理解你。
          </Paragraph>
        </Space>
        <MarketingVisual
          alt="个人投资记忆与自选逻辑界面展示"
          className="marketing-strip-card__media"
          src="/marketing/hero-agents.png"
          tone="compact"
        />
      </div>

      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <UserInvestmentProfileCard />

        <Card>
          <Space direction="vertical" size={4} style={{ width: "100%", marginBottom: 12 }}>
            <Title level={4} style={{ marginBottom: 0 }}>📌 自选股关注逻辑</Title>
            <Paragraph style={{ marginBottom: 0, color: "#666" }}>
              先给高频关注的股票补逻辑卡片，包括关注原因、风险点、观察信号和最近判断。
            </Paragraph>
          </Space>

          {!stocks.length ? (
            <Empty description="你还没有自选股票，先去股票页或自选页添加吧。">
              <Link href="/stocks">
                <Button type="primary">去添加股票</Button>
              </Link>
            </Empty>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {stocks.map((item) => (
                <StockMemoryCard key={item.code} code={item.code} name={item.name} market={item.market} />
              ))}
            </div>
          )}
        </Card>

        <Alert
          type="info"
          showIcon
          message="当前是 MemBrain MVP"
          description="已支持用户画像、自选逻辑卡片、聊天分析快照。后续可以继续扩展持仓逻辑、事件影响卡片和主动预警。"
        />
      </Space>
    </div>
  );
}
