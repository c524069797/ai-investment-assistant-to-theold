"use client";

import { useState } from "react";
import { Typography, Card, Row, Col, Segmented, Space, Input, Button, Spin, Alert, Descriptions, Tag, Empty, Divider } from "antd";
import {
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ArrowRightOutlined,
  FireOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import useSWR from "swr";
import { getPriceColor, formatPercent, formatAmount } from "@/styles/stock-colors";
import type { StrategyMode } from "@/lib/constants/market";
import MarketingVisual from "@/components/marketing/MarketingVisual";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
};

export default function StrategyPage() {
  const [mode, setMode] = useState<StrategyMode>("conservative");
  const [stockCode, setStockCode] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  return (
    <div className="page-container strategy-page">
      <Card className="dashboard-hero stocks-hero" style={{ marginBottom: 16 }}>
        <div className="page-visual-hero">
          <div className="page-visual-hero__content">
            <Text className="hero-eyebrow">策略 · 场景筛选</Text>
            <Title level={2} className="hero-title">策略筛选</Title>
            <Paragraph className="hero-subtitle">
              根据保守抄底与热点捕捉两类场景扫描机会，把筛选结果交给 AI 做进一步解释。
            </Paragraph>
          </div>
          <MarketingVisual
            alt="AI 策略筛选和风险提示界面展示"
            className="page-visual-hero__media"
            src="/marketing/hero-stocks.png"
            tone="compact"
          />
        </div>
      </Card>

      {/* Mode Selector */}
      <Card style={{ marginBottom: 16 }}>
        <Segmented
          block
          size="large"
          options={[
            {
              label: (
                <Space>
                  <SafetyCertificateOutlined />
                  <span>🛡️ 爸爸模式 — 抄底耐力王</span>
                </Space>
              ),
              value: "conservative",
            },
            {
              label: (
                <Space>
                  <ThunderboltOutlined />
                  <span>🔥 妈妈模式 — 热点捕捉者</span>
                </Space>
              ),
              value: "aggressive",
            },
          ]}
          value={mode}
          onChange={(val) => setMode(val as StrategyMode)}
        />
      </Card>

      {mode === "conservative" ? (
        <ConservativeMode
          stockCode={stockCode}
          searchCode={searchCode}
          onSearch={(code) => {
            setStockCode(code);
            setSearchCode(code);
          }}
        />
      ) : (
        <AggressiveMode
          searchKeyword={searchKeyword}
          onSearch={(kw) => {
            setSearchKeyword(kw);
          }}
        />
      )}
    </div>
  );
}

function ConservativeMode({
  stockCode,
  searchCode,
  onSearch,
}: {
  stockCode: string;
  searchCode: string;
  onSearch: (code: string) => void;
}) {
  const [input, setInput] = useState("");

  // Auto-scan: top 10 bottom signals from high-volume stocks
  const { data: scanResults, isLoading: scanLoading } = useSWR(
    "/api/stocks?action=strategy-scan&mode=conservative&count=10",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  // First search for the stock to get market info
  const { data: searchResults } = useSWR(
    searchCode ? `/api/stocks?action=search&keyword=${encodeURIComponent(searchCode)}` : null,
    fetcher,
  );

  const firstResult = searchResults?.[0];
  const market = firstResult?.market ?? (stockCode.startsWith("6") ? 1 : 0);
  const resolvedCode = firstResult?.code ?? stockCode;

  // Fetch KLine for analysis
  const { data: klineData, isLoading: klineLoading } = useSWR(
    resolvedCode ? `/api/stocks?action=kline&market=${market}&code=${resolvedCode}&period=daily&count=300` : null,
    fetcher,
  );

  // Fetch quote
  const { data: quote } = useSWR(
    resolvedCode ? `/api/stocks?action=quote&market=${market}&code=${resolvedCode}` : null,
    fetcher,
  );

  // Calculate indicators client-side
  const analysis = klineData ? analyzeBottomSignals(klineData) : null;

  return (
    <>
      {/* Strategy Description */}
      <Card style={{ marginBottom: 16, borderLeft: "4px solid #1677ff" }}>
        <Title level={4} style={{ margin: "0 0 8px" }}>🛡️ 抄底耐力王策略</Title>
        <Paragraph style={{ fontSize: 16, color: "#666" }}>
          均值回归策略 — 寻找股价严重偏离均值或触及关键支撑位的机会，分批买入，耐心持有。
        </Paragraph>
        <div style={{ background: "#f6f8fa", padding: 12, borderRadius: 8 }}>
          <Space orientation="vertical" size={4}>
            <Text>📌 <strong>监控指标</strong>：RSI &lt; 30（超卖）、布林带下轨、250日均线</Text>
            <Text>📌 <strong>买入条件</strong>：多指标共振 + 股价处于近一年最低10%区间</Text>
            <Text>📌 <strong>止盈</strong>：盈利达 10% 时分批卖出</Text>
            <Text>📌 <strong>补仓</strong>：下跌超 5%，评估基本面后分批补仓</Text>
          </Space>
        </div>
      </Card>

      {/* Auto Scan Results */}
      <Card
        title="📊 今日抄底机会（成交额 Top50 中信号最强）"
        style={{ marginBottom: 16, borderLeft: "4px solid #1677ff" }}
      >
        {scanLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin tip="正在扫描全市场，分析抄底信号..." size="large" />
          </div>
        ) : scanResults && scanResults.length > 0 ? (
          <Row gutter={[12, 12]}>
            {scanResults.map((stock: ConservativeScanResult) => {
              const signalColor = stock.signalStrength >= 5 ? "#52c41a" : stock.signalStrength >= 3 ? "#faad14" : "#fa8c16";
              const signalLabel = stock.signalStrength >= 5 ? "强烈关注" : stock.signalStrength >= 3 ? "值得关注" : "轻度关注";
              return (
                <Col xs={24} sm={12} key={stock.code}>
                  <Link href={`/stocks/${stock.code}?market=${stock.market}`}>
                    <Card
                      size="small"
                      hoverable
                      style={{ borderLeft: `4px solid ${signalColor}` }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ marginBottom: 4 }}>
                            <Text strong style={{ fontSize: 17 }}>{stock.name}</Text>
                            <Text type="secondary" style={{ marginLeft: 8 }}>{stock.code}</Text>
                            {stock.industry && <Tag color="blue" style={{ marginLeft: 6 }}>{stock.industry}</Tag>}
                          </div>
                          <div style={{ marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                            {stock.pe > 0 && <Tag style={{ fontSize: 12 }}>PE {stock.pe.toFixed(1)}</Tag>}
                            {stock.pb > 0 && <Tag style={{ fontSize: 12 }}>PB {stock.pb.toFixed(2)}</Tag>}
                            {stock.totalMarketCap > 0 && <Tag style={{ fontSize: 12 }}>市值 {formatAmount(stock.totalMarketCap)}</Tag>}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <Text style={{ color: getPriceColor(stock.changePercent), fontWeight: 700, fontSize: 16 }}>
                              ¥{stock.price.toFixed(2)}
                            </Text>
                            <Text style={{ color: getPriceColor(stock.changePercent), marginLeft: 8 }}>
                              {formatPercent(stock.changePercent)}
                            </Text>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {stock.signals.map((signal: string, i: number) => (
                              <Tag key={i} color="red" style={{ fontSize: 12 }}>{signal}</Tag>
                            ))}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", minWidth: 80 }}>
                          <Tag color={stock.signalStrength >= 5 ? "green" : stock.signalStrength >= 3 ? "gold" : "orange"} style={{ fontSize: 14, padding: "2px 8px" }}>
                            {stock.signalStrength}/8
                          </Tag>
                          <div style={{ fontSize: 12, color: signalColor, marginTop: 4 }}>{signalLabel}</div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Empty description="当前成交额 Top50 中暂无明显抄底信号" />
        )}
      </Card>

      <Divider />

      {/* Stock Search */}
      <Card title="🔍 手动输入股票代码分析" style={{ marginBottom: 16 }}>
        <Search
          placeholder="输入股票代码或名称，如 600519 或 贵州茅台"
          size="large"
          enterButton={<><SearchOutlined /> 分析</>}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSearch={(value) => {
            if (value.trim()) onSearch(value.trim());
          }}
          allowClear
        />
      </Card>

      {/* Analysis Results */}
      {searchCode && (
        <Card
          title={`📊 技术分析：${quote?.name ?? resolvedCode}`}
          extra={
            resolvedCode && (
              <Link href={`/stocks/${resolvedCode}?market=${market}`}>
                <Button type="link" icon={<ArrowRightOutlined />}>详情</Button>
              </Link>
            )
          }
        >
          {klineLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}><Spin tip="分析中..." size="large" /></div>
          ) : analysis ? (
            <>
              {/* Signal Strength */}
              <Alert
                type={analysis.signalStrength >= 5 ? "success" : analysis.signalStrength >= 3 ? "warning" : "info"}
                title={analysis.recommendation}
                description={`信号强度：${analysis.signalStrength}/8`}
                showIcon
                style={{ marginBottom: 16 }}
              />

              {/* Indicators */}
              <Descriptions title="技术指标" column={{ xs: 2, sm: 3 }} bordered size="middle">
                <Descriptions.Item label="RSI(14)">
                  <Text style={{ color: analysis.rsi < 30 ? "#cf1322" : analysis.rsi > 70 ? "#389e0d" : "#333" }}>
                    {analysis.rsi.toFixed(1)}
                    {analysis.rsi < 30 ? " 超卖" : analysis.rsi > 70 ? " 超买" : ""}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="布林带下轨">
                  {analysis.bollinger?.lower.toFixed(2) ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="布林带中轨">
                  {analysis.bollinger?.middle.toFixed(2) ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="20日均线">
                  {analysis.ma20?.toFixed(2) ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="60日均线">
                  {analysis.ma60?.toFixed(2) ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="250日均线">
                  {analysis.ma250?.toFixed(2) ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="年内百分位">
                  <Text style={{ color: analysis.yearlyPercentile <= 20 ? "#cf1322" : "#333" }}>
                    {analysis.yearlyPercentile.toFixed(0)}%
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="当前价格">
                  {quote ? (
                    <Text style={{ color: getPriceColor(quote.changePercent), fontWeight: 700 }}>
                      {quote.price.toFixed(2)}
                    </Text>
                  ) : "-"}
                </Descriptions.Item>
              </Descriptions>

              {/* Signals */}
              {analysis.signals.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text strong style={{ fontSize: 16 }}>触发信号：</Text>
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {analysis.signals.map((signal, i) => (
                      <Tag key={i} color="red" style={{ fontSize: 14, padding: "4px 12px" }}>
                        {signal}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Empty description="暂无分析数据" />
          )}
        </Card>
      )}

      {/* Ask AI */}
      <Card style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/chat">
          <Button type="primary" size="large">💬 让 AI 助手用「抄底耐力王」策略帮我分析</Button>
        </Link>
      </Card>
    </>
  );
}

function AggressiveMode({
  searchKeyword,
  onSearch,
}: {
  searchKeyword: string;
  onSearch: (kw: string) => void;
}) {
  const [input, setInput] = useState("");

  // Auto-scan: top 10 active stocks in 5-30 yuan range
  const { data: scanResults, isLoading: scanLoading } = useSWR(
    "/api/stocks?action=strategy-scan&mode=aggressive&count=10",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  // Search stocks matching keyword and filter price
  const { data: searchResults, isLoading } = useSWR(
    searchKeyword ? `/api/stocks?action=search&keyword=${encodeURIComponent(searchKeyword)}` : null,
    fetcher,
  );

  return (
    <>
      {/* Strategy Description */}
      <Card style={{ marginBottom: 16, borderLeft: "4px solid #fa541c" }}>
        <Title level={4} style={{ margin: "0 0 8px" }}>🔥 热点捕捉者策略</Title>
        <Paragraph style={{ fontSize: 16, color: "#666" }}>
          动能投资 + 价格过滤 — 关注市场情绪和热点，快速响应，果断操作。
        </Paragraph>
        <div style={{ background: "#fff7e6", padding: 12, borderRadius: 8 }}>
          <Space orientation="vertical" size={4}>
            <Text>📌 <strong>关注热点</strong>：追踪财经热点、题材概念、资金流向</Text>
            <Text>📌 <strong>价格过滤</strong>：只看 5-30 元区间的标的</Text>
            <Text>📌 <strong>止盈</strong>：目标 20%，果断执行</Text>
            <Text>📌 <strong>止损</strong>：热点消散即止损，绝不补仓</Text>
          </Space>
        </div>
      </Card>

      {/* Auto Scan Results */}
      <Card
        title={<><FireOutlined style={{ color: "#fa541c" }} /> 今日活跃标的（5-30元区间，换手率最高）</>}
        style={{ marginBottom: 16, borderLeft: "4px solid #fa541c" }}
      >
        {scanLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin tip="正在筛选活跃标的..." size="large" />
          </div>
        ) : scanResults && scanResults.length > 0 ? (
          <>
            <Alert
              type="warning"
              description="以下为成交额最高的 5-30 元股票，按换手率排序。热点轮动快，追涨需谨慎。"
              showIcon
              style={{ marginBottom: 12 }}
            />
            <Row gutter={[12, 12]}>
              {scanResults.map((stock: AggressiveScanResult) => (
                <Col xs={24} sm={12} key={stock.code}>
                  <Link href={`/stocks/${stock.code}?market=${stock.market}`}>
                    <Card size="small" hoverable style={{ borderLeft: "4px solid #fa541c" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ marginBottom: 4 }}>
                            <Text strong style={{ fontSize: 17 }}>{stock.name}</Text>
                            <Text type="secondary" style={{ marginLeft: 8 }}>{stock.code}</Text>
                            {stock.industry && <Tag color="orange" style={{ marginLeft: 6 }}>{stock.industry}</Tag>}
                          </div>
                          <div style={{ marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                            {stock.pe > 0 && <Tag style={{ fontSize: 12 }}>PE {stock.pe.toFixed(1)}</Tag>}
                            {stock.pb > 0 && <Tag style={{ fontSize: 12 }}>PB {stock.pb.toFixed(2)}</Tag>}
                            {stock.totalMarketCap > 0 && <Tag style={{ fontSize: 12 }}>市值 {formatAmount(stock.totalMarketCap)}</Tag>}
                          </div>
                          <Text style={{ color: getPriceColor(stock.changePercent), fontWeight: 700, fontSize: 16 }}>
                            ¥{stock.price.toFixed(2)}
                          </Text>
                          <Text style={{ color: getPriceColor(stock.changePercent), marginLeft: 8 }}>
                            {formatPercent(stock.changePercent)}
                          </Text>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <Tag color="volcano" style={{ fontSize: 14, padding: "2px 8px" }}>
                            换手 {stock.turnoverRate.toFixed(2)}%
                          </Tag>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          </>
        ) : (
          <Empty description="当前暂无符合条件的活跃标的" />
        )}
      </Card>

      <Divider />

      {/* Current Hotspots */}
      <Card title="🔥 当前市场热点" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          {HOTSPOT_TOPICS.map((topic) => (
            <Col xs={12} sm={8} md={6} key={topic.keyword}>
              <Card
                size="small"
                hoverable
                style={{
                  textAlign: "center",
                  cursor: "pointer",
                  borderColor: searchKeyword === topic.keyword ? "#fa541c" : undefined,
                }}
                onClick={() => onSearch(topic.keyword)}
              >
                <div style={{ fontSize: 24 }}>{topic.icon}</div>
                <Text strong>{topic.keyword}</Text>
                <br />
                <Tag color={topic.heat >= 80 ? "red" : topic.heat >= 60 ? "orange" : "blue"}>
                  热度 {topic.heat}
                </Tag>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Custom Search */}
      <Card title="🔍 自定义搜索热点标的" style={{ marginBottom: 16 }}>
        <Search
          placeholder="输入热点关键词，如 人工智能、新能源"
          size="large"
          enterButton={<><SearchOutlined /> 搜索</>}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSearch={(value) => {
            if (value.trim()) onSearch(value.trim());
          }}
          allowClear
        />
      </Card>

      {/* Results */}
      {searchKeyword && (
        <Card title={`📈 「${searchKeyword}」相关标的（5-30元筛选）`}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}><Spin tip="搜索中..." /></div>
          ) : searchResults && searchResults.length > 0 ? (
            <>
              <Alert
                title="温馨提示"
                description="以下标的仅基于关键词搜索结果，价格过滤需在详情页确认。热点轮动快，追涨需谨慎。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Row gutter={[12, 12]}>
                {searchResults.slice(0, 12).map((stock: { code: string; name: string; market: number }) => (
                  <Col xs={24} sm={12} key={stock.code}>
                    <Link href={`/stocks/${stock.code}?market=${stock.market}`}>
                      <Card size="small" hoverable style={{ borderLeft: "4px solid #fa541c" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <Text strong style={{ fontSize: 17 }}>{stock.name}</Text>
                            <Text type="secondary" style={{ marginLeft: 8 }}>{stock.code}</Text>
                          </div>
                          <ArrowRightOutlined style={{ color: "#999" }} />
                        </div>
                      </Card>
                    </Link>
                  </Col>
                ))}
              </Row>
            </>
          ) : (
            <Empty description={`未找到与"${searchKeyword}"相关的标的`} />
          )}
        </Card>
      )}

      {/* Ask AI */}
      <Card style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/chat">
          <Button type="primary" size="large" style={{ background: "#fa541c", borderColor: "#fa541c" }}>
            💬 让 AI 助手用「热点捕捉者」策略帮我分析
          </Button>
        </Link>
      </Card>
    </>
  );
}

// --- Client-side analysis utilities ---

interface ConservativeScanResult {
  code: string;
  name: string;
  market: number;
  price: number;
  changePercent: number;
  signalStrength: number;
  signals: string[];
  recommendation: string;
  rsi: number;
  yearlyPercentile: number;
  industry: string;
  pe: number;
  pb: number;
  totalMarketCap: number;
}

interface AggressiveScanResult {
  code: string;
  name: string;
  market: number;
  price: number;
  changePercent: number;
  turnoverRate: number;
  industry: string;
  pe: number;
  pb: number;
  totalMarketCap: number;
}

const HOTSPOT_TOPICS = [
  { keyword: "人工智能", icon: "🤖", heat: 95 },
  { keyword: "机器人", icon: "🦾", heat: 82 },
  { keyword: "半导体", icon: "💎", heat: 85 },
  { keyword: "新能源", icon: "⚡", heat: 88 },
  { keyword: "数字经济", icon: "🌐", heat: 78 },
  { keyword: "医药", icon: "💊", heat: 72 },
  { keyword: "军工", icon: "✈️", heat: 65 },
  { keyword: "消费", icon: "🛒", heat: 68 },
];

interface KLinePoint {
  close: number;
  open: number;
}

function analyzeBottomSignals(klineData: KLinePoint[]) {
  const closes = klineData.map((d) => d.close);
  if (closes.length < 30) return null;

  const currentPrice = closes[closes.length - 1];

  // RSI
  const rsi = calcRSI(closes, 14);

  // Bollinger Bands
  const bollinger = calcBollinger(closes, 20);

  // Moving Averages
  const ma20 = calcMA(closes, 20);
  const ma60 = calcMA(closes, 60);
  const ma250 = calcMA(closes, 250);

  // Yearly percentile
  const yearData = closes.slice(-250);
  const sorted = [...yearData].sort((a, b) => a - b);
  const idx = sorted.findIndex((p) => p >= currentPrice);
  const yearlyPercentile = (idx / sorted.length) * 100;

  // Signals
  const signals: string[] = [];
  let signalStrength = 0;

  if (rsi < 30) {
    signals.push(`RSI = ${rsi.toFixed(1)}（超卖）`);
    signalStrength += 2;
  } else if (rsi < 40) {
    signals.push(`RSI = ${rsi.toFixed(1)}（接近超卖）`);
    signalStrength += 1;
  }

  if (bollinger && currentPrice <= bollinger.lower) {
    signals.push("触及布林带下轨");
    signalStrength += 2;
  } else if (bollinger && currentPrice <= bollinger.lower * 1.02) {
    signals.push("接近布林带下轨");
    signalStrength += 1;
  }

  if (ma250 !== null) {
    const dist = ((currentPrice - ma250) / ma250) * 100;
    if (Math.abs(dist) < 3) {
      signals.push(`接近250日均线（偏离${dist.toFixed(1)}%）`);
      signalStrength += 2;
    } else if (dist < -3) {
      signals.push(`低于250日均线（偏离${dist.toFixed(1)}%）`);
      signalStrength += 1;
    }
  }

  if (yearlyPercentile <= 10) {
    signals.push(`年内最低${yearlyPercentile.toFixed(0)}%区间`);
    signalStrength += 2;
  } else if (yearlyPercentile <= 20) {
    signals.push(`年内较低${yearlyPercentile.toFixed(0)}%区间`);
    signalStrength += 1;
  }

  let recommendation: string;
  if (signalStrength >= 5) recommendation = "🟢 强烈关注 — 多个超卖信号共振，建议分批小量买入观察";
  else if (signalStrength >= 3) recommendation = "🟡 值得关注 — 有超卖迹象，可列入观察名单";
  else if (signalStrength >= 1) recommendation = "🟠 轻度关注 — 部分指标接近支撑位，继续观望";
  else recommendation = "⚪ 暂无买入信号 — 当前不满足抄底条件";

  return { rsi, bollinger, ma20, ma60, ma250, yearlyPercentile, signals, signalStrength, recommendation };
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcBollinger(closes: number[], period = 20) {
  if (closes.length < period) return null;
  const recent = closes.slice(-period);
  const mean = recent.reduce((a, b) => a + b, 0) / period;
  const variance = recent.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  return { upper: mean + 2 * stdDev, middle: mean, lower: mean - 2 * stdDev };
}

function calcMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period;
}
