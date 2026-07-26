"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Typography, Card, Spin, Empty, Select, Button, Table, Space, message } from "antd";
import { SearchOutlined, ReloadOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import useSWR from "swr";
import type { FundSearchResult } from "@/types/fund";
import { FUND_TYPES } from "@/lib/constants/market";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useUser } from "@/lib/hooks/useUser";
import MarketingVisual from "@/components/marketing/MarketingVisual";
import { createChatHandoffHref } from "@/lib/chat/handoff";
import { formatPercent, getPriceColor } from "@/styles/stock-colors";

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
};

export default function FundsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const typeFilter = searchParams.get("type")?.trim() ?? "";

  const { data: searchResults, isLoading, mutate } = useSWR<FundSearchResult[]>(
    keyword ? `/api/funds?action=search&keyword=${encodeURIComponent(keyword)}` : null,
    fetcher,
    { dedupingInterval: 1000 },
  );
  const { currentUser } = useUser();
  const { isInWatchlist, addItem, removeItem } = useWatchlist();

  const filteredResults = searchResults?.filter(
    (f) => !typeFilter || f.type.includes(typeFilter),
  ) ?? [];

  const updateParams = useCallback((patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(patch).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
        return;
      }
      params.set(key, value);
    });

    const query = params.toString();
    router.replace(query ? `/funds?${query}` : "/funds");
  }, [router, searchParams]);

  const handleRefresh = useCallback(() => {
    if (keyword) mutate();
  }, [keyword, mutate]);

  const fundColumns = [
    {
      title: "基金",
      key: "name",
      render: (_: unknown, fund: FundSearchResult) => (
        <div>
          <Button
            type="link"
            style={{ paddingInline: 0, fontWeight: 700 }}
            onClick={() => router.push(`/funds/${fund.code}`)}
          >
            {fund.name}
          </Button>
          <div style={{ color: "#8c8c8c", fontSize: 13 }}>
            {fund.code} · {fund.type}
          </div>
        </div>
      ),
    },
    {
      title: "估算涨跌幅",
      dataIndex: "changePercent",
      key: "changePercent",
      width: 140,
      align: "right" as const,
      render: (value?: number) => (
        value === undefined
          ? <span style={{ color: "#8c8c8c" }}>-</span>
          : <span style={{ color: getPriceColor(value), fontWeight: 700 }}>{formatPercent(value)}</span>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 250,
      render: (_: unknown, fund: FundSearchResult) => (
        <Space size={4} wrap>
          <Button size="small" type="link" onClick={() => router.push(`/funds/${fund.code}`)}>
            查看详情
          </Button>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              if (!currentUser) {
                message.warning("请先登录再添加自选");
                return;
              }

              if (isInWatchlist(fund.code, "fund")) {
                message.info(`${fund.name} 已在自选中`);
                return;
              }

              addItem({ code: fund.code, name: fund.name, market: 0, type: "fund" });
              message.success(`已加入自选：${fund.name}`);
            }}
          >
            添加
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (!currentUser) {
                message.warning("请先登录再管理自选");
                return;
              }

              if (!isInWatchlist(fund.code, "fund")) {
                message.info(`${fund.name} 不在自选中`);
                return;
              }

              removeItem(fund.code, "fund");
              message.success(`已移除 ${fund.name}`);
            }}
          >
            删除
          </Button>
          <Button
            size="small"
            onClick={() => {
              router.push(createChatHandoffHref({
                title: `${fund.name}分析`,
                prompt: `请用通俗方式分析基金 ${fund.name}（${fund.code}），重点说明：1）这只基金主要投什么；2）短期走势和波动如何；3）更适合一次买入、定投还是继续观察；4）有哪些主要风险；5）普通投资者现在最该关注什么。`,
              }));
            }}
          >
            AI分析
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Card className="dashboard-hero stocks-hero" style={{ marginBottom: 16 }}>
        <div className="page-visual-hero">
          <div className="page-visual-hero__content">
            <Text className="hero-eyebrow">基金 · 估值跟踪</Text>
            <Title level={2} className="hero-title">基金查询</Title>
            <Paragraph className="hero-subtitle">
              快速检索基金代码、类型与估值变化，把重点产品加入自选后交给 AI 持续跟踪。
            </Paragraph>
          </div>
          <MarketingVisual
            alt="基金查询与自选跟踪界面展示"
            className="page-visual-hero__media"
            src="/marketing/hero-funds.png"
            tone="compact"
          />
        </div>
      </Card>

      <div className="responsive-toolbar" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <Search
          key={`${keyword}-${typeFilter}`}
          placeholder="输入基金代码或名称，如 110011"
          size="large"
          enterButton={<><SearchOutlined /> 搜索</>}
          style={{ flex: 1, minWidth: 280, fontSize: 18 }}
          defaultValue={keyword}
          onSearch={(value) => updateParams({ keyword: value.trim() })}
          allowClear
        />
        <Select
          placeholder="基金类型"
          size="large"
          style={{ width: 140 }}
          allowClear
          value={typeFilter || undefined}
          onChange={(val) => updateParams({ type: val ?? "" })}
          options={Object.entries(FUND_TYPES).map(([, label]) => ({
            label,
            value: label,
          }))}
        />
        <Button
          icon={<ReloadOutlined />}
          size="large"
          onClick={handleRefresh}
          title="刷新行情"
        >
          刷新
        </Button>
      </div>

      {keyword ? (
        <Card title={`🔍 搜索结果：${keyword}`}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: 20 }}><Spin tip="搜索中..." /></div>
          ) : filteredResults.length > 0 ? (
            <Table
              rowKey="code"
              size="middle"
              dataSource={filteredResults}
              columns={fundColumns}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              scroll={{ x: 820 }}
              title={() => (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text type="secondary">表格展示更适合基金筛选、操作和后续扩列</Text>
                  <Button type="primary" icon={<PlusOutlined />}>添加基金</Button>
                </div>
              )}
            />
          ) : (
            <Empty description={`未找到与"${keyword}"相关的基金`} />
          )}
        </Card>
      ) : (
        <Card>
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Typography.Title level={4} style={{ color: "#666" }}>
              🔍 请输入基金代码或名称进行搜索
            </Typography.Title>
            <Typography.Text style={{ fontSize: 16, color: "#999" }}>
              例如：110011、易方达、沪深300 等
            </Typography.Text>
          </div>
        </Card>
      )}
    </div>
  );
}
