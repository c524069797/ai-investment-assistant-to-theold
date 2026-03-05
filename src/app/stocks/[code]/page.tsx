"use client";

import { useSearchParams } from "next/navigation";
import { use } from "react";
import { Typography, Card, Row, Col, Descriptions, Button, Segmented, Spin, Space, message } from "antd";
import { StarOutlined, StarFilled, ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useState } from "react";
import { useStockQuote, useStockKLine } from "@/lib/hooks/useStockData";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { getPriceColor, formatPercent, formatPrice } from "@/styles/stock-colors";
import StockChart from "@/components/stock/StockChart";
import type { KLinePeriod } from "@/types/stock";

const { Title, Text } = Typography;

export default function StockDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const searchParams = useSearchParams();
  const market = parseInt(searchParams.get("market") ?? "1", 10);
  const [period, setPeriod] = useState<KLinePeriod>("daily");

  const { data: quote, isLoading: quoteLoading } = useStockQuote(market, code);
  const { data: klineData, isLoading: klineLoading } = useStockKLine(market, code, period);
  const { isInWatchlist, addItem, removeItem } = useWatchlist();

  const isWatched = isInWatchlist(code, "stock");

  const toggleWatchlist = () => {
    if (isWatched) {
      removeItem(code, "stock");
      message.success("已从自选移除");
    } else if (quote) {
      addItem({ code, name: quote.name, market, type: "stock" });
      message.success("已添加到自选");
    }
  };

  if (quoteLoading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" tip="加载行情中..." />
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
    <div className="page-container">
      <Space style={{ marginBottom: 16 }}>
        <Link href="/stocks">
          <Button icon={<ArrowLeftOutlined />}>返回</Button>
        </Link>
      </Space>

      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>{quote.name}</Title>
            <Text type="secondary" style={{ fontSize: 16 }}>{quote.code}</Text>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color }}>{formatPrice(quote.price)}</div>
            <Text style={{ color, fontSize: 18 }}>
              {quote.change > 0 ? "+" : ""}{formatPrice(quote.change)} {formatPercent(quote.changePercent)}
            </Text>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Button
            type={isWatched ? "default" : "primary"}
            icon={isWatched ? <StarFilled /> : <StarOutlined />}
            onClick={toggleWatchlist}
            size="large"
          >
            {isWatched ? "已自选" : "加自选"}
          </Button>
        </div>
      </Card>

      {/* Details */}
      <Card title="📋 详细数据" style={{ marginBottom: 16 }}>
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

      {/* K-Line Chart */}
      <Card
        title="📈 K线走势"
        extra={
          <Segmented
            options={[
              { label: "日K", value: "daily" },
              { label: "周K", value: "weekly" },
              { label: "月K", value: "monthly" },
            ]}
            value={period}
            onChange={(val) => setPeriod(val as KLinePeriod)}
          />
        }
      >
        {klineLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
        ) : (
          <StockChart data={klineData ?? []} name={quote.name} />
        )}
      </Card>
    </div>
  );
}
