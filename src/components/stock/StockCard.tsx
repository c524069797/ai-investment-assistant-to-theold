"use client";

import { type MouseEvent } from "react";
import { Button, Card, Typography, Space } from "antd";
import { RiseOutlined, FallOutlined, RobotOutlined, StarFilled, StarOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getPriceColor, formatAmount, formatPercent, formatPrice } from "@/styles/stock-colors";
import type { StockQuote, MarketIndex } from "@/types/stock";

const { Text, Title } = Typography;

interface StockCardProps {
  stock: StockQuote | MarketIndex;
  linkTo?: string;
  actions?: {
    watchlisted: boolean;
    onToggleWatchlist: () => void;
    onOpenAi: () => void;
  };
}

export default function StockCard({ stock, linkTo, actions }: StockCardProps) {
  const router = useRouter();
  const color = getPriceColor(stock.changePercent);
  const Icon = stock.changePercent >= 0 ? RiseOutlined : FallOutlined;

  const openDetail = () => {
    if (!linkTo) {
      return;
    }

    if (linkTo.startsWith("http")) {
      window.open(linkTo, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(linkTo);
  };

  const handleToggleWatchlist = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    actions?.onToggleWatchlist();
  };

  const handleOpenAi = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    actions?.onOpenAi();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      <Card
        hoverable={!!linkTo}
        size="small"
        onClick={linkTo ? openDetail : undefined}
        style={{
          border: "1px solid #e8ecf4",
          borderRadius: 16,
          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: "14px 16px" } }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <Title level={5} style={{ margin: 0, fontSize: 18, lineHeight: 1.3 }}>
              {stock.name}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {stock.code}
            </Text>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <motion.div
              key={stock.price}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.2 }}
            >
              {formatPrice(stock.price)}
            </motion.div>
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
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            涨跌额 {stock.change > 0 ? "+" : ""}{stock.change.toFixed(2)}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            成交额 {formatAmount(stock.amount)}
          </Text>
        </div>

        {actions ? (
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Button
              type={actions.watchlisted ? "default" : "primary"}
              icon={actions.watchlisted ? <StarFilled /> : <StarOutlined />}
              onClick={handleToggleWatchlist}
              style={{ flex: 1 }}
            >
              {actions.watchlisted ? "已自选" : "加入自选"}
            </Button>
            <Button icon={<RobotOutlined />} onClick={handleOpenAi} style={{ flex: 1 }}>
              AI分析
            </Button>
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}
