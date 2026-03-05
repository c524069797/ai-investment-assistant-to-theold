"use client";

import { Card, Typography, Space } from "antd";
import { RiseOutlined, FallOutlined } from "@ant-design/icons";
import { getPriceColor, formatPercent, formatPrice } from "@/styles/stock-colors";
import type { StockQuote, MarketIndex } from "@/types/stock";
import Link from "next/link";

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
      style={{ borderLeft: `4px solid ${color}` }}
      styles={{ body: { padding: "12px 16px" } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={5} style={{ margin: 0, fontSize: 18 }}>
            {stock.name}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {stock.code}
          </Text>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color }}>
            {formatPrice(stock.price)}
          </div>
          <Space size={4}>
            <Icon style={{ color }} />
            <Text style={{ color, fontSize: 16 }}>
              {formatPercent(stock.changePercent)}
            </Text>
          </Space>
        </div>
      </div>
    </Card>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  return content;
}
