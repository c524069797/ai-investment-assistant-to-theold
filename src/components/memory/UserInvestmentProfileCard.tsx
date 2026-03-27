"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Alert, Button, Card, Form, Input, Select, Space, Spin, Typography, message } from "antd";
import {
  createDefaultUserInvestmentProfile,
  DISLIKED_PATTERN_OPTIONS,
  EVIDENCE_OPTIONS,
  HOLDING_PERIOD_OPTIONS,
  INVESTMENT_STYLE_OPTIONS,
  RISK_PREFERENCE_OPTIONS,
  type UserInvestmentProfileData,
} from "@/lib/memory/shared";

const { Paragraph, Text, Title } = Typography;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "请求失败");
  }
  return json.data as UserInvestmentProfileData;
};

export default function UserInvestmentProfileCard() {
  const { data, isLoading, error, mutate } = useSWR("/api/memory/profile", fetcher);
  const [form, setForm] = useState<UserInvestmentProfileData>(createDefaultUserInvestmentProfile());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({ ...createDefaultUserInvestmentProfile(), ...data });
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/memory/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || "保存失败");
      }
      await mutate();
      message.success("投资画像已保存");
    } catch (saveError) {
      message.error(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <Card><div style={{ textAlign: "center", padding: 40 }}><Spin /></div></Card>;
  }

  return (
    <Card>
      <Space direction="vertical" size={4} style={{ width: "100%", marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 0 }}>🧠 MemBrain 投资画像</Title>
        <Paragraph style={{ marginBottom: 0, color: "#666" }}>
          这些偏好会注入聊天上下文，让 AI 更理解你是偏保守、偏成长，还是更看重财报兑现与风险控制。
        </Paragraph>
      </Space>

      {error ? (
        <Alert type="warning" showIcon message="投资画像加载失败" description={error.message} />
      ) : null}

      <Form layout="vertical">
        <Form.Item label="风险偏好">
          <Select
            value={form.riskPreference}
            options={RISK_PREFERENCE_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
            onChange={(value) => setForm((prev) => ({ ...prev, riskPreference: value }))}
          />
        </Form.Item>

        <Form.Item label="投资风格">
          <Select
            mode="multiple"
            value={form.investmentStyle}
            options={INVESTMENT_STYLE_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
            placeholder="可多选"
            onChange={(value) => setForm((prev) => ({ ...prev, investmentStyle: value }))}
          />
        </Form.Item>

        <Form.Item label="偏好持有周期">
          <Select
            value={form.holdingPeriodPreference}
            options={HOLDING_PERIOD_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
            onChange={(value) => setForm((prev) => ({ ...prev, holdingPeriodPreference: value }))}
          />
        </Form.Item>

        <Form.Item label="更看重的证据类型">
          <Select
            mode="multiple"
            value={form.preferredEvidence}
            options={EVIDENCE_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
            placeholder="例如财报、订单、政策"
            onChange={(value) => setForm((prev) => ({ ...prev, preferredEvidence: value }))}
          />
        </Form.Item>

        <Form.Item label="不喜欢的模式">
          <Select
            mode="multiple"
            value={form.dislikedPatterns}
            options={DISLIKED_PATTERN_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
            placeholder="例如纯题材炒作、高位追涨"
            onChange={(value) => setForm((prev) => ({ ...prev, dislikedPatterns: value }))}
          />
        </Form.Item>

        <Form.Item label="给 AI 的补充说明">
          <Input.TextArea
            rows={4}
            value={form.summary}
            placeholder="例如：我更关注财报兑现，不喜欢高位追涨，希望回答更稳健一点。"
            onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
          />
        </Form.Item>
      </Form>

      <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
        <Text type="secondary">保存后，聊天与后续分析会优先参考这些偏好。</Text>
        <Button type="primary" loading={saving} onClick={handleSave}>保存画像</Button>
      </Space>
    </Card>
  );
}
