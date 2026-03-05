"use client";

import { useState } from "react";
import { Input, Typography, Row, Col, Card, Spin, Empty } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useStockSearch, useMarketIndices } from "@/lib/hooks/useStockData";
import StockCard from "@/components/stock/StockCard";

const { Title } = Typography;
const { Search } = Input;

export default function StocksPage() {
  const [keyword, setKeyword] = useState("");
  const { data: searchResults, isLoading: searchLoading } = useStockSearch(keyword);
  const { data: indices, isLoading: indicesLoading } = useMarketIndices();

  return (
    <div className="page-container">
      <Title level={3}>股票查询</Title>

      <Search
        placeholder="输入股票代码或名称，如 600519 或 贵州茅台"
        size="large"
        enterButton={<><SearchOutlined /> 搜索</>}
        style={{ marginBottom: 24, fontSize: 18 }}
        onSearch={(value) => setKeyword(value.trim())}
        allowClear
      />

      {/* Market Indices */}
      <Card title="📊 大盘指数" style={{ marginBottom: 24 }}>
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

      {/* Search Results */}
      {keyword && (
        <Card title={`🔍 搜索结果：${keyword}`}>
          {searchLoading ? (
            <div style={{ textAlign: "center", padding: 20 }}><Spin tip="搜索中..." /></div>
          ) : searchResults && searchResults.length > 0 ? (
            <Row gutter={[12, 12]}>
              {searchResults.map((stock) => (
                <Col xs={24} sm={12} key={stock.code}>
                  <StockCard
                    stock={{ ...stock, price: 0, change: 0, changePercent: 0, volume: 0, amount: 0 }}
                    linkTo={`/stocks/${stock.code}?market=${stock.market}`}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description={`未找到与"${keyword}"相关的股票`} />
          )}
        </Card>
      )}
    </div>
  );
}
