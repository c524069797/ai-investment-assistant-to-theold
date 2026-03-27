"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Alert, Button, Card, List, Space, Tag, Typography } from "antd";
import {
  BellOutlined,
  FireOutlined,
  LineChartOutlined,
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
    return <Card loading size="small" className="watchlist-insight-card" />;
  }

  if (error || !data) {
    return (
      <Card size="small" className="watchlist-insight-card">
        <Alert type="warning" showIcon message={`${name}(${code}) 暂时无法生成 AI 分析卡`} />
      </Card>
    );
  }

  const color = getPriceColor(data.changePercent);
  const cardBorderColor = data.dragonTiger.isOnList ? "#ffb347" : "rgba(217, 0, 27, 0.1)";

  return (
    <Card
      size={compact ? "small" : "default"}
      className={`watchlist-insight-card${compact ? " watchlist-insight-card--compact" : ""}`}
      style={{ border: `1px solid ${cardBorderColor}` }}
      extra={
        <Space size={8} wrap className="watchlist-insight-card__toolbar">
          {data.dragonTiger.isOnList ? <Tag color="gold">龙虎榜</Tag> : null}
          <a href={getTonghuashunStockUrl(data.code)} target="_blank" rel="noreferrer">
            <Button size="small" className="watchlist-insight-card__link-btn">同花顺</Button>
          </a>
          <Button size="small" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "收起详情" : "展开详情"}
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => mutate()}>
            刷新
          </Button>
        </Space>
      }
      title={
        <div className="watchlist-insight-card__title-block">
          <div className="watchlist-insight-card__title-row">
            <a href={getTonghuashunStockUrl(data.code)} target="_blank" rel="noreferrer" className="watchlist-insight-card__name-link">
              <Title level={compact ? 5 : 4} className="watchlist-insight-card__title">{data.name}</Title>
            </a>
            <Text type="secondary">{data.code}</Text>
          </div>
          <div className="watchlist-insight-card__meta-row">
            <Tag color="purple">{data.concept}</Tag>
            <Tag>{data.region}</Tag>
            {data.changePercent > 2 ? <Tag color="red">强势</Tag> : null}
            {data.volumeRatio > 1.5 ? <Tag color="blue">放量</Tag> : null}
          </div>
          <div className="watchlist-insight-card__stats-row">
            <Text className="watchlist-insight-card__price" style={{ color }}>{formatPrice(data.price)}</Text>
            <Text className="watchlist-insight-card__change" style={{ color }}>{formatPercent(data.changePercent)}</Text>
            <Text className="watchlist-insight-card__meta">换手 {data.turnoverRate.toFixed(2)}%</Text>
            <Text className="watchlist-insight-card__meta">成交额 {formatAmount(data.amount)}</Text>
          </div>
        </div>
      }
    >
      <div className="watchlist-insight-card__summary">
        <div className="watchlist-insight-card__summary-head">
          <RiseOutlined className="watchlist-insight-card__summary-icon" />
          <div className="watchlist-insight-card__summary-body">
            <Text strong>AI 结论</Text>
            <Paragraph className="watchlist-insight-card__summary-text">{data.signalSummary}</Paragraph>
            <Text type="secondary">策略建议：{data.strategyHint}</Text>
          </div>
        </div>
      </div>

      {!expanded ? (
        <div className="watchlist-insight-card__chip-grid">
          <Tag color="purple">概念 {data.concept}</Tag>
          <Tag>{data.region}</Tag>
          {data.dragonTiger.isOnList ? <Tag icon={<WarningOutlined />} color="gold">前一交易日龙虎榜</Tag> : null}
          {data.news.length ? <Tag color="cyan">近 7 日新闻 {data.news.length} 条</Tag> : null}
          {data.pressureLevels[0] ? <Tag color="volcano">压力 {data.pressureLevels[0].price.toFixed(2)}</Tag> : null}
          {data.supportLevels[0] ? <Tag color="green">支撑 {data.supportLevels[0].price.toFixed(2)}</Tag> : null}
          {data.breakoutLevels[0] ? <Tag color="blue">突破 {data.breakoutLevels[0].price.toFixed(2)}</Tag> : null}
          <Tag color={data.volumeRatio >= 1.2 ? "processing" : "default"}>量比 {data.volumeRatio.toFixed(2)}</Tag>
        </div>
      ) : (
        <>
          <div className="watchlist-insight-card__detail-grid">
            <div className="watchlist-insight-card__detail-panel">
              <div className="watchlist-insight-card__detail-head">
                <LineChartOutlined className="watchlist-insight-card__detail-icon watchlist-insight-card__detail-icon--volume" />
                <div>
                  <Text className="watchlist-insight-card__detail-title">量能与主力行为</Text>
                  <Paragraph className="watchlist-insight-card__detail-text">{data.volumeNote}</Paragraph>
                  <Text className="watchlist-insight-card__detail-note">{data.largeOrderNote}</Text>
                </div>
              </div>
              <div className="watchlist-insight-card__badge-row">
                <Tag>5日均量 {formatAmount(data.avgVolume5)}</Tag>
                <Tag>20日均量 {formatAmount(data.avgVolume20)}</Tag>
                <Tag color={data.volumeRatio >= 1 ? "processing" : "default"}>量比 {data.volumeRatio.toFixed(2)}</Tag>
              </div>
            </div>

            <div className="watchlist-insight-card__detail-panel">
              <div className="watchlist-insight-card__detail-head">
                <FireOutlined className="watchlist-insight-card__detail-icon watchlist-insight-card__detail-icon--level" />
                <div>
                  <Text className="watchlist-insight-card__detail-title">关键位置</Text>
                  <div className="watchlist-insight-card__level-list">
                    {data.pressureLevels[0] ? <div>压力位：{data.pressureLevels[0].price.toFixed(2)} · {data.pressureLevels[0].reason}</div> : null}
                    {data.supportLevels[0] ? <div>支撑位：{data.supportLevels[0].price.toFixed(2)} · {data.supportLevels[0].reason}</div> : null}
                    {data.breakoutLevels[0] ? <div>突破位：{data.breakoutLevels[0].price.toFixed(2)} · {data.breakoutLevels[0].reason}</div> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {data.dragonTiger.isOnList ? (
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
          ) : null}

          <div className="watchlist-insight-card__news">
            <div className="watchlist-insight-card__news-head">
              <div>
                <Text strong>相关新闻汇总</Text>
                <div className="watchlist-insight-card__news-meta">
                  <Text type="secondary">近 7 日内与 {data.name} 相关的热点信息</Text>
                </div>
              </div>
              <div className="watchlist-insight-card__news-actions">
                <Link href={`/chat?stock=${data.code}&name=${encodeURIComponent(data.name)}`}>
                  <Button type="link" size="small">交给 AI 深挖</Button>
                </Link>
              </div>
            </div>
            <List
              size="small"
              dataSource={data.news}
              locale={{ emptyText: "暂无相关新闻" }}
              renderItem={(item) => (
                <List.Item className="watchlist-insight-card__news-item">
                  <div style={{ width: "100%" }}>
                    <div className="watchlist-insight-card__news-meta">
                      <Tag color={sentimentColor(item.sentiment)}>
                        {item.sentiment === "positive" ? "偏利多" : item.sentiment === "negative" ? "偏利空" : "中性"}
                      </Tag>
                      <Text type="secondary">{item.source}</Text>
                      <Text type="secondary">{item.date}</Text>
                    </div>
                    <Text className="watchlist-insight-card__news-title">{item.title}</Text>
                  </div>
                </List.Item>
              )}
            />
          </div>

          {!compact ? (
            <div className="watchlist-insight-card__chip-grid">
              {data.pressureLevels.slice(0, 2).map((item) => (
                <Tag key={`p-${item.price}`} color="volcano">压力 {item.price.toFixed(2)}</Tag>
              ))}
              {data.supportLevels.slice(0, 2).map((item) => (
                <Tag key={`s-${item.price}`} color="green">支撑 {item.price.toFixed(2)}</Tag>
              ))}
              {data.breakoutLevels.slice(0, 2).map((item) => (
                <Tag key={`b-${item.price}`} color="blue">突破 {item.price.toFixed(2)}</Tag>
              ))}
              {data.dragonTiger.isOnList ? <Tag icon={<WarningOutlined />} color="gold">龙虎榜关注</Tag> : null}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
