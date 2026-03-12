"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Alert, Button, Card, List, Space, Tag, Typography } from "antd";
import {
  BellOutlined,
  FireOutlined,
  LineChartOutlined,
  NotificationOutlined,
  ReloadOutlined,
  RiseOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { formatPercent, formatPrice, getPriceColor } from "@/styles/stock-colors";
import { getTonghuashunStockUrl } from "@/lib/utils/stock-links";

const { Text, Title, Paragraph } = Typography;

interface WatchlistInsightCardProps {
  code: string;
  name: string;
  market: number;
  compact?: boolean;
}

interface NewsItem {
  title: string;
  date: string;
  source: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface LevelInfo {
  price: number;
  reason: string;
}

interface DragonTigerInfo {
  isOnList: boolean;
  tradeDate?: string;
  reason?: string;
  netBuy?: number;
  buyAmount?: number;
  sellAmount?: number;
}

interface WatchlistInsight {
  code: string;
  name: string;
  market: number;
  concept: string;
  region: string;
  price: number;
  change: number;
  changePercent: number;
  turnoverRate: number;
  amount: number;
  volumeRatio: number;
  avgVolume5: number;
  avgVolume20: number;
  pressureLevels: LevelInfo[];
  supportLevels: LevelInfo[];
  breakoutLevels: LevelInfo[];
  signalSummary: string;
  strategyHint: string;
  volumeNote: string;
  largeOrderNote: string;
  dragonTiger: DragonTigerInfo;
  news: NewsItem[];
}

const fetcher = async (url: string): Promise<WatchlistInsight> => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error ?? "获取自选股AI分析失败");
  }
  return json.data;
};

function formatAmount(value?: number) {
  const amount = value ?? 0;
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(2)}亿`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(2)}万`;
  return amount.toFixed(0);
}

function sentimentColor(sentiment: NewsItem["sentiment"]) {
  if (sentiment === "positive") return "red";
  if (sentiment === "negative") return "green";
  return "default";
}

export default function WatchlistInsightCard({ code, name, market, compact = false }: WatchlistInsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, error, mutate } = useSWR<WatchlistInsight>(
    `/api/stocks?action=watchlist-insight&market=${market}&code=${code}&name=${encodeURIComponent(name)}`,
    fetcher,
    { refreshInterval: 60000 },
  );

  if (isLoading) {
    return <Card loading size="small" style={{ borderRadius: 18 }} />;
  }

  if (error || !data) {
    return (
      <Card size="small" style={{ borderRadius: 18 }}>
        <Alert type="warning" showIcon message={`${name}(${code}) 暂时无法生成AI分析卡`} />
      </Card>
    );
  }

  const color = getPriceColor(data.changePercent);

  return (
    <Card
      size={compact ? "small" : "default"}
      style={{ borderRadius: 18, border: `1px solid ${data.dragonTiger.isOnList ? "#ffb347" : "#e8ecf4"}` }}
      extra={
        <Space>
          {data.dragonTiger.isOnList && <Tag color="gold">龙虎榜</Tag>}
          <a href={getTonghuashunStockUrl(data.code)} target="_blank" rel="noreferrer">
            <Button size="small">详情</Button>
          </a>
          <Button size="small" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "收起" : "展开"}
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => mutate()}>
            刷新
          </Button>
        </Space>
      }
      title={
        <Space direction="vertical" size={0}>
          <Space wrap>
            <a href={getTonghuashunStockUrl(data.code)} target="_blank" rel="noreferrer">
              <Title level={compact ? 5 : 4} style={{ margin: 0 }}>{data.name}</Title>
            </a>
            <Text type="secondary">{data.code}</Text>
            <Tag color="purple">{data.concept}</Tag>
            <Tag>{data.region}</Tag>
            {data.changePercent > 2 && <Tag color="red">强势</Tag>}
            {data.volumeRatio > 1.5 && <Tag color="blue">放量</Tag>}
          </Space>
          <Space size={12} wrap>
            <Text style={{ color, fontSize: compact ? 22 : 26, fontWeight: 700 }}>{formatPrice(data.price)}</Text>
            <Text style={{ color, fontWeight: 600 }}>{formatPercent(data.changePercent)}</Text>
            <Text type="secondary">换手 {data.turnoverRate.toFixed(2)}%</Text>
            <Text type="secondary">成交额 {formatAmount(data.amount)}</Text>
          </Space>
        </Space>
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ padding: 12, background: "#fafbfc", borderRadius: 12 }}>
          <Space align="start">
            <RiseOutlined style={{ color: "#1677ff", marginTop: 4 }} />
            <div>
              <Text strong>AI结论</Text>
              <Paragraph style={{ margin: "4px 0 0", color: "#555" }}>{data.signalSummary}</Paragraph>
              <Text type="secondary">策略建议：{data.strategyHint}</Text>
            </div>
          </Space>
        </div>

        {!expanded ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Tag color="purple">概念 {data.concept}</Tag>
            <Tag>{data.region}</Tag>
            {data.dragonTiger.isOnList && <Tag icon={<WarningOutlined />} color="gold">前一交易日龙虎榜</Tag>}
            {data.news.length > 0 && <Tag color="cyan">近7日新闻 {data.news.length} 条</Tag>}
            {data.pressureLevels[0] && <Tag color="volcano">压力 {data.pressureLevels[0].price.toFixed(2)}</Tag>}
            {data.supportLevels[0] && <Tag color="green">支撑 {data.supportLevels[0].price.toFixed(2)}</Tag>}
            {data.breakoutLevels[0] && <Tag color="blue">突破 {data.breakoutLevels[0].price.toFixed(2)}</Tag>}
            <Tag color={data.volumeRatio >= 1.2 ? "processing" : "default"}>量比 {data.volumeRatio.toFixed(2)}</Tag>
          </div>
        ) : (
          <>
        <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div style={{ padding: 12, border: "1px dashed #e5e7eb", borderRadius: 12 }}>
            <Space align="start">
              <LineChartOutlined style={{ color: "#722ed1", marginTop: 4 }} />
              <div>
                <Text strong>量能与主力行为</Text>
                <Paragraph style={{ margin: "4px 0 6px", color: "#555" }}>{data.volumeNote}</Paragraph>
                <Text type="secondary">{data.largeOrderNote}</Text>
                <div style={{ marginTop: 6 }}>
                  <Tag>5日均量 {formatAmount(data.avgVolume5)}</Tag>
                  <Tag>20日均量 {formatAmount(data.avgVolume20)}</Tag>
                  <Tag color={data.volumeRatio >= 1 ? "processing" : "default"}>量比 {data.volumeRatio.toFixed(2)}</Tag>
                </div>
              </div>
            </Space>
          </div>

          <div style={{ padding: 12, border: "1px dashed #e5e7eb", borderRadius: 12 }}>
            <Space align="start">
              <FireOutlined style={{ color: "#fa8c16", marginTop: 4 }} />
              <div>
                <Text strong>关键位置</Text>
                <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                  {data.pressureLevels[0] && <Text type="secondary">压力位：{data.pressureLevels[0].price.toFixed(2)} · {data.pressureLevels[0].reason}</Text>}
                  {data.supportLevels[0] && <Text type="secondary">支撑位：{data.supportLevels[0].price.toFixed(2)} · {data.supportLevels[0].reason}</Text>}
                  {data.breakoutLevels[0] && <Text type="secondary">突破位：{data.breakoutLevels[0].price.toFixed(2)} · {data.breakoutLevels[0].reason}</Text>}
                </div>
              </div>
            </Space>
          </div>
        </div>

        {data.dragonTiger.isOnList && (
          <Alert
            type="warning"
            showIcon
            icon={<BellOutlined />}
            message={`该股上榜龙虎榜${data.dragonTiger.tradeDate ? ` · ${data.dragonTiger.tradeDate}` : ""}`}
            description={
              <div style={{ display: "grid", gap: 4 }}>
                <Text>{data.dragonTiger.reason}</Text>
                <Text type="secondary">
                  净买入 {formatAmount(data.dragonTiger.netBuy)} / 买入额 {formatAmount(data.dragonTiger.buyAmount)} / 卖出额 {formatAmount(data.dragonTiger.sellAmount)}
                </Text>
              </div>
            }
          />
        )}

        <div style={{ padding: 12, background: "#fcfcfd", borderRadius: 12 }}>
          <Space align="start">
            <NotificationOutlined style={{ color: "#13c2c2", marginTop: 4 }} />
            <div style={{ width: "100%" }}>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Text strong>相关新闻汇总</Text>
                <Link href={`/chat?stock=${data.code}`}>
                  <Button type="link" size="small">深度问AI</Button>
                </Link>
              </Space>
              <List
                size="small"
                dataSource={data.news}
                locale={{ emptyText: "暂无相关新闻" }}
                renderItem={(item) => (
                  <List.Item style={{ paddingInline: 0 }}>
                    <div style={{ width: "100%" }}>
                      <Space wrap style={{ marginBottom: 4 }}>
                        <Tag color={sentimentColor(item.sentiment)}>
                          {item.sentiment === "positive" ? "偏利多" : item.sentiment === "negative" ? "偏利空" : "中性"}
                        </Tag>
                        <Text type="secondary">{item.source}</Text>
                        <Text type="secondary">{item.date}</Text>
                      </Space>
                      <Text>{item.title}</Text>
                    </div>
                  </List.Item>
                )}
              />
            </div>
          </Space>
        </div>

        {!compact && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {data.pressureLevels.slice(0, 2).map((item) => (
              <Tag key={`p-${item.price}`} color="volcano">压力 {item.price.toFixed(2)}</Tag>
            ))}
            {data.supportLevels.slice(0, 2).map((item) => (
              <Tag key={`s-${item.price}`} color="green">支撑 {item.price.toFixed(2)}</Tag>
            ))}
            {data.breakoutLevels.slice(0, 2).map((item) => (
              <Tag key={`b-${item.price}`} color="blue">突破 {item.price.toFixed(2)}</Tag>
            ))}
            {data.dragonTiger.isOnList && <Tag icon={<WarningOutlined />} color="gold">龙虎榜关注</Tag>}
          </div>
        )}
          </>
        )}
      </div>
    </Card>
  );
}
