"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Col, Descriptions, Row, Segmented, Space, Spin, Statistic, Tag, Typography, message } from "antd";
import {
  ArrowLeftOutlined,
  RiseOutlined,
  StarFilled,
  StarOutlined,
  StockOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import StockChart from "@/components/stock/StockChart";
import { useStockKLine, useStockQuote } from "@/lib/hooks/useStockData";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { formatPercent, formatPrice, getPriceColor } from "@/styles/stock-colors";
import type { KLinePeriod } from "@/types/stock";

const { Title, Text, Paragraph } = Typography;

export default function StockDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const searchParams = useSearchParams();
  const market = parseInt(searchParams.get("market") ?? "1", 10);
  const [period, setPeriod] = useState<KLinePeriod>("daily");

  const { data: quote, isLoading: quoteLoading } = useStockQuote(market, code);
  const { data: klineData, isLoading: klineLoading } = useStockKLine(market, code, period);
  const { isInWatchlist, addItem, removeItem } = useWatchlist();

  const isWatched = isInWatchlist(code, "stock");

  const stats = useMemo(() => {
    if (!quote) return [];
    return [
      { label: "今开", value: formatPrice(quote.open) },
      { label: "昨收", value: formatPrice(quote.preClose) },
      { label: "换手率", value: `${quote.turnoverRate.toFixed(2)}%` },
      { label: "市盈率", value: quote.pe.toFixed(2) },
    ];
  }, [quote]);

  const toggleWatchlist = () => {
    if (isWatched) {
      removeItem(code, "stock");
      message.success("已从自选移除");
      return;
    }

    if (quote) {
      addItem({ code, name: quote.name, market, type: "stock" });
      message.success("已添加到自选");
    }
  };

  if (quoteLoading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" description="加载行情中..." />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="page-container" style={{ textAlign: "center", padding: 60 }}>
        <Text>未找到该股票数据</Text>
        <br />
        <Link href="/stocks"><Button type="link">返回搜索</Button></Link>
      </div>
    );
  }

  const color = getPriceColor(quote.changePercent);

  return (
    <div className="page-container stock-detail-page">
      <Space style={{ marginBottom: 16 }}>
        <Link href="/stocks">
          <Button icon={<ArrowLeftOutlined />}>返回</Button>
        </Link>
      </Space>

      <Card className="stock-hero-card" style={{ marginBottom: 16 }}>
        <div className="stock-hero-card__grid">
          <div>
            <div className="stock-hero-card__title-row">
              <div className="stock-hero-card__badge"><StockOutlined /></div>
              <div>
                <Title level={2} style={{ margin: 0 }}>{quote.name}</Title>
                <Space style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 16 }}>{quote.code}</Text>
                  <Tag color={quote.changePercent >= 0 ? "red" : "green"}>{quote.changePercent >= 0 ? "强弱偏多" : "强弱偏空"}</Tag>
                  <Tag color="blue">market {market === 1 ? "SH" : "SZ"}</Tag>
                </Space>
              </div>
            </div>

            <Paragraph className="stock-hero-card__desc">
              实时监控价格、量能、估值与 K 线节奏，结合自选管理形成个股观察舱。
            </Paragraph>

            <div className="stock-hero-card__actions">
              <Button type={isWatched ? "default" : "primary"} icon={isWatched ? <StarFilled /> : <StarOutlined />} onClick={toggleWatchlist} size="large">
                {isWatched ? "已自选" : "加自选"}
              </Button>
              <Link href={`/chat?stock=${quote.code}&name=${encodeURIComponent(quote.name)}`}>
                <Button size="large" icon={<RiseOutlined />}>交给 AI 深度分析</Button>
              </Link>
            </div>
          </div>

          <div className="stock-price-panel">
            <Text className="stock-price-panel__label">最新价格</Text>
            <div className="stock-price-panel__value" style={{ color }}>{formatPrice(quote.price)}</div>
            <Text style={{ color, fontSize: 18 }}>
              {quote.change > 0 ? "+" : ""}{formatPrice(quote.change)} {formatPercent(quote.changePercent)}
            </Text>
            <div className="stock-mini-stats">
              {stats.map((item) => (
                <div key={item.label} className="stock-mini-stats__item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} xl={16}>
          <Card
            className="tech-section-card"
            title="📈 K线走势"
            extra={
              <Segmented
                options={[
                  { label: "日K", value: "daily" },
                  { label: "周K", value: "weekly" },
                  { label: "月K", value: "monthly" },
                ]}
                value={period}
                onChange={(value) => setPeriod(value as KLinePeriod)}
              />
            }
          >
            {klineLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
            ) : (
              <StockChart data={klineData ?? []} name={quote.name} />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="tech-section-card stock-signal-card" title="⚡ 盘中信号面板">
            <div className="stock-signal-card__grid">
              <div className="stock-signal-card__item">
                <span>最高 / 最低</span>
                <strong>
                  <Text style={{ color: getPriceColor(quote.high - quote.preClose) }}>{formatPrice(quote.high)}</Text>
                  <span style={{ color: "var(--text-secondary)" }}> / </span>
                  <Text style={{ color: getPriceColor(quote.low - quote.preClose) }}>{formatPrice(quote.low)}</Text>
                </strong>
              </div>
              <div className="stock-signal-card__item">
                <span>成交量</span>
                <strong>{(quote.volume / 10000).toFixed(0)}万手</strong>
              </div>
              <div className="stock-signal-card__item">
                <span>成交额</span>
                <strong>{(quote.amount / 100000000).toFixed(2)}亿</strong>
              </div>
              <div className="stock-signal-card__item">
                <span>总市值</span>
                <strong>{(quote.totalMarketCap / 100000000).toFixed(0)}亿</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="tech-section-card" title="📋 详细数据">
            <Descriptions column={{ xs: 2, sm: 3, md: 4 }} size="middle">
              <Descriptions.Item label="今开">{formatPrice(quote.open)}</Descriptions.Item>
              <Descriptions.Item label="最高">
                <Text style={{ color: getPriceColor(quote.high - quote.preClose) }}>{formatPrice(quote.high)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="最低">
                <Text style={{ color: getPriceColor(quote.low - quote.preClose) }}>{formatPrice(quote.low)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="昨收">{formatPrice(quote.preClose)}</Descriptions.Item>
              <Descriptions.Item label="成交量">{(quote.volume / 10000).toFixed(0)}万手</Descriptions.Item>
              <Descriptions.Item label="成交额">{(quote.amount / 100000000).toFixed(2)}亿</Descriptions.Item>
              <Descriptions.Item label="换手率">{quote.turnoverRate.toFixed(2)}%</Descriptions.Item>
              <Descriptions.Item label="市盈率">{quote.pe.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="市净率">{quote.pb.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="总市值">{(quote.totalMarketCap / 100000000).toFixed(0)}亿</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="tech-section-card stock-overview-card" title="🧭 快速判读">
            <Row gutter={[12, 12]}>
              <Col xs={12}>
                <Statistic title="涨跌幅" value={quote.changePercent} precision={2} suffix="%" valueStyle={{ color }} />
              </Col>
              <Col xs={12}>
                <Statistic title="换手率" value={quote.turnoverRate} precision={2} suffix="%" valueStyle={{ color: "var(--accent-strong)" }} />
              </Col>
              <Col xs={12}>
                <Statistic title="市盈率" value={Number(quote.pe.toFixed(2))} precision={2} />
              </Col>
              <Col xs={12}>
                <Statistic title="市净率" value={Number(quote.pb.toFixed(2))} precision={2} />
              </Col>
            </Row>
            <div className="stock-overview-card__note">
              <Text type="secondary">
                当前数据仅用于盘面研究和趋势观察，不构成任何投资建议。建议结合新闻、资金面与更长周期走势共同判断。
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
