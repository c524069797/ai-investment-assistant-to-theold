"use client";

import { Typography, Card, Row, Col, Button, Empty, Spin, message } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useStockQuote } from "@/lib/hooks/useStockData";
import useSWR from "swr";
import { getPriceColor, formatPercent, formatPrice } from "@/styles/stock-colors";
import type { FundEstimate } from "@/types/fund";

const { Title, Text } = Typography;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
};

function StockWatchItem({ code, name, market, onRemove }: { code: string; name: string; market: number; onRemove: () => void }) {
  const { data: quote, isLoading } = useStockQuote(market, code);

  if (isLoading) {
    return (
      <Card size="small" loading style={{ marginBottom: 8 }} />
    );
  }

  const price = quote?.price ?? 0;
  const changePercent = quote?.changePercent ?? 0;
  const color = getPriceColor(changePercent);

  return (
    <Card size="small" style={{ borderLeft: `4px solid ${color}`, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href={`/stocks/${code}?market=${market}`} style={{ flex: 1 }}>
          <div>
            <Text strong style={{ fontSize: 17 }}>{name}</Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>{code}</Text>
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{formatPrice(price)}</div>
            <Text style={{ color, fontSize: 14 }}>{formatPercent(changePercent)}</Text>
          </div>
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={(e) => { e.preventDefault(); onRemove(); }}
          />
        </div>
      </div>
    </Card>
  );
}

function FundWatchItem({ code, name, onRemove }: { code: string; name: string; onRemove: () => void }) {
  const { data: estimate, isLoading } = useSWR<FundEstimate>(
    `/api/funds?action=estimate&code=${code}`,
    fetcher,
    { refreshInterval: 30000 },
  );

  if (isLoading) {
    return <Card size="small" loading style={{ marginBottom: 8 }} />;
  }

  const changePercent = estimate?.estimateChangePercent ?? 0;
  const color = getPriceColor(changePercent);

  return (
    <Card size="small" style={{ borderLeft: `4px solid ${color}`, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href={`/funds/${code}`} style={{ flex: 1 }}>
          <div>
            <Text strong style={{ fontSize: 17 }}>{name}</Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>{code}</Text>
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {estimate && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{estimate.estimateNav.toFixed(4)}</div>
              <Text style={{ color, fontSize: 14 }}>估{formatPercent(changePercent)}</Text>
            </div>
          )}
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={(e) => { e.preventDefault(); onRemove(); }}
          />
        </div>
      </div>
    </Card>
  );
}

export default function WatchlistPage() {
  const { items, removeItem } = useWatchlist();

  const stocks = items.filter((i) => i.type === "stock");
  const funds = items.filter((i) => i.type === "fund");

  if (items.length === 0) {
    return (
      <div className="page-container">
        <Title level={3}>⭐ 我的自选</Title>
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <Empty
            description={
              <span style={{ fontSize: 16 }}>
                您还没有添加自选，去股票或基金页面添加吧
              </span>
            }
          >
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link href="/stocks">
                <Button type="primary" icon={<PlusOutlined />} size="large">
                  添加股票
                </Button>
              </Link>
              <Link href="/funds">
                <Button icon={<PlusOutlined />} size="large">
                  添加基金
                </Button>
              </Link>
            </div>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Title level={3}>⭐ 我的自选</Title>

      {stocks.length > 0 && (
        <Card title={`📈 自选股票 (${stocks.length})`} style={{ marginBottom: 16 }}>
          {stocks.map((item) => (
            <StockWatchItem
              key={item.code}
              code={item.code}
              name={item.name}
              market={item.market}
              onRemove={() => {
                removeItem(item.code, "stock");
                message.success(`已移除 ${item.name}`);
              }}
            />
          ))}
        </Card>
      )}

      {funds.length > 0 && (
        <Card title={`🏦 自选基金 (${funds.length})`} style={{ marginBottom: 16 }}>
          {funds.map((item) => (
            <FundWatchItem
              key={item.code}
              code={item.code}
              name={item.name}
              onRemove={() => {
                removeItem(item.code, "fund");
                message.success(`已移除 ${item.name}`);
              }}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
