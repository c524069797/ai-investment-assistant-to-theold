"use client";

import { Card, Typography, Tag, Space } from "antd";
import { getPriceColor, formatPercent } from "@/styles/stock-colors";
import type { FundEstimate, FundSearchResult } from "@/types/fund";
import Link from "next/link";

const { Text, Title } = Typography;

interface FundCardProps {
  fund: FundEstimate | FundSearchResult;
  linkTo?: string;
}

function isFundEstimate(fund: FundEstimate | FundSearchResult): fund is FundEstimate {
  return "nav" in fund;
}

export default function FundCard({ fund, linkTo }: FundCardProps) {
  const hasEstimate = isFundEstimate(fund);
  const color = hasEstimate ? getPriceColor(fund.estimateChangePercent) : "#8c8c8c";

  const content = (
    <Card
      hoverable
      size="small"
      style={{ borderLeft: `4px solid ${color}` }}
      styles={{ body: { padding: "12px 16px" } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Title
            level={5}
            style={{ margin: 0, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {fund.name}
          </Title>
          <Space size={8}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {fund.code}
            </Text>
            {"type" in fund && fund.type && (
              <Tag style={{ fontSize: 12 }}>{fund.type}</Tag>
            )}
            {"fundType" in fund && fund.fundType && (
              <Tag style={{ fontSize: 12 }}>{fund.fundType}</Tag>
            )}
          </Space>
        </div>
        {hasEstimate && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>
              {fund.estimateNav.toFixed(4)}
            </div>
            <Text style={{ color, fontSize: 15 }}>
              {formatPercent(fund.estimateChangePercent)}
            </Text>
          </div>
        )}
      </div>
    </Card>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  return content;
}
