"use client";

import { useState } from "react";
import { Typography, Card, Segmented, Space, Input, Button, Spin, Alert, Descriptions, Tag, Empty, Divider } from "antd";
import {
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ArrowRightOutlined,
  FireOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import useSWR from "swr";
import { getPriceColor, formatPercent, formatAmount } from "@/styles/stock-colors";
import type { StrategyMode } from "@/lib/constants/market";
import MarketingVisual from "@/components/marketing/MarketingVisual";
import ResponsiveTable from "@/components/ui/ResponsiveTable";

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
          <ResponsiveTable
            rowKey="code"
            size="small"
            dataSource={scanResults}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 980 }}
            primaryKey="name"
            actionKeys={["actions"]}
            title={() => (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text type="secondary">保守筛选结果更适合表格对比信号强度、估值和市值</Text>
                <Button type="primary" size="small" icon={<PlusOutlined />}>添加观察</Button>
              </div>
            )}
            columns={[
              {
                title: "标的",
                key: "name",
                render: (_: unknown, stock: ConservativeScanResult) => (
                  <div>
                    <Link href={`/stocks/${stock.code}?market=${stock.market}`} style={{ fontWeight: 700 }}>
                      {stock.name}
                    </Link>
                    <div style={{ color: "#8c8c8c", fontSize: 13 }}>
                      {stock.code}{stock.industry ? ` · ${stock.industry}` : ""}
                    </div>
                  </div>
                ),
              },
              {
                title: "现价",
                dataIndex: "price",
                width: 110,
                align: "right",
                render: (value: number, stock: ConservativeScanResult) => (
                  <span style={{ color: getPriceColor(stock.changePercent), fontWeight: 700 }}>¥{value.toFixed(2)}</span>
                ),
              },
              {
                title: "涨跌幅",
                dataIndex: "changePercent",
                width: 110,
                align: "right",
                render: (value: number) => <span style={{ color: getPriceColor(value), fontWeight: 700 }}>{formatPercent(value)}</span>,
              },
              {
                title: "信号强度",
                dataIndex: "signalStrength",
                width: 120,
                align: "center",
                render: (value: number) => <Tag color={value >= 5 ? "green" : value >= 3 ? "gold" : "orange"}>{value}/8</Tag>,
              },
              {
                title: "触发信号",
                dataIndex: "signals",
                key: "signals",
                render: (signals: string[]) => (
                  <Space size={[4, 4]} wrap>
                    {signals.map((signal) => <Tag key={signal} color="red">{signal}</Tag>)}
                  </Space>
                ),
              },
              {
                title: "操作",
                key: "actions",
                width: 150,
                render: (_: unknown, stock: ConservativeScanResult) => (
                  <Space size={4}>
                    <Link href={`/stocks/${stock.code}?market=${stock.market}`}>
                      <Button type="link" size="small">查看详情</Button>
                    </Link>
                    <Button type="text" size="small" icon={<DeleteOutlined />} disabled />
                  </Space>
                ),
              },
            ]}
          />
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
        <Link href="/chat" className="strategy-ask-ai">
          <Button type="primary" size="large" className="strategy-ask-ai__btn">
            💬 让 AI 助手用「抄底耐力王」策略帮我分析
          </Button>
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
            <ResponsiveTable
              rowKey="code"
              size="small"
              dataSource={scanResults}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: 920 }}
              primaryKey="name"
              actionKeys={["actions"]}
              title={() => (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text type="secondary">动量标的用表格更适合比较换手率、价格和行业</Text>
                  <Button type="primary" size="small" icon={<PlusOutlined />}>添加观察</Button>
                </div>
              )}
              columns={[
                {
                  title: "标的",
                  key: "name",
                  render: (_: unknown, stock: AggressiveScanResult) => (
                    <div>
                      <Link href={`/stocks/${stock.code}?market=${stock.market}`} style={{ fontWeight: 700 }}>
                        {stock.name}
                      </Link>
                      <div style={{ color: "#8c8c8c", fontSize: 13 }}>
                        {stock.code}{stock.industry ? ` · ${stock.industry}` : ""}
                      </div>
                    </div>
                  ),
                },
                {
                  title: "现价",
                  dataIndex: "price",
                  width: 110,
                  align: "right",
                  render: (value: number, stock: AggressiveScanResult) => (
                    <span style={{ color: getPriceColor(stock.changePercent), fontWeight: 700 }}>¥{value.toFixed(2)}</span>
                  ),
                },
                {
                  title: "涨跌幅",
                  dataIndex: "changePercent",
                  width: 110,
                  align: "right",
                  render: (value: number) => <span style={{ color: getPriceColor(value), fontWeight: 700 }}>{formatPercent(value)}</span>,
                },
                {
                  title: "换手率",
                  dataIndex: "turnoverRate",
                  width: 120,
                  align: "right",
                  render: (value: number) => <Tag color="volcano">{value.toFixed(2)}%</Tag>,
                },
                {
                  title: "市值",
                  dataIndex: "totalMarketCap",
                  width: 140,
                  align: "right",
                  render: (value: number) => formatAmount(value),
                },
                {
                  title: "操作",
                  key: "actions",
                  width: 150,
                  render: (_: unknown, stock: AggressiveScanResult) => (
                    <Space size={4}>
                      <Link href={`/stocks/${stock.code}?market=${stock.market}`}>
                        <Button type="link" size="small">查看详情</Button>
                      </Link>
                      <Button type="text" size="small" icon={<DeleteOutlined />} disabled />
                    </Space>
                  ),
                },
              ]}
            />
          </>
        ) : (
          <Empty description="当前暂无符合条件的活跃标的" />
        )}
      </Card>

      <Divider />

      {/* Current Hotspots */}
      <Card title="🔥 当前市场热点" style={{ marginBottom: 16 }}>
        <ResponsiveTable
          rowKey="keyword"
          size="small"
          pagination={false}
          scroll={{ x: 520 }}
          dataSource={HOTSPOT_TOPICS}
          primaryKey="keyword"
          actionKeys={["actions"]}
          mobilePageSize={8}
          title={() => (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text type="secondary">热点主题统一用表格收纳，减少大面积留白</Text>
              <Button type="primary" size="small" icon={<PlusOutlined />}>添加热点</Button>
            </div>
          )}
          columns={[
            {
              title: "热点",
              key: "keyword",
              render: (_: unknown, topic: typeof HOTSPOT_TOPICS[number]) => (
                <Button type="link" style={{ paddingInline: 0, fontWeight: 700 }} onClick={() => onSearch(topic.keyword)}>
                  <span style={{ marginRight: 8 }}>{topic.icon}</span>
                  {topic.keyword}
                </Button>
              ),
            },
            {
              title: "热度",
              dataIndex: "heat",
              width: 100,
              align: "right",
              render: (value: number) => <Tag color={value >= 80 ? "red" : value >= 60 ? "orange" : "blue"}>热度 {value}</Tag>,
            },
            {
              title: "操作",
              key: "actions",
              width: 150,
              render: (_: unknown, topic: typeof HOTSPOT_TOPICS[number]) => (
                <Space size={4}>
                  <Button size="small" type="link" onClick={() => onSearch(topic.keyword)}>查看详情</Button>
                  <Button type="text" size="small" icon={<DeleteOutlined />} disabled />
                </Space>
              ),
            },
          ]}
        />
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
              <ResponsiveTable
                rowKey="code"
                size="small"
                dataSource={searchResults.slice(0, 12)}
                pagination={false}
                scroll={{ x: 680 }}
                primaryKey="name"
                actionKeys={["actions"]}
                title={() => (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text type="secondary">热点相关标的统一进入表格，方便继续加价格/换手等字段</Text>
                    <Button type="primary" size="small" icon={<PlusOutlined />}>添加标的</Button>
                  </div>
                )}
                columns={[
                  {
                    title: "标的",
                    key: "name",
                    render: (_: unknown, stock: { code: string; name: string; market: number }) => (
                      <div>
                        <Link href={`/stocks/${stock.code}?market=${stock.market}`} style={{ fontWeight: 700 }}>
                          {stock.name}
                        </Link>
                        <div style={{ color: "#8c8c8c", fontSize: 13 }}>{stock.code}</div>
                      </div>
                    ),
                  },
                  {
                    title: "操作",
                    key: "actions",
                    width: 160,
                    render: (_: unknown, stock: { code: string; name: string; market: number }) => (
                      <Space size={4}>
                        <Link href={`/stocks/${stock.code}?market=${stock.market}`}>
                          <Button type="link" size="small">查看详情</Button>
                        </Link>
                        <Button type="text" size="small" icon={<DeleteOutlined />} disabled />
                      </Space>
                    ),
                  },
                ]}
              />
            </>
          ) : (
            <Empty description={`未找到与"${searchKeyword}"相关的标的`} />
          )}
        </Card>
      )}

      {/* Ask AI */}
      <Card style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/chat" className="strategy-ask-ai">
          <Button
            type="primary"
            size="large"
            className="strategy-ask-ai__btn"
            style={{ background: "#fa541c", borderColor: "#fa541c" }}
          >
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
