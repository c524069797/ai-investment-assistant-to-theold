"use client";

import { useState } from "react";
import { Input, Typography, Row, Col, Card, Spin, Empty, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import useSWR from "swr";
import FundCard from "@/components/fund/FundCard";
import type { FundSearchResult } from "@/types/fund";
import { FUND_TYPES } from "@/lib/constants/market";

const { Title } = Typography;
const { Search } = Input;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
};

export default function FundsPage() {
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data: searchResults, isLoading } = useSWR<FundSearchResult[]>(
    keyword ? `/api/funds?action=search&keyword=${encodeURIComponent(keyword)}` : null,
    fetcher,
    { dedupingInterval: 1000 },
  );

  const filteredResults = searchResults?.filter(
    (f) => !typeFilter || f.type.includes(typeFilter),
  );

  return (
    <div className="page-container">
      <Title level={3}>基金查询</Title>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <Search
          placeholder="输入基金代码或名称，如 110011"
          size="large"
          enterButton={<><SearchOutlined /> 搜索</>}
          style={{ flex: 1, minWidth: 280, fontSize: 18 }}
          onSearch={(value) => setKeyword(value.trim())}
          allowClear
        />
        <Select
          placeholder="基金类型"
          size="large"
          style={{ width: 140 }}
          allowClear
          onChange={(val) => setTypeFilter(val ?? "")}
          options={Object.entries(FUND_TYPES).map(([, label]) => ({
            label,
            value: label,
          }))}
        />
      </div>

      {/* Search Guidance */}
      {!keyword && (
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

      {/* Results */}
      {keyword && (
        <Card title={`🔍 搜索结果：${keyword}`}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: 20 }}><Spin tip="搜索中..." /></div>
          ) : filteredResults && filteredResults.length > 0 ? (
            <Row gutter={[12, 12]}>
              {filteredResults.map((fund) => (
                <Col xs={24} sm={12} key={fund.code}>
                  <FundCard fund={fund} linkTo={`/funds/${fund.code}`} />
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description={`未找到与"${keyword}"相关的基金`} />
          )}
        </Card>
      )}
    </div>
  );
}
