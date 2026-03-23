"use client";

import { type MouseEvent } from "react";
import { Button, Card, Typography, Tag, Space } from "antd";
import { RobotOutlined, StarFilled, StarOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { getPriceColor, formatPercent } from "@/styles/stock-colors";
import type { FundEstimate, FundSearchResult } from "@/types/fund";

const { Text, Title } = Typography;

interface FundCardProps {
  fund: FundEstimate | FundSearchResult;
  linkTo?: string;
  actions?: {
    watchlisted: boolean;
    onToggleWatchlist: () => void;
    onOpenAi: () => void;
  };
}

function isFundEstimate(fund: FundEstimate | FundSearchResult): fund is FundEstimate {
  return "nav" in fund;
}

export default function FundCard({ fund, linkTo, actions }: FundCardProps) {
  const router = useRouter();
  const hasEstimate = isFundEstimate(fund);
  const searchChange = !hasEstimate && "changePercent" in fund ? (fund.changePercent as number | undefined) : undefined;
  const changeValue = hasEstimate ? fund.estimateChangePercent : searchChange;
  const color = changeValue !== undefined ? getPriceColor(changeValue) : "#8c8c8c";

  const openDetail = () => {
    if (!linkTo) {
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
    <Card
      hoverable={!!linkTo}
      size="small"
      onClick={linkTo ? openDetail : undefined}
      style={{ borderLeft: `4px solid ${color}` }}
      styles={{ body: { padding: "12px 16px" } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Title
            level={5}
            style={{ margin: 0, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {fund.name}
          </Title>
          <Space size={8} wrap>
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
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {hasEstimate && (
            <div style={{ fontSize: 20, fontWeight: 700, color }}>
              {fund.estimateNav.toFixed(4)}
            </div>
          )}
          {changeValue !== undefined && (
            <Text style={{ color, fontSize: hasEstimate ? 15 : 18, fontWeight: hasEstimate ? 400 : 700 }}>
              {formatPercent(changeValue)}
            </Text>
          )}
        </div>
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
  );
}
