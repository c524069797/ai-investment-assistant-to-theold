"use client";

import { Typography, Card, Row, Col, Button, Space, Alert, Spin, Segmented } from "antd";
import {
  RobotOutlined,
  StockOutlined,
  FundOutlined,
  ReadOutlined,
  StarOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useState } from "react";
import { useMarketIndices } from "@/lib/hooks/useStockData";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import StockCard from "@/components/stock/StockCard";
import { STRATEGY_MODES, type StrategyMode } from "@/lib/constants/market";

const { Title, Text, Paragraph } = Typography;

const QUICK_ENTRIES = [
  { href: "/chat", icon: <RobotOutlined style={{ fontSize: 32 }} />, label: "AI 助手", color: "#1677ff" },
  { href: "/stocks", icon: <StockOutlined style={{ fontSize: 32 }} />, label: "查股票", color: "#cf1322" },
  { href: "/funds", icon: <FundOutlined style={{ fontSize: 32 }} />, label: "看基金", color: "#389e0d" },
  { href: "/education", icon: <ReadOutlined style={{ fontSize: 32 }} />, label: "学投资", color: "#faad14" },
  { href: "/watchlist", icon: <StarOutlined style={{ fontSize: 32 }} />, label: "自选股", color: "#722ed1" },
];

export default function HomePage() {
  const { data: indices, isLoading: indicesLoading } = useMarketIndices();
  const { items: watchlist } = useWatchlist();
  const [strategy, setStrategy] = useState<StrategyMode>("conservative");

  const currentStrategy = STRATEGY_MODES[strategy];

  return (
    <div className="page-container">
      {/* Welcome */}
      <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <Title level={3} style={{ color: "#fff", margin: 0 }}>
          您好，欢迎使用智能投资助手 👋
        </Title>
        <Paragraph style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, margin: "8px 0 0" }}>
          我是您的 AI 投资助手"小智"，可以帮您查行情、看基金、学投资知识。
        </Paragraph>
      </Card>

      {/* Strategy Mode Selector */}
      <Card
        title="🎯 投资策略模式"
        style={{ marginBottom: 16 }}
        extra={
          <Segmented
            options={[
              {
                label: (
                  <Space>
                    <SafetyCertificateOutlined />
                    <span>爸爸模式</span>
                  </Space>
                ),
                value: "conservative",
              },
              {
                label: (
                  <Space>
                    <ThunderboltOutlined />
                    <span>妈妈模式</span>
                  </Space>
                ),
                value: "aggressive",
              },
            ]}
            value={strategy}
            onChange={(val) => setStrategy(val as StrategyMode)}
          />
        }
      >
        <div style={{ padding: "8px 0" }}>
          <Title level={4} style={{ margin: "0 0 8px" }}>
            {strategy === "conservative" ? "🛡️" : "🔥"} {currentStrategy.name}
          </Title>
          <Paragraph style={{ fontSize: 16, color: "#666", margin: 0 }}>
            {currentStrategy.description}
          </Paragraph>
          <div style={{ marginTop: 12, padding: 12, background: "#f6f8fa", borderRadius: 8 }}>
            {strategy === "conservative" ? (
              <Space orientation="vertical" size={4}>
                <Text style={{ fontSize: 15 }}>• <strong>买入信号</strong>：RSI &lt; 30（超卖）、触及布林带下轨、250日均线附近</Text>
                <Text style={{ fontSize: 15 }}>• <strong>止盈目标</strong>：10%</Text>
                <Text style={{ fontSize: 15 }}>• <strong>补仓规则</strong>：下跌 5% 后评估基本面，分批补仓</Text>
                <Text style={{ fontSize: 15 }}>• <strong>风格特点</strong>：稳健、耐心、注重基本面和估值</Text>
              </Space>
            ) : (
              <Space orientation="vertical" size={4}>
                <Text style={{ fontSize: 15 }}>• <strong>买入信号</strong>：热点题材匹配 + 股价在 5-30 元区间</Text>
                <Text style={{ fontSize: 15 }}>• <strong>止盈目标</strong>：20%</Text>
                <Text style={{ fontSize: 15 }}>• <strong>止损规则</strong>：热点消散即止损，不盲目补仓</Text>
                <Text style={{ fontSize: 15 }}>• <strong>风格特点</strong>：敏锐、果断、对新事物敏感</Text>
              </Space>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Entries */}
      <Card title="🚀 快捷入口" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          {QUICK_ENTRIES.map((entry) => (
            <Col xs={8} sm={4} key={entry.href}>
              <Link href={entry.href}>
                <div
                  style={{
                    textAlign: "center",
                    padding: "16px 8px",
                    borderRadius: 12,
                    background: "#fafafa",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ color: entry.color }}>{entry.icon}</div>
                  <Text style={{ fontSize: 15, marginTop: 8, display: "block" }}>{entry.label}</Text>
                </div>
              </Link>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Market Indices */}
      <Card title="📊 大盘指数" style={{ marginBottom: 16 }}>
        {indicesLoading ? (
          <div style={{ textAlign: "center", padding: 20 }}><Spin /></div>
        ) : indices ? (
          <Row gutter={[12, 12]}>
            {indices.map((idx) => (
              <Col xs={24} sm={12} md={8} key={idx.code}>
                <StockCard stock={idx} />
              </Col>
            ))}
          </Row>
        ) : (
          <Text type="secondary">暂无数据</Text>
        )}
      </Card>

      {/* Watchlist Preview */}
      {watchlist.length > 0 && (
        <Card
          title="⭐ 我的自选"
          extra={<Link href="/watchlist"><Button type="link">查看全部</Button></Link>}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[12, 12]}>
            {watchlist.slice(0, 4).map((item) => (
              <Col xs={24} sm={12} key={`${item.type}-${item.code}`}>
                <StockCard
                  stock={{ ...item, price: 0, change: 0, changePercent: 0, volume: 0, amount: 0 }}
                  linkTo={item.type === "stock" ? `/stocks/${item.code}?market=${item.market}` : `/funds/${item.code}`}
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Risk Disclaimer */}
      <Alert
        title="投资风险提示"
        description="投资有风险，入市需谨慎。本应用提供的数据和分析仅供参考，不构成投资建议。请根据自身情况谨慎决策。"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
    </div>
  );
}
