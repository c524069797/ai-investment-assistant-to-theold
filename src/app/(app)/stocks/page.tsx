"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Typography, Row, Col, Card, Spin, Empty, Space, Button, Tag, message } from "antd";
import { SearchOutlined, ReloadOutlined, FireOutlined } from "@ant-design/icons";
import { useStockSearch, useMarketIndices, useTopicStocks } from "@/lib/hooks/useStockData";
import StockCard from "@/components/stock/StockCard";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useUser } from "@/lib/hooks/useUser";
import { getTonghuashunIndexUrl } from "@/lib/utils/stock-links";
import MarketingVisual from "@/components/marketing/MarketingVisual";

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
          ) : results && results.length > 0 ? (
            <Row gutter={[12, 12]}>
              {results.map((stock, index) => (
                <Col xs={24} sm={12} key={stock.code}>
                  <div style={{ position: "relative" }}>
                    {topicKeyword && (
                      <Tag
                        color={index < 3 ? "red" : "default"}
                        style={{ position: "absolute", top: 8, left: 8, zIndex: 1, fontSize: 13, fontWeight: 700 }}
                      >
                        #{index + 1}
                      </Tag>
                    )}
                    <StockCard
                      stock={{
                        ...stock,
                        price: stock.price ?? 0,
                        change: stock.change ?? 0,
                        changePercent: stock.changePercent ?? 0,
                        volume: 0,
                        amount: stock.amount ?? 0,
                      }}
                      linkTo={`/stocks/${stock.code}?market=${stock.market}`}
                      actions={{
                        watchlisted: isInWatchlist(stock.code, "stock"),
                        onToggleWatchlist: () => {
                          if (!currentUser) {
                            message.warning("请先登录再添加自选");
                            return;
                          }

                          if (isInWatchlist(stock.code, "stock")) {
                            removeItem(stock.code, "stock");
                            message.success(`已移除 ${stock.name}`);
                            return;
                          }

                          addItem({ code: stock.code, name: stock.name, market: stock.market, type: "stock" });
                          message.success(`已加入自选：${stock.name}`);
                        },
                        onOpenAi: () => {
                          router.push(`/chat?stock=${stock.code}&name=${encodeURIComponent(stock.name)}`);
                        },
                      }}
                    />
                  </div>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description={`未找到与"${activeKeyword}"相关的${topicKeyword ? "板块" : "股票"}`} />
          )}
        </Card>
      )}

      <Card title="📊 A股大盘指数" style={{ marginBottom: 24 }}>
        {indicesLoading ? (
          <div style={{ textAlign: "center", padding: 20 }}><Spin /></div>
        ) : indices ? (
          <Row gutter={[12, 12]}>
            {indices.map((idx) => (
              <Col xs={24} sm={12} md={8} key={idx.code}>
                <StockCard stock={idx} linkTo={getTonghuashunIndexUrl(idx.code)} />
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>
    </div>
  );
}
