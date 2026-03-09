"use client";

import { useState, useCallback } from "react";
import { Input, Typography, Row, Col, Card, Spin, Empty, Space, Button, Tag } from "antd";
import { SearchOutlined, ReloadOutlined, FireOutlined } from "@ant-design/icons";
import { useStockSearch, useMarketIndices, useTopicStocks } from "@/lib/hooks/useStockData";
import StockCard from "@/components/stock/StockCard";

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const HOT_KEYS = ["人工智能", "机器人", "算力", "半导体", "光伏", "券商"];

export default function StocksPage() {
  const [keyword, setKeyword] = useState("");
  const [topicKeyword, setTopicKeyword] = useState("");

  const { data: searchResults, isLoading: searchLoading, mutate: mutateSearch } = useStockSearch(
    topicKeyword ? "" : keyword,
  );
  const { data: topicResults, isLoading: topicLoading, mutate: mutateTopic } = useTopicStocks(topicKeyword);
  const { data: indices, isLoading: indicesLoading, mutate: mutateIndices } = useMarketIndices();

  const handleSearch = useCallback((value: string) => {
    const v = value.trim();
    setKeyword(v);
    setTopicKeyword("");
  }, []);

  const handleTopicClick = useCallback((topic: string) => {
    setTopicKeyword(topic);
    setKeyword("");
  }, []);

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
      <Card className="dashboard-hero" style={{ marginBottom: 16 }}>
        <Text className="hero-eyebrow">A股 · 实时行情中心</Text>
        <Title level={2} className="hero-title">股票查询与筛选</Title>
        <Paragraph className="hero-subtitle">
          输入股票代码或名称查看沪深行情，点击热门题材查看该板块成交额最大的股票。
        </Paragraph>
      </Card>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Search
          placeholder="输入股票代码或名称，如 600519 或 贵州茅台"
          size="large"
          enterButton={<><SearchOutlined /> 搜索</>}
          style={{ flex: 1, minWidth: 280, fontSize: 18 }}
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

      {/* Search / Topic Results - directly below search bar */}
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

      {/* Market Indices */}
      <Card title="📊 A股大盘指数" style={{ marginBottom: 24 }}>
        {indicesLoading ? (
          <div style={{ textAlign: "center", padding: 20 }}><Spin /></div>
        ) : indices ? (
          <Row gutter={[12, 12]}>
            {indices.map((idx) => (
              <Col xs={24} sm={12} md={8} key={idx.code}>
                <StockCard stock={idx} />
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
