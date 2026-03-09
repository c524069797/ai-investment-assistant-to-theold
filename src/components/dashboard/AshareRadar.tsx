"use client";

import { Card, Skeleton, Tag, Typography } from "antd";
import { useStockQuote } from "@/lib/hooks/useStockData";
import { formatPercent, formatPrice, getPriceColor } from "@/styles/stock-colors";
import type { StockQuote } from "@/types/stock";

const { Text, Title } = Typography;

interface RadarTarget {
  code: string;
  name: string;
  market: number;
  sector: string;
}

const RADAR_TARGETS: RadarTarget[] = [
  { code: "600519", name: "贵州茅台", market: 1, sector: "白酒龙头" },
  { code: "300750", name: "宁德时代", market: 0, sector: "新能源" },
  { code: "002594", name: "比亚迪", market: 0, sector: "智能汽车" },
  { code: "601318", name: "中国平安", market: 1, sector: "金融" },
  { code: "300059", name: "东方财富", market: 0, sector: "券商" },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function estimatePredictionScore(quote?: StockQuote) {
  if (!quote) return 50;

  const momentum = clamp(quote.changePercent, -7, 7);
  const turnover = clamp(quote.turnoverRate || 0, 0, 14);
  const volatility = quote.price > 0 ? ((quote.high - quote.low) / quote.price) * 100 : 0;
  const valuationPenalty = quote.pe > 0 && quote.pe > 70 ? 6 : 0;

  const score = 50 + momentum * 3.8 + turnover * 1.5 - volatility * 1.8 - valuationPenalty;
  return Math.round(clamp(score, 8, 95));
}

function getSignal(score: number) {
  if (score >= 75) return { label: "偏强", color: "error" as const };
  if (score >= 55) return { label: "观察", color: "warning" as const };
  if (score >= 40) return { label: "中性", color: "default" as const };
  return { label: "谨慎", color: "success" as const };
}

function RadarRow({ target }: { target: RadarTarget }) {
  const { data, isLoading } = useStockQuote(target.market, target.code);

  if (isLoading || !data) {
    return (
      <div className="radar-row">
        <Skeleton.Input active size="small" style={{ width: "100%", height: 60 }} />
      </div>
    );
  }

  const prediction = estimatePredictionScore(data);
  const signal = getSignal(prediction);
  const color = getPriceColor(data.changePercent);

  return (
    <div className="radar-row">
      <div className="radar-main">
        <div>
          <Text className="radar-name">{data.name}</Text>
          <div>
            <Text className="radar-code">{data.code}</Text>
            <Text className="radar-meta">{target.sector}</Text>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="radar-price">{formatPrice(data.price)}</div>
          <Text className="radar-change" style={{ color }}>
            {formatPercent(data.changePercent)}
          </Text>
        </div>
      </div>
      <div className="radar-meter">
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${prediction}%` }} />
        </div>
        <div className="meter-label">
          <Text type="secondary">AI 预测 {prediction}%</Text>
          <Tag color={signal.color}>{signal.label}</Tag>
        </div>
      </div>
    </div>
  );
}

export default function AshareRadar() {
  return (
    <Card style={{ borderRadius: 20 }}>
      <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
        A股预测雷达
      </Title>
      <Text type="secondary">结合涨跌动量、换手率、波动率做短线温度评分</Text>
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {RADAR_TARGETS.map((target) => (
          <RadarRow key={target.code} target={target} />
        ))}
      </div>
    </Card>
  );
}
