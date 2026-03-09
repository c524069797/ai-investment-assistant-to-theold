"use client";

import { use } from "react";
import { Typography, Card, Descriptions, Button, Spin, Space, Table, message, Tag, Progress } from "antd";
import { StarOutlined, StarFilled, ArrowLeftOutlined, ExperimentOutlined } from "@ant-design/icons";
import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { getPriceColor, formatPercent } from "@/styles/stock-colors";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FundChart from "@/components/fund/FundChart";
import type { FundEstimate, FundHistoryNav, FundDetail } from "@/types/fund";

const { Title, Text, Paragraph } = Typography;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
};

export default function FundDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: estimate, isLoading: estLoading } = useSWR<FundEstimate>(
    `/api/funds?action=estimate&code=${code}`,
    fetcher,
    { refreshInterval: 30000 },
  );

  const { data: history, isLoading: histLoading } = useSWR<FundHistoryNav[]>(
    `/api/funds?action=history&code=${code}&per=60`,
    fetcher,
  );

  const { data: detail, isLoading: detailLoading } = useSWR<FundDetail>(
    `/api/funds?action=detail&code=${code}`,
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

  const requestAiAnalysis = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiAnalysis(null);

    try {
      const fundInfo = {
        name: estimate?.name ?? code,
        code,
        estimate,
        detail,
        recentHistory: history?.slice(0, 20),
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `请分析基金 ${fundInfo.name}（${code}），以下是基金数据：
基金类型：${detail?.type ?? "未知"}
基金经理：${detail?.manager ?? "未知"}
基金公司：${detail?.company ?? "未知"}
成立日期：${detail?.establishDate ?? "未知"}
基金规模：${detail?.scale ?? "未知"}
管理费率：${detail?.fees?.manageFee ?? "未知"}
托管费率：${detail?.fees?.trustFee ?? "未知"}
运营总费率：${detail?.fees?.totalOperationFee ?? "未知"}
申购费率：${detail?.fees?.purchaseFee ?? "未知"}
赎回费率：${detail?.fees?.redeemFee ?? "未知"}
今年以来收益：${detail?.performanceYTD ?? "未知"}
近一年收益：${detail?.performance1Y ?? "未知"}
近三年收益：${detail?.performance3Y ?? "未知"}
当前净值：${estimate?.nav ?? "未知"}
估算净值：${estimate?.estimateNav ?? "未知"}

前十大持仓股：
${detail?.holdings?.map((h, i) => `${i + 1}. ${h.stockName}(${h.stockCode}) 占比${h.holdPercent}%`).join("\n") ?? "暂无数据"}

最近20日净值走势：
${history?.slice(0, 20).map((h) => `${h.date}: ${h.nav} (${h.changePercent > 0 ? "+" : ""}${h.changePercent}%)`).join("\n") ?? "暂无数据"}

请从以下几个维度分析：
1. 基金走势分析（近期涨跌趋势、波动性）
2. 持仓股分析（重仓股质量、行业集中度）
3. 费率分析（综合费率是否合理，长期持有成本）
4. 基金经理和公司评价
5. 综合建议：是否值得持有/买入

请用通俗易懂的语言，适合投资小白理解。`,
            },
          ],
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
          setAiAnalysis(result);
        }
      }
    } catch (error) {
      setAiAnalysis("分析失败，请稍后重试。" + (error instanceof Error ? error.message : ""));
    } finally {
      setAiLoading(false);
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
            {detail?.type && (
              <Tag color="blue" style={{ marginLeft: 8 }}>{detail.type}</Tag>
            )}
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

        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <Button
            type={isWatched ? "default" : "primary"}
            icon={isWatched ? <StarFilled /> : <StarOutlined />}
            onClick={toggleWatchlist}
            size="large"
          >
            {isWatched ? "已自选" : "加自选"}
          </Button>
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            onClick={requestAiAnalysis}
            loading={aiLoading}
            size="large"
            style={{ background: "#722ed1" }}
          >
            AI 分析
          </Button>
        </div>
      </Card>

      {/* AI Analysis */}
      {(aiAnalysis || aiLoading) && (
        <Card
          title="🤖 AI 智能分析"
          style={{ marginBottom: 16, borderColor: "#722ed1" }}
          styles={{ header: { background: "#f9f0ff", borderBottom: "1px solid #d3adf7" } }}
        >
          {aiLoading && !aiAnalysis && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <Spin tip="AI 正在分析中..." />
            </div>
          )}
          {aiAnalysis && (
            <div className="markdown-body" style={{ fontSize: 16, lineHeight: 1.8 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {aiAnalysis}
              </ReactMarkdown>
            </div>
          )}
        </Card>
      )}

      {/* Fund Basic Info */}
      {(estimate || detail) && (
        <Card title="📋 基金信息" style={{ marginBottom: 16 }}>
          <Descriptions column={{ xs: 2, sm: 3 }} size="middle">
            <Descriptions.Item label="最新净值">{estimate?.nav.toFixed(4) ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="估算净值">{estimate?.estimateNav.toFixed(4) ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="估算涨跌">
              <Text style={{ color: getPriceColor(estimate?.estimateChangePercent ?? 0) }}>
                {formatPercent(estimate?.estimateChangePercent ?? 0)}
              </Text>
            </Descriptions.Item>
            {detail?.manager && (
              <Descriptions.Item label="基金经理">{detail.manager}</Descriptions.Item>
            )}
            {detail?.company && (
              <Descriptions.Item label="基金公司">{detail.company}</Descriptions.Item>
            )}
            {detail?.scale && (
              <Descriptions.Item label="基金规模">{detail.scale}</Descriptions.Item>
            )}
            {detail?.establishDate && (
              <Descriptions.Item label="成立日期">{detail.establishDate}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* Performance */}
      {detail && (detail.performanceYTD || detail.performance1Y || detail.performance3Y) && (
        <Card title="📊 业绩表现" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {detail.performanceYTD && (
              <div style={{ textAlign: "center" }}>
                <Text type="secondary">今年以来</Text>
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: getPriceColor(parseFloat(detail.performanceYTD)),
                }}>
                  {detail.performanceYTD}
                </div>
              </div>
            )}
            {detail.performance1Y && (
              <div style={{ textAlign: "center" }}>
                <Text type="secondary">近一年</Text>
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: getPriceColor(parseFloat(detail.performance1Y)),
                }}>
                  {detail.performance1Y}
                </div>
              </div>
            )}
            {detail.performance3Y && (
              <div style={{ textAlign: "center" }}>
                <Text type="secondary">近三年</Text>
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: getPriceColor(parseFloat(detail.performance3Y)),
                }}>
                  {detail.performance3Y}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Fee Info */}
      {detail?.fees && (
        <Card title="💰 费率信息" style={{ marginBottom: 16 }}>
          <Descriptions column={{ xs: 2, sm: 3 }} size="middle">
            <Descriptions.Item label="管理费">{detail.fees.manageFee}</Descriptions.Item>
            <Descriptions.Item label="托管费">{detail.fees.trustFee}</Descriptions.Item>
            <Descriptions.Item label="运营总费率">
              <Text strong style={{ color: "#fa541c" }}>{detail.fees.totalOperationFee}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="申购费">{detail.fees.purchaseFee}</Descriptions.Item>
            <Descriptions.Item label="赎回费">{detail.fees.redeemFee}</Descriptions.Item>
            <Descriptions.Item label="销售服务费">{detail.fees.saleFee}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Top 10 Holdings */}
      {detail?.holdings && detail.holdings.length > 0 && (
        <Card
          title={`📦 前十大持仓股${detail.holdingPeriod ? `（${detail.holdingPeriod}）` : ""}`}
          style={{ marginBottom: 16 }}
        >
          <Table
            dataSource={detail.holdings}
            rowKey="stockCode"
            pagination={false}
            size="middle"
            columns={[
              {
                title: "排名",
                key: "rank",
                width: 60,
                render: (_: unknown, __: unknown, index: number) => index + 1,
              },
              {
                title: "股票名称",
                dataIndex: "stockName",
                key: "stockName",
                render: (name: string, record: { stockCode: string }) => (
                  <Link href={`/stocks/${record.stockCode}?market=${record.stockCode.startsWith("6") ? 1 : 0}`}>
                    <Text strong style={{ color: "#2b56c2" }}>{name}</Text>
                  </Link>
                ),
              },
              { title: "代码", dataIndex: "stockCode", key: "stockCode" },
              {
                title: "持仓占比",
                dataIndex: "holdPercent",
                key: "holdPercent",
                render: (v: number) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Progress
                      percent={v}
                      size="small"
                      showInfo={false}
                      style={{ flex: 1, maxWidth: 100 }}
                    />
                    <Text>{v.toFixed(2)}%</Text>
                  </div>
                ),
              },
              {
                title: "持股(万股)",
                dataIndex: "holdAmount",
                key: "holdAmount",
                render: (v: number) => v > 0 ? v.toLocaleString() : "—",
              },
              {
                title: "市值(万元)",
                dataIndex: "holdMarketValue",
                key: "holdMarketValue",
                render: (v: number) => v > 0 ? v.toLocaleString() : "—",
              },
            ]}
          />
        </Card>
      )}

      {/* Chart */}
      <Card title="📈 净值走势" style={{ marginBottom: 16 }}>
        {histLoading || detailLoading ? (
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
