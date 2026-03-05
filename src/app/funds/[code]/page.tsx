"use client";

import { use } from "react";
import { Typography, Card, Descriptions, Button, Spin, Space, Table, message } from "antd";
import { StarOutlined, StarFilled, ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";
import useSWR from "swr";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { getPriceColor, formatPercent } from "@/styles/stock-colors";
import FundChart from "@/components/fund/FundChart";
import type { FundEstimate, FundHistoryNav } from "@/types/fund";

const { Title, Text } = Typography;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
};

export default function FundDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const { data: estimate, isLoading: estLoading } = useSWR<FundEstimate>(
    `/api/funds?action=estimate&code=${code}`,
    fetcher,
    { refreshInterval: 30000 },
  );

  const { data: history, isLoading: histLoading } = useSWR<FundHistoryNav[]>(
    `/api/funds?action=history&code=${code}&per=60`,
    fetcher,
  );

  const { isInWatchlist, addItem, removeItem } = useWatchlist();
  const isWatched = isInWatchlist(code, "fund");

  const toggleWatchlist = () => {
    if (isWatched) {
      removeItem(code, "fund");
      message.success("已从自选移除");
    } else if (estimate) {
      addItem({ code, name: estimate.name, market: 0, type: "fund" });
      message.success("已添加到自选");
    }
  };

  if (estLoading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" tip="加载基金数据中..." />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Space style={{ marginBottom: 16 }}>
        <Link href="/funds">
          <Button icon={<ArrowLeftOutlined />}>返回</Button>
        </Link>
      </Space>

      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>{estimate?.name ?? code}</Title>
            <Text type="secondary" style={{ fontSize: 16 }}>{code}</Text>
          </div>
          {estimate && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: getPriceColor(estimate.estimateChangePercent) }}>
                {estimate.estimateNav.toFixed(4)}
              </div>
              <Text style={{ color: getPriceColor(estimate.estimateChangePercent), fontSize: 16 }}>
                估值 {formatPercent(estimate.estimateChangePercent)}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 13 }}>
                更新: {estimate.updateTime}
              </Text>
            </div>
          )}
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
      {estimate && (
        <Card title="📋 基金信息" style={{ marginBottom: 16 }}>
          <Descriptions column={{ xs: 2, sm: 3 }} size="middle">
            <Descriptions.Item label="最新净值">{estimate.nav.toFixed(4)}</Descriptions.Item>
            <Descriptions.Item label="估算净值">{estimate.estimateNav.toFixed(4)}</Descriptions.Item>
            <Descriptions.Item label="估算涨跌">
              <Text style={{ color: getPriceColor(estimate.estimateChangePercent) }}>
                {formatPercent(estimate.estimateChangePercent)}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Chart */}
      <Card title="📈 净值走势" style={{ marginBottom: 16 }}>
        {histLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
        ) : (
          <FundChart data={history ?? []} name={estimate?.name ?? code} />
        )}
      </Card>

      {/* History Table */}
      <Card title="📊 历史净值">
        <Table
          dataSource={history ?? []}
          loading={histLoading}
          rowKey="date"
          pagination={{ pageSize: 10 }}
          size="middle"
          columns={[
            { title: "日期", dataIndex: "date", key: "date" },
            { title: "单位净值", dataIndex: "nav", key: "nav", render: (v: number) => v.toFixed(4) },
            { title: "累计净值", dataIndex: "accNav", key: "accNav", render: (v: number) => v.toFixed(4) },
            {
              title: "日增长率",
              dataIndex: "changePercent",
              key: "changePercent",
              render: (v: number) => (
                <Text style={{ color: getPriceColor(v) }}>{formatPercent(v)}</Text>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
