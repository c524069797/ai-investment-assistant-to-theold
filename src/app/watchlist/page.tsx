"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Typography, Card, Button, Empty, message, Spin, Space, Alert } from "antd";
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useUser } from "@/lib/hooks/useUser";
import useSWR from "swr";
import type { FundEstimate } from "@/types/fund";
import WatchlistInsightCard from "@/components/stock/WatchlistInsightCard";
import { formatPercent, getPriceColor } from "@/styles/stock-colors";

const { Title, Text, Paragraph } = Typography;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
};

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
          <Button danger icon={<DeleteOutlined />} size="small" onClick={(e) => { e.preventDefault(); onRemove(); }} />
        </div>
      </div>
    </Card>
  );
}

export default function WatchlistPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, isLoading: watchlistLoading, removeItem } = useWatchlist();
  const { currentUser, isLoading: userLoading } = useUser();

  const stocks = items.filter((i) => i.type === "stock");
  const funds = items.filter((i) => i.type === "fund");

  useEffect(() => {
    if (watchlistLoading || userLoading) {
      return;
    }

    const action = searchParams.get("action");
    if (action === "open-first-stock" && stocks.length) {
      router.replace(`/stocks/${stocks[0].code}?market=${stocks[0].market}`);
      return;
    }

    if (action === "open-first-fund" && funds.length) {
      router.replace(`/funds/${funds[0].code}`);
    }
  }, [funds, router, searchParams, stocks, userLoading, watchlistLoading]);

  const userName = currentUser?.name ?? "我";

  if (userLoading || watchlistLoading) {
    return (
      <div className="page-container">
        <Title level={3}>⭐ 自选列表</Title>
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" tip="加载中..." />
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="page-container">
        <Title level={3}>{currentUser?.avatar ?? "⭐"} {userName}的自选</Title>
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <Empty
            description={
              <span style={{ fontSize: 16 }}>
                您还没有添加自选，去股票或基金页面添加吧
              </span>
            }
          >
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
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
      <Space orientation="vertical" size={4} style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 0 }}>{currentUser?.avatar ?? "⭐"} {userName}的自选</Title>
        <Paragraph style={{ marginBottom: 0, color: "#666" }}>
          这里优先展示自选股的 AI 综合分析：相关新闻、量能变化、主力行为研判、压力位 / 支撑位 / 突破位，以及是否上榜龙虎榜。
        </Paragraph>
      </Space>

      {stocks.length > 0 && (
        <Card
          title={`📈 自选股票 AI 分析 (${stocks.length})`}
          style={{ marginBottom: 16 }}
          extra={<Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>刷新全部</Button>}
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="当前版本优先使用定时刷新 + 手动刷新"
            description="如果后续接入后端实时推送或 WebSocket，可升级为更即时的自选股监控模式。当前每张卡片支持独立刷新，并默认定时刷新；首页中的自选股分析默认收起，可按需展开。"
          />
          <div style={{ display: "grid", gap: 16 }}>
            {stocks.map((item) => (
              <div key={item.code} style={{ display: "grid", gap: 8 }}>
                <WatchlistInsightCard code={item.code} name={item.name} market={item.market} />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => {
                      removeItem(item.code, "stock");
                      message.success(`已移除 ${item.name}`);
                    }}
                  >
                    移除自选
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
