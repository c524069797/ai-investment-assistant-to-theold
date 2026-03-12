"use client";

import { Card, Typography, Space } from "antd";
import { RiseOutlined, FallOutlined } from "@ant-design/icons";
import { getPriceColor, formatAmount, formatPercent, formatPrice } from "@/styles/stock-colors";
import type { StockQuote, MarketIndex } from "@/types/stock";


const { Text, Title } = Typography;

interface StockCardProps {
  stock: StockQuote | MarketIndex;
  linkTo?: string;
}

export default function StockCard({ stock, linkTo }: StockCardProps) {
  const color = getPriceColor(stock.changePercent);
  const Icon = stock.changePercent >= 0 ? RiseOutlined : FallOutlined;

  const content = (
    <Card
      hoverable
      size="small"
      style={{
        border: "1px solid #e8ecf4",
        borderRadius: 16,
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
      }}
      styles={{ body: { padding: "14px 16px" } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Title level={5} style={{ margin: 0, fontSize: 18, lineHeight: 1.3 }}>
            {stock.name}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {stock.code}
          </Text>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.2 }}>
            {formatPrice(stock.price)}
          </div>
          <Space size={4}>
            <Icon style={{ color }} />
            <Text style={{ color, fontSize: 15, fontWeight: 600 }}>
              {formatPercent(stock.changePercent)}
            </Text>
          </Space>
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px dashed #eef1f6",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          涨跌额 {stock.change > 0 ? "+" : ""}{stock.change.toFixed(2)}
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          成交额 {formatAmount(stock.amount)}
        </Text>
      </div>
    </Card>
  );

  if (linkTo) {
    return (
      <a href={linkTo} target="_blank" rel="noreferrer" style={{ display: "block" }}>
        {content}
      </a>
    );
  }

  return content;
}
