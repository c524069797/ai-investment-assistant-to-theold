"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Typography, Row, Col, Card, Spin, Empty, Select, Button, message } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import useSWR from "swr";
import FundCard from "@/components/fund/FundCard";
import type { FundSearchResult } from "@/types/fund";
import { FUND_TYPES } from "@/lib/constants/market";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useUser } from "@/lib/hooks/useUser";

const { Title } = Typography;
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
  );

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

  return (
    <div className="page-container">
      <Title level={3}>基金查询</Title>

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
          ) : filteredResults && filteredResults.length > 0 ? (
            <Row gutter={[12, 12]}>
              {filteredResults.map((fund) => (
                <Col xs={24} sm={12} key={fund.code}>
                  <FundCard
                    fund={fund}
                    linkTo={`/funds/${fund.code}`}
                    actions={{
                      watchlisted: isInWatchlist(fund.code, "fund"),
                      onToggleWatchlist: () => {
                        if (!currentUser) {
                          message.warning("请先登录再添加自选");
                          return;
                        }

                        if (isInWatchlist(fund.code, "fund")) {
                          removeItem(fund.code, "fund");
                          message.success(`已移除 ${fund.name}`);
                          return;
                        }

                        addItem({ code: fund.code, name: fund.name, market: 0, type: "fund" });
                        message.success(`已加入自选：${fund.name}`);
                      },
                      onOpenAi: () => {
                        router.push(
                          `/chat?title=${encodeURIComponent(`${fund.name}分析`)}&prompt=${encodeURIComponent(`请用通俗方式分析基金 ${fund.name}（${fund.code}），重点说明：1）这只基金主要投什么；2）短期走势和波动如何；3）更适合一次买入、定投还是继续观察；4）有哪些主要风险；5）普通投资者现在最该关注什么。`)}`,
                        );
                      },
                    }}
                  />
                </Col>
              ))}
            </Row>
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
