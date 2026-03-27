"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Alert, Button, Card, Empty, Input, List, Modal, Space, Spin, Tag, Typography, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { createDefaultWatchlistThesis, type WatchlistThesisData } from "@/lib/memory/shared";

const { Paragraph, Text, Title } = Typography;

interface AnalysisSnapshot {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  sourceType: string;
}

interface StockMemoryCardProps {
  code: string;
  name: string;
  market: number;
  compact?: boolean;
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "请求失败");
  }
  return json.data as T;
};

function toTextareaValue(values: string[]) {
  return values.join("\n");
}

function fromTextareaValue(value: string) {
  return value
    .split(/\n|，|,|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasThesisContent(thesis: WatchlistThesisData) {
  return Boolean(
    thesis.watchReason ||
    thesis.bullPoints.length ||
    thesis.bearPoints.length ||
    thesis.watchSignals.length ||
    thesis.invalidationConditions.length ||
    thesis.lastJudgement,
  );
}

export default function StockMemoryCard({ code, name, market, compact = false }: StockMemoryCardProps) {
  const thesisUrl = `/api/memory/watchlist-thesis?code=${encodeURIComponent(code)}&market=${market}&name=${encodeURIComponent(name)}&type=stock`;
  const snapshotsUrl = `/api/memory/analysis-snapshots?code=${encodeURIComponent(code)}&type=stock&limit=3`;
  const { data: thesis, isLoading, error, mutate } = useSWR<WatchlistThesisData>(thesisUrl, fetcher);
  const { data: snapshots, isLoading: snapshotsLoading, mutate: mutateSnapshots } = useSWR<AnalysisSnapshot[]>(snapshotsUrl, fetcher);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<WatchlistThesisData>(createDefaultWatchlistThesis(code, market, name));

  useEffect(() => {
    if (thesis) {
      setForm({ ...createDefaultWatchlistThesis(code, market, name), ...thesis, name });
    }
  }, [code, market, name, thesis]);

  const summaryTags = useMemo(() => {
    if (!thesis) {
      return [] as string[];
    }

    return [
      ...thesis.watchSignals.slice(0, 2).map((item) => `观察：${item}`),
      ...thesis.invalidationConditions.slice(0, 1).map((item) => `失效：${item}`),
    ];
  }, [thesis]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        code,
        market,
        name,
        type: "stock",
        bullPoints: fromTextareaValue(toTextareaValue(form.bullPoints)),
        bearPoints: fromTextareaValue(toTextareaValue(form.bearPoints)),
        watchSignals: fromTextareaValue(toTextareaValue(form.watchSignals)),
        invalidationConditions: fromTextareaValue(toTextareaValue(form.invalidationConditions)),
      };

      const response = await fetch("/api/memory/watchlist-thesis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || "保存失败");
      }
      await mutate();
      await mutateSnapshots();
      setOpen(false);
      message.success(`${name} 的关注逻辑已保存`);
    } catch (saveError) {
      message.error(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <Card size={compact ? "small" : "default"}><div style={{ textAlign: "center", padding: 24 }}><Spin /></div></Card>;
  }

  return (
    <>
      <Card
        size={compact ? "small" : "default"}
        title={<span>🧠 MemBrain 关注逻辑</span>}
        extra={<Button size="small" icon={<EditOutlined />} onClick={() => setOpen(true)}>编辑逻辑</Button>}
      >
        {error ? <Alert type="warning" showIcon message="加载关注逻辑失败" description={error.message} /> : null}

        {thesis && hasThesisContent(thesis) ? (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {thesis.watchReason ? (
              <div>
                <Text strong>关注原因</Text>
                <Paragraph style={{ marginBottom: 0 }}>{thesis.watchReason}</Paragraph>
              </div>
            ) : null}

            {thesis.lastJudgement ? (
              <div>
                <Text strong>最近判断</Text>
                <Paragraph style={{ marginBottom: 0 }}>{thesis.lastJudgement}</Paragraph>
              </div>
            ) : null}

            {summaryTags.length ? (
              <div>
                {summaryTags.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </div>
            ) : null}

            <div>
              <Text strong>最近分析快照</Text>
              {snapshotsLoading ? (
                <div style={{ padding: "8px 0" }}><Spin size="small" /></div>
              ) : snapshots?.length ? (
                <List
                  size="small"
                  dataSource={snapshots}
                  renderItem={(item) => (
                    <List.Item>
                      <div style={{ width: "100%" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                          <Title level={5} style={{ marginBottom: 0 }}>{item.title}</Title>
                          <Text type="secondary">{new Date(item.createdAt).toLocaleDateString("zh-CN")}</Text>
                        </div>
                        <Paragraph style={{ marginBottom: 0, color: "#666" }}>{item.summary}</Paragraph>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有分析快照，后续聊天问这只股票后会自动沉淀" />
              )}
            </div>
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="还没有保存这只股票的关注逻辑。补上后，AI 会更懂你为什么关注它。"
          />
        )}
      </Card>

      <Modal
        title={`编辑 ${name} 的关注逻辑`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        okText="保存逻辑"
        cancelText="取消"
        confirmLoading={saving}
        width={720}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div>
            <Text strong>关注原因</Text>
            <Input.TextArea
              rows={3}
              value={form.watchReason}
              placeholder="为什么把它加入自选？比如关注的行业趋势、估值切换或订单变化。"
              onChange={(event) => setForm((prev) => ({ ...prev, watchReason: event.target.value }))}
            />
          </div>

          <div>
            <Text strong>看多要点（换行分隔）</Text>
            <Input.TextArea
              rows={3}
              value={toTextareaValue(form.bullPoints)}
              placeholder="例如：订单改善\n行业景气回升"
              onChange={(event) => setForm((prev) => ({ ...prev, bullPoints: fromTextareaValue(event.target.value) }))}
            />
          </div>

          <div>
            <Text strong>风险点（换行分隔）</Text>
            <Input.TextArea
              rows={3}
              value={toTextareaValue(form.bearPoints)}
              placeholder="例如：估值偏高\n业绩兑现仍需验证"
              onChange={(event) => setForm((prev) => ({ ...prev, bearPoints: fromTextareaValue(event.target.value) }))}
            />
          </div>

          <div>
            <Text strong>观察信号（换行分隔）</Text>
            <Input.TextArea
              rows={3}
              value={toTextareaValue(form.watchSignals)}
              placeholder="例如：季度业绩\n大单流入\n政策催化"
              onChange={(event) => setForm((prev) => ({ ...prev, watchSignals: fromTextareaValue(event.target.value) }))}
            />
          </div>

          <div>
            <Text strong>失效条件（换行分隔）</Text>
            <Input.TextArea
              rows={3}
              value={toTextareaValue(form.invalidationConditions)}
              placeholder="例如：连续两个季度订单低于预期"
              onChange={(event) => setForm((prev) => ({ ...prev, invalidationConditions: fromTextareaValue(event.target.value) }))}
            />
          </div>

          <div>
            <Text strong>最近判断</Text>
            <Input.TextArea
              rows={3}
              value={form.lastJudgement}
              placeholder="例如：逻辑仍成立，但更适合等待回踩确认。"
              onChange={(event) => setForm((prev) => ({ ...prev, lastJudgement: event.target.value }))}
            />
          </div>

          <Alert
            type="info"
            showIcon
            message="这些信息会在聊天时作为长期记忆注入"
            description="AI 会优先参考你的关注原因、观察信号和风险点，但若与最新市场事实冲突，仍以最新事实为准。"
          />
        </Space>
      </Modal>
    </>
  );
}
