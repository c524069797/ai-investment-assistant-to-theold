"use client";

import { Typography, Card, Row, Col, Button, Space, Alert, Spin, Segmented, Tag } from "antd";
import {
  RobotOutlined,
  StockOutlined,
  ReadOutlined,
  StarOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  AimOutlined,
  FundProjectionScreenOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { useMarketIndices } from "@/lib/hooks/useStockData";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import StockCard from "@/components/stock/StockCard";
import FundCard from "@/components/fund/FundCard";
import type { FundEstimate } from "@/types/fund";
import { STRATEGY_MODES, type StrategyMode } from "@/lib/constants/market";
import { formatPercent, getPriceColor } from "@/styles/stock-colors";
import WatchlistInsightCard from "@/components/stock/WatchlistInsightCard";
import { getTonghuashunIndexUrl } from "@/lib/utils/stock-links";

const { Title, Text, Paragraph } = Typography;

const ACTION_ENTRIES = [
  { href: "/stocks", icon: <StockOutlined />, label: "沪深行情" },
  { href: "/strategy", icon: <AimOutlined />, label: "策略筛选" },
  { href: "/chat", icon: <RobotOutlined />, label: "AI 分析" },
  { href: "/watchlist", icon: <StarOutlined />, label: "自选复盘" },
  { href: "/education", icon: <ReadOutlined />, label: "投资学堂" },
  { href: "/funds", icon: <FundProjectionScreenOutlined />, label: "基金对比" },
];

export default function HomePage() {
  const { data: indices, isLoading: indicesLoading, mutate: mutateIndices } = useMarketIndices();
  const { items: watchlist } = useWatchlist();
  const [strategy, setStrategy] = useState<StrategyMode>("conservative");

  const currentStrategy = STRATEGY_MODES[strategy];

  return (
    <div className="page-container">
      <HeroSummary watchlist={watchlist} />

      <WatchlistSummaryGrid watchlist={watchlist} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card>
            <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Title level={4} className="section-title">A股实时指数</Title>
                <Text className="section-subtitle">上证/深证/创业板核心指数，15秒自动刷新</Text>
              </div>
              <Button icon={<ReloadOutlined />} onClick={() => mutateIndices()} title="手动刷新">
                刷新
              </Button>
            </div>

            {indicesLoading ? (
              <div style={{ textAlign: "center", padding: 20 }}><Spin /></div>
            ) : indices ? (
              <Row gutter={[12, 12]}>
                {indices.map((idx) => (
                  <Col xs={24} sm={12} key={idx.code}>
                    <StockCard stock={idx} linkTo={getTonghuashunIndexUrl(idx.code)} />
                  </Col>
                ))}
              </Row>
            ) : (
              <Text type="secondary">暂无数据</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="⭐ 自选股总结"
            extra={<Link href="/watchlist"><Button type="link">查看全部</Button></Link>}
          >
            {watchlist.filter((item) => item.type === "stock").length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {watchlist
                  .filter((item) => item.type === "stock")
                  .slice(0, 2)
                  .map((item) => (
                    <WatchlistInsightCard key={`${item.type}-${item.code}`} code={item.code} name={item.name} market={item.market} compact />
                  ))}
              </div>
            ) : (
              <Alert
                type="info"
                showIcon
                message="先添加自选股，首页才会展示 AI 深度分析"
                description="当前版本会定时刷新自选股分析卡；若后续接入后端推送，可进一步升级为实时监控。"
              />
            )}
          </Card>
        </Col>
      </Row>

      <IndexAnalysis />

      <Card
        title="🎯 A股策略模式"
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
              <Space direction="vertical" size={4}>
                <Text style={{ fontSize: 15 }}>• <strong>买入区间</strong>：RSI &lt; 30、靠近布林带下轨、回踩年线</Text>
                <Text style={{ fontSize: 15 }}>• <strong>分批原则</strong>：先轻仓试错，再根据成交量确认加仓</Text>
                <Text style={{ fontSize: 15 }}>• <strong>止盈纪律</strong>：单笔目标 8%-12%，不贪多</Text>
                <Text style={{ fontSize: 15 }}>• <strong>适用市场</strong>：震荡市和高股息权重股</Text>
              </Space>
            ) : (
              <Space direction="vertical" size={4}>
                <Text style={{ fontSize: 15 }}>• <strong>触发条件</strong>：题材热度提升 + 放量突破 + 换手活跃</Text>
                <Text style={{ fontSize: 15 }}>• <strong>止盈策略</strong>：分级止盈，先锁定 10% 再看趋势</Text>
                <Text style={{ fontSize: 15 }}>• <strong>止损规则</strong>：跌破关键支撑线，严格退出</Text>
                <Text style={{ fontSize: 15 }}>• <strong>适用市场</strong>：趋势市和题材轮动行情</Text>
              </Space>
            )}
          </div>
        </div>
      </Card>

      <Card title="🚀 交易功能区" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} className="action-grid">
          {ACTION_ENTRIES.map((entry) => (
            <Col xs={8} sm={8} md={4} key={entry.href}>
              <Link href={entry.href}>
                <div className="action-tile">
                  <div className="action-icon">{entry.icon}</div>
                  <Text className="action-label">{entry.label}</Text>
                </div>
              </Link>
            </Col>
          ))}
        </Row>
      </Card>

      {watchlist.length > 0 && (
        <Card
          title="⭐ 我的自选股 AI 分析"
          extra={<Link href="/watchlist"><Button type="link">查看全部</Button></Link>}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[12, 12]}>
            {watchlist.slice(0, 4).map((item) => (
              <Col xs={24} key={`${item.type}-${item.code}`}>
                {item.type === "stock" ? (
                  <WatchlistInsightCard code={item.code} name={item.name} market={item.market} compact />
                ) : (
                  <WatchlistFundPreview code={item.code} name={item.name} />
                )}
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <Alert
        message="A股交易风险提示"
        description="市场波动受政策、流动性和情绪影响较大。页面中的 AI 评分和策略建议仅用于研究与学习，不构成任何投资建议。"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
    </div>
  );
}

// --- Watchlist preview components with real-time data ---

interface WatchlistInsightSummary {
  code: string;
  name: string;
  market: number;
  changePercent: number;
  volumeRatio: number;
  concept: string;
  dragonTiger: { isOnList: boolean };
  news: Array<{ date: string }>;
  breakoutLevels: Array<{ price: number }>;
  pressureLevels: Array<{ price: number }>;
}

function useWatchlistSummaryData(watchlist: Array<{ code: string; name: string; market: number; type: string }>) {
  const stockItems = watchlist.filter((item) => item.type === "stock").slice(0, 6);
  const summaryKey = stockItems.length > 0
    ? `/api/stocks?action=watchlist-summary&items=${encodeURIComponent(JSON.stringify(stockItems.map((item) => ({ code: item.code, name: item.name, market: item.market }))))}`
    : null;

  const { data, isLoading } = useSWR<WatchlistInsightSummary[]>(summaryKey, watchlistFetcher, {
    refreshInterval: 60000,
  });

  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        stockCount: stockItems.length,
        upCount: 0,
        downCount: 0,
        strongCount: 0,
        dragonTigerCount: 0,
        newsCount: 0,
        topGainer: null as WatchlistInsightSummary | null,
        topLoser: null as WatchlistInsightSummary | null,
        strongestNames: "暂无",
        heroText: "先添加自选股，首页才会自动生成今日自选股分析结果。",
        focusText: "先添加自选股后，这里会自动生成今日自选股总结。",
      };
    }

    const upCount = data.filter((item) => item.changePercent > 0).length;
    const downCount = data.filter((item) => item.changePercent < 0).length;
    const strongCount = data.filter((item) => item.changePercent > 0).length;
    const dragonTigerCount = data.filter((item) => item.dragonTiger.isOnList).length;
    const newsCount = data.reduce((sum, item) => sum + item.news.length, 0);
    const topGainer = [...data].sort((a, b) => b.changePercent - a.changePercent)[0] ?? null;
    const topLoser = [...data].sort((a, b) => a.changePercent - b.changePercent)[0] ?? null;
    const strongestNames = data
      .filter((item) => item.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 2)
      .map((item) => `${item.name} ${formatPercent(item.changePercent)}`)
      .join("，") || "暂无偏强个股";

    const sorted = [...data].sort((a, b) => {
      const scoreA = (a.dragonTiger.isOnList ? 100 : 0) + a.news.length * 10 + a.volumeRatio * 5 + Math.max(a.changePercent, 0);
      const scoreB = (b.dragonTiger.isOnList ? 100 : 0) + b.news.length * 10 + b.volumeRatio * 5 + Math.max(b.changePercent, 0);
      return scoreB - scoreA;
    });

    const focus = sorted[0];
    const heroText = `你的自选股今天 ${upCount} 涨 ${downCount} 跌${topGainer ? `，涨得最多是 ${topGainer.name} ${formatPercent(topGainer.changePercent)}` : ""}${topLoser ? `，跌得最多是 ${topLoser.name} ${formatPercent(topLoser.changePercent)}` : ""}。${focus ? `当前优先关注 ${focus.name}` : ""}${focus?.dragonTiger.isOnList ? "，它出现在前一交易日龙虎榜" : ""}${focus && focus.news.length > 0 ? `，近7日有 ${focus.news.length} 条新闻。` : "。"}`;
    const focusText = focus
      ? `${focus.name}（${focus.concept}）当前优先级最高${focus.dragonTiger.isOnList ? "，前一交易日上榜龙虎榜" : ""}${focus.news.length > 0 ? `，近7日有 ${focus.news.length} 条新闻` : ""}。`
      : "今日暂无明显优先盯盘标的。";

    return {
      stockCount: stockItems.length,
      upCount,
      downCount,
      strongCount,
      dragonTigerCount,
      newsCount,
      topGainer,
      topLoser,
      strongestNames,
      heroText,
      focusText,
    };
  }, [data, stockItems.length]);

  return { stockItems, data, isLoading, summary };
}

function HeroSummary({ watchlist }: { watchlist: Array<{ code: string; name: string; market: number; type: string }> }) {
  const { summary } = useWatchlistSummaryData(watchlist);

  return (
    <Card
      style={{
        marginBottom: 16,
        borderRadius: 22,
        border: "1px solid #0f172a0f",
        background: "linear-gradient(135deg, #0b1220 0%, #18263f 45%, #273b5f 100%)",
        boxShadow: "0 20px 36px rgba(15, 23, 42, 0.22)",
      }}
      styles={{ body: { padding: 28 } }}
    >
      <Text style={{ color: "#c3d3f4", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>A股 · 我的自选股 AI 决策台</Text>
      <Title level={2} style={{ color: "#fff", margin: "6px 0", lineHeight: 1.25 }}>爸爸的a股智能分析</Title>
      <Paragraph style={{ color: "#d2deef", marginBottom: 18, fontSize: 16 }}>
        {summary.heroText}
      </Paragraph>
      <div className="hero-actions">
        <Link href="/watchlist">
          <Button type="primary" size="large" icon={<StarOutlined />}>
            查看自选股分析
          </Button>
        </Link>
        <Link href="/chat">
          <Button size="large" icon={<RobotOutlined />}>
            深度问AI
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function WatchlistSummaryGrid({ watchlist }: { watchlist: Array<{ code: string; name: string; market: number; type: string }> }) {
  const { stockItems, isLoading, summary } = useWatchlistSummaryData(watchlist);

  return (
    <Row gutter={[12, 12]} className="summary-grid" style={{ marginBottom: 16 }}>
      <Col xs={12} md={6}>
        <Card className="summary-card">
          <Text className="summary-label">自选股数量</Text>
          <div className="summary-value">{stockItems.length}</div>
          <Text className="summary-trend">今日跟踪池</Text>
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card className="summary-card">
          <Text className="summary-label">偏强个股</Text>
          <div className="summary-value up">{isLoading ? "-" : summary.strongCount}</div>
          <Text className="summary-trend">{summary.strongestNames}</Text>
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card className="summary-card">
          <Text className="summary-label">龙虎榜关注</Text>
          <div className="summary-value" style={{ color: "#d48806" }}>{isLoading ? "-" : summary.dragonTigerCount}</div>
          <Text className="summary-trend">以前一交易日为准</Text>
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card className="summary-card">
          <Text className="summary-label">近7日新闻</Text>
          <div className="summary-value" style={{ color: "#1677ff" }}>{isLoading ? "-" : summary.newsCount}</div>
          <Text className="summary-trend">{summary.focusText}</Text>
        </Card>
      </Col>
    </Row>
  );
}

const watchlistFetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
};

function WatchlistFundPreview({ code, name }: { code: string; name: string }) {
  const { data: estimate, isLoading } = useSWR<FundEstimate>(
    `/api/funds?action=estimate&code=${code}`,
    watchlistFetcher,
    { refreshInterval: 30000 },
  );

  if (isLoading) {
    return <Card size="small" loading />;
  }

  if (estimate) {
    return (
      <FundCard
        fund={estimate}
        linkTo={`/funds/${code}`}
      />
    );
  }

  return (
    <FundCard
      fund={{ code, name, type: "基金", changePercent: 0 }}
      linkTo={`/funds/${code}`}
    />
  );
}

// --- Index Technical Analysis (client-side, based on price levels) ---

interface LevelInfo {
  price: number;
  reason: string;
}

interface IndexLevelAnalysis {
  name: string;
  code: string;
  price: number;
  changePercent: number;
  preClose: number;
  trend: string;
  trendReason: string;
  resistances: LevelInfo[];
  supports: LevelInfo[];
  notes: string[];
}

function analyzeIndexLevels(
  name: string,
  code: string,
  price: number,
  changePercent: number,
  volume: number,
  amount: number,
): IndexLevelAnalysis {
  const preClose = price / (1 + changePercent / 100);

  // Determine round-number step based on price magnitude
  const step = price > 10000 ? 500 : price > 3000 ? 100 : 50;

  const supports: LevelInfo[] = [];
  const resistances: LevelInfo[] = [];

  // Round-number levels (psychological)
  const nearestRoundBelow = Math.floor(price / step) * step;
  const nearestRoundAbove = Math.ceil(price / step) * step;

  if (nearestRoundAbove > price * 1.001) {
    resistances.push({ price: nearestRoundAbove, reason: `${nearestRoundAbove} 整数关口压力` });
  }
  if (nearestRoundBelow < price * 0.999) {
    supports.push({ price: nearestRoundBelow, reason: `${nearestRoundBelow} 整数关口支撑` });
  }

  // Next round number
  const nextRoundAbove = nearestRoundAbove + step;
  if (nextRoundAbove > price) {
    resistances.push({ price: nextRoundAbove, reason: `${nextRoundAbove} 上方第二关口` });
  }
  const nextRoundBelow = nearestRoundBelow - step;
  if (nextRoundBelow > 0 && nextRoundBelow < price) {
    supports.push({ price: nextRoundBelow, reason: `${nextRoundBelow} 下方第二关口` });
  }

  // Yesterday's close as reference
  const preCloseRound = Math.round(preClose * 100) / 100;
  if (Math.abs(preCloseRound - price) / price > 0.001) {
    if (preCloseRound > price) {
      resistances.push({ price: preCloseRound, reason: "昨日收盘价压力" });
    } else {
      supports.push({ price: preCloseRound, reason: "昨日收盘价支撑" });
    }
  }

  // Percentage-based levels (±2%, ±3%, ±5%)
  const up3 = Math.round(preClose * 1.03 * 100) / 100;
  const down3 = Math.round(preClose * 0.97 * 100) / 100;
  if (up3 > price) {
    resistances.push({ price: up3, reason: "日涨3%阻力位" });
  }
  if (down3 < price) {
    supports.push({ price: down3, reason: "日跌3%支撑位" });
  }

  // Sort and limit
  const sortedResistances = resistances
    .filter((r) => r.price > price)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);
  const sortedSupports = supports
    .filter((s) => s.price < price)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  // Trend
  let trend: string;
  let trendReason: string;
  if (changePercent > 1) {
    trend = "偏多";
    trendReason = `今日上涨 ${changePercent.toFixed(2)}%，多方占优，量能${amount > 0 ? "配合" : "待观察"}`;
  } else if (changePercent < -1) {
    trend = "偏空";
    trendReason = `今日下跌 ${changePercent.toFixed(2)}%，空方主导，注意风险控制`;
  } else if (changePercent > 0) {
    trend = "震荡偏多";
    trendReason = `小幅上涨 ${changePercent.toFixed(2)}%，多空拉锯中，方向待确认`;
  } else if (changePercent < 0) {
    trend = "震荡偏空";
    trendReason = `小幅下跌 ${changePercent.toFixed(2)}%，上方压力较重，等待方向`;
  } else {
    trend = "平盘";
    trendReason = "多空平衡，等待突破方向";
  }

  // Notes
  const notes: string[] = [];
  if (Math.abs(price - nearestRoundAbove) / price < 0.005) {
    notes.push(`逼近 ${nearestRoundAbove} 整数关口，突破放量则打开上行空间`);
  }
  if (Math.abs(price - nearestRoundBelow) / price < 0.005) {
    notes.push(`接近 ${nearestRoundBelow} 整数关口，跌破可能加速下行`);
  }
  if (changePercent > 2) {
    notes.push("涨幅较大，短线注意获利回吐压力");
  }
  if (changePercent < -2) {
    notes.push("跌幅较深，关注是否出现恐慌性抛售或超跌反弹");
  }

  return {
    name,
    code,
    price,
    changePercent,
    preClose: preCloseRound,
    trend,
    trendReason,
    resistances: sortedResistances,
    supports: sortedSupports,
    notes,
  };
}

function IndexAnalysis() {
  const { data: indices, isLoading } = useMarketIndices();

  const analysisData = useMemo(() => {
    if (!indices || indices.length === 0) return [];
    // Only analyze the main 3 indices
    const targets = ["000001", "000300", "399006"];
    return indices
      .filter((idx) => targets.includes(idx.code))
      .map((idx) => analyzeIndexLevels(idx.name, idx.code, idx.price, idx.changePercent, idx.volume, idx.amount));
  }, [indices]);

  const trendIcon = (trend: string) => {
    if (trend.includes("多")) return <ArrowUpOutlined style={{ color: "#cf1322" }} />;
    if (trend.includes("空")) return <ArrowDownOutlined style={{ color: "#389e0d" }} />;
    return <MinusOutlined style={{ color: "#8c8c8c" }} />;
  };

  const trendColor = (trend: string) => {
    if (trend.includes("多")) return "red" as const;
    if (trend.includes("空")) return "green" as const;
    return "default" as const;
  };

  return (
    <Card
      title="📐 指数关键价位分析 — 压力位与支撑位"
      style={{ marginBottom: 16 }}
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 30 }}><Spin tip="加载中..." /></div>
      ) : analysisData.length > 0 ? (
        <Row gutter={[16, 16]}>
          {analysisData.map((idx) => (
            <Col xs={24} md={8} key={idx.code}>
              <Card
                size="small"
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {trendIcon(idx.trend)}
                    <span style={{ fontWeight: 700 }}>{idx.name}</span>
                    <Tag color={trendColor(idx.trend)}>{idx.trend}</Tag>
                  </div>
                }
                style={{ height: "100%" }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 20, fontWeight: 700, color: getPriceColor(idx.changePercent) }}>
                    {idx.price.toFixed(2)}
                  </Text>
                  <Text style={{ color: getPriceColor(idx.changePercent), marginLeft: 8 }}>
                    {formatPercent(idx.changePercent)}
                  </Text>
                </div>

                <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                  {idx.trendReason}
                </Text>

                {/* Resistance levels */}
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 13, color: "#389e0d" }}>压力位（上方阻力）</Text>
                  <div style={{ marginTop: 4 }}>
                    {idx.resistances.map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                        <Text style={{ fontSize: 13 }}>{r.reason}</Text>
                        <Text strong style={{ fontSize: 13, color: "#389e0d" }}>{r.price.toFixed(2)}</Text>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Support levels */}
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 13, color: "#cf1322" }}>支撑位（下方支撑）</Text>
                  <div style={{ marginTop: 4 }}>
                    {idx.supports.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                        <Text style={{ fontSize: 13 }}>{s.reason}</Text>
                        <Text strong style={{ fontSize: 13, color: "#cf1322" }}>{s.price.toFixed(2)}</Text>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key notes */}
                {idx.notes.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {idx.notes.map((note, i) => (
                      <Alert key={i} type="info" description={note} showIcon style={{ marginBottom: 4, padding: "4px 8px" }} />
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Text type="secondary">暂无分析数据</Text>
      )}
    </Card>
  );
}
