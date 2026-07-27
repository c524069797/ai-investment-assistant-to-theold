"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Typography, Card, Spin, Empty, Space, Button, Tag, message } from "antd";
import { SearchOutlined, ReloadOutlined, FireOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useStockSearch, useMarketIndices, useTopicStocks } from "@/lib/hooks/useStockData";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useUser } from "@/lib/hooks/useUser";
import { getTonghuashunIndexUrl } from "@/lib/utils/stock-links";
import MarketingVisual from "@/components/marketing/MarketingVisual";
import ResponsiveTable from "@/components/ui/ResponsiveTable";
import { formatAmount, formatPercent, formatPrice, getPriceColor } from "@/styles/stock-colors";
import type { MarketIndex } from "@/types/stock";

// 股票页是典型的 App Router 客户端页面：
// - useSearchParams 读取 URL 条件
// - 自定义 hooks 负责数据请求与缓存
// - Ant Design 负责列表、卡片、搜索框等界面
const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const HOT_KEYS = ["人工智能", "机器人", "算力", "半导体", "光伏", "券商"];

export default function StocksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const topicKeyword = searchParams.get("topic")?.trim() ?? "";

  const { data: searchResults, isLoading: searchLoading, mutate: mutateSearch } = useStockSearch(
    // 关键词搜索和题材搜索共用一个页面，但底层走的是两个 hooks / 两套接口。
    topicKeyword ? "" : keyword,
  );
  const { data: topicResults, isLoading: topicLoading, mutate: mutateTopic } = useTopicStocks(topicKeyword);
  const { data: indices, isLoading: indicesLoading, mutate: mutateIndices } = useMarketIndices();
  const { currentUser } = useUser();
  const { isInWatchlist, addItem, removeItem } = useWatchlist();

  const handleSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    router.replace(trimmed ? `/stocks?keyword=${encodeURIComponent(trimmed)}` : "/stocks");
  }, [router]);

  const handleTopicClick = useCallback((topic: string) => {
    router.replace(`/stocks?topic=${encodeURIComponent(topic)}`);
  }, [router]);

  const handleRefresh = useCallback(() => {
    mutateIndices();
    if (keyword) mutateSearch();
    if (topicKeyword) mutateTopic();
  }, [mutateIndices, mutateSearch, mutateTopic, keyword, topicKeyword]);

  const activeKeyword = keyword || topicKeyword;
  const isSearching = topicKeyword ? topicLoading : searchLoading;
  const results = topicKeyword ? topicResults : searchResults;
  const normalizedResults = (results ?? []).map((stock) => ({
    ...stock,
    price: stock.price ?? 0,
    change: stock.change ?? 0,
    changePercent: stock.changePercent ?? 0,
    amount: stock.amount ?? 0,
  }));

  const resultColumns = [
    {
      title: "股票",
      key: "name",
      render: (_: unknown, stock: typeof normalizedResults[number]) => (
        <div>
          <Button
            type="link"
            style={{ paddingInline: 0, fontWeight: 700 }}
            onClick={() => router.push(`/stocks/${stock.code}?market=${stock.market}`)}
          >
            {stock.name}
          </Button>
          <div style={{ color: "#8c8c8c", fontSize: 13 }}>
            {stock.code}{stock.type ? ` · ${stock.type}` : ""}
          </div>
        </div>
      ),
    },
    {
      title: "现价",
      dataIndex: "price",
      key: "price",
      width: 110,
      align: "right" as const,
      render: (price: number, stock: typeof normalizedResults[number]) => (
        <span style={{ color: getPriceColor(stock.changePercent), fontWeight: 700 }}>{formatPrice(price)}</span>
      ),
    },
    {
      title: "涨跌幅",
      dataIndex: "changePercent",
      key: "changePercent",
      width: 120,
      align: "right" as const,
      render: (value: number) => <span style={{ color: getPriceColor(value), fontWeight: 700 }}>{formatPercent(value)}</span>,
    },
    {
      title: "成交额",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right" as const,
      render: (value: number) => formatAmount(value),
    },
    {
      title: "操作",
      key: "actions",
      width: 220,
      render: (_: unknown, stock: typeof normalizedResults[number]) => (
        <Space size={4} wrap>
          <Button size="small" type="link" onClick={() => router.push(`/stocks/${stock.code}?market=${stock.market}`)}>
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

              if (isInWatchlist(stock.code, "stock")) {
                message.info(`${stock.name} 已在自选中`);
                return;
              }

              addItem({ code: stock.code, name: stock.name, market: stock.market, type: "stock" });
              message.success(`已加入自选：${stock.name}`);
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

              if (!isInWatchlist(stock.code, "stock")) {
                message.info(`${stock.name} 不在自选中`);
                return;
              }

              removeItem(stock.code, "stock");
              message.success(`已移除 ${stock.name}`);
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const indexColumns = [
    {
      title: "指数",
      key: "name",
      render: (_: unknown, idx: MarketIndex) => (
        <div>
          <a href={getTonghuashunIndexUrl(idx.code)} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
            {idx.name}
          </a>
          <div style={{ color: "#8c8c8c", fontSize: 13 }}>{idx.code}</div>
        </div>
      ),
    },
    {
      title: "点位",
      dataIndex: "price",
      key: "price",
      width: 120,
      align: "right" as const,
      render: (value: number, idx: MarketIndex) => (
        <span style={{ color: getPriceColor(idx.changePercent), fontWeight: 700 }}>{formatPrice(value)}</span>
      ),
    },
    {
      title: "涨跌幅",
      dataIndex: "changePercent",
      key: "changePercent",
      width: 120,
      align: "right" as const,
      render: (value: number) => <span style={{ color: getPriceColor(value), fontWeight: 700 }}>{formatPercent(value)}</span>,
    },
    {
      title: "成交额",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right" as const,
      render: (value: number) => formatAmount(value),
    },
  ];

  return (
    <div className="page-container">
      <Card className="dashboard-hero stocks-hero" style={{ marginBottom: 16 }}>
        <div className="page-visual-hero">
          <div className="page-visual-hero__content">
            <Text className="hero-eyebrow">A股 · 实时行情中心</Text>
            <Title level={2} className="hero-title">股票查询与筛选</Title>
            <Paragraph className="hero-subtitle">
              输入股票代码或名称查看沪深行情，点击热门题材查看该板块成交额最大的股票。
            </Paragraph>
          </div>
          <MarketingVisual
            alt="股票查询与市场分析界面展示"
            className="page-visual-hero__media"
            src="/marketing/hero-stocks.png"
            tone="compact"
          />
        </div>
      </Card>

      <div className="responsive-toolbar" style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Search
          key={`${keyword}-${topicKeyword}`}
          placeholder="输入股票代码或名称，如 600519 或 贵州茅台"
          size="large"
          enterButton={<><SearchOutlined /> 搜索</>}
          style={{ flex: 1, minWidth: 280, fontSize: 18 }}
          defaultValue={keyword}
          onSearch={handleSearch}
          allowClear
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

      <Card title="🔥 热门题材快捷搜索" size="small" style={{ marginBottom: 16 }}
        extra={<Text type="secondary" style={{ fontSize: 13 }}>点击查看板块成交额 TOP10</Text>}
      >
        <Space wrap>
          {HOT_KEYS.map((key) => (
            <Button
              key={key}
              type={topicKeyword === key ? "primary" : "default"}
              icon={topicKeyword === key ? <FireOutlined /> : undefined}
              onClick={() => handleTopicClick(key)}
            >
              {key}
            </Button>
          ))}
        </Space>
      </Card>

      {activeKeyword && (
        <Card
          title={
            topicKeyword
              ? <span><FireOutlined style={{ color: "#fa541c" }} /> {topicKeyword} 板块热门股 <Tag color="orange">按成交额排序</Tag></span>
              : `🔍 搜索结果：${keyword}`
          }
          extra={<Text type="secondary">点击进入详情页</Text>}
          style={{ marginBottom: 16 }}
        >
          {isSearching ? (
            <div style={{ textAlign: "center", padding: 20 }}><Spin tip={topicKeyword ? "获取板块热门股..." : "搜索中..."} /></div>
          ) : normalizedResults.length > 0 ? (
            <ResponsiveTable
              rowKey="code"
              size="middle"
              dataSource={normalizedResults.map((stock, index) => ({ ...stock, rank: index + 1 }))}
              primaryKey="name"
              actionKeys={["actions"]}
              columns={[
                ...(topicKeyword ? [{
                  title: "排名",
                  dataIndex: "rank",
                  key: "rank",
                  width: 90,
                  render: (rank: number) => <Tag color={rank <= 3 ? "red" : "default"}>#{rank}</Tag>,
                }] : []),
                ...resultColumns,
              ]}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              scroll={{ x: 860 }}
              title={() => (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text type="secondary">统一表格视图，便于筛选、操作与扩展更多字段</Text>
                  <Button type="primary" icon={<PlusOutlined />}>添加股票</Button>
                </div>
              )}
            />
          ) : (
            <Empty description={`未找到与"${activeKeyword}"相关的${topicKeyword ? "板块" : "股票"}`} />
          )}
        </Card>
      )}

      <Card title="📊 A股大盘指数" style={{ marginBottom: 24 }}>
        {indicesLoading ? (
          <div style={{ textAlign: "center", padding: 20 }}><Spin /></div>
        ) : indices ? (
          <ResponsiveTable
            rowKey="code"
            size="middle"
            dataSource={indices}
            columns={indexColumns}
            primaryKey="name"
            pagination={false}
            scroll={{ x: 640 }}
            mobilePageSize={8}
          />
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>
    </div>
  );
}
