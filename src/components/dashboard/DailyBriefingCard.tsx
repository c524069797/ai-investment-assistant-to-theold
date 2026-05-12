"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Skeleton, Tag, Typography } from "antd";
import { GlobalOutlined, ReloadOutlined, SafetyCertificateOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useUser } from "@/lib/hooks/useUser";
import type { DailyMarketBriefing } from "@/lib/agents/global-market-briefing";

const { Paragraph, Text } = Typography;

function riskLabel(level: DailyMarketBriefing["riskLevel"]) {
  if (level === "high") return { color: "red", text: "高风险观察" };
  if (level === "low") return { color: "green", text: "风险偏低" };
  return { color: "gold", text: "中性观察" };
}

export default function DailyBriefingCard() {
  const { currentUser, isLoading: userLoading } = useUser();
  const [briefing, setBriefing] = useState<DailyMarketBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadBriefing = useCallback(async (force = false) => {
    if (!currentUser) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/agents/daily-briefing", { method: force ? "POST" : "GET" });
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || "晨报生成失败");
      }

      setBriefing(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "晨报生成失败");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      void loadBriefing(false);
    }
  }, [currentUser, loadBriefing]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<DailyMarketBriefing>;
      if (custom.detail) {
        setBriefing(custom.detail);
        setLoading(false);
        setError("");
      }
    };

    window.addEventListener("daily-briefing-ready", handler);
    return () => window.removeEventListener("daily-briefing-ready", handler);
  }, []);

  if (!currentUser && !userLoading) {
    return (
      <Card className="daily-briefing-card daily-briefing-card--guest">
        <div className="daily-briefing-card__head">
          <div>
            <Text className="daily-briefing-card__eyebrow">多 Agent 盘前晨报</Text>
            <h2 className="daily-briefing-card__title">登录后接收全球隔夜市场分析</h2>
          </div>
          <GlobalOutlined className="daily-briefing-card__icon" />
        </div>
        <Paragraph className="daily-briefing-card__summary">
          系统会在登录后自动启动全球市场侦察 Agent、财经新闻分析 Agent 和晨报协调 Agent，整理前一交易日全球股市与财经新闻影响。
        </Paragraph>
      </Card>
    );
  }

  const risk = briefing ? riskLabel(briefing.riskLevel) : null;

  return (
    <Card className="daily-briefing-card">
      <div className="daily-briefing-card__head">
        <div>
          <Text className="daily-briefing-card__eyebrow">多 Agent 盘前晨报</Text>
          <h2 className="daily-briefing-card__title">全球隔夜市场与财经新闻分析</h2>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => loadBriefing(true)} loading={loading}>
          重新生成
        </Button>
      </div>

      {loading && !briefing ? (
        <Skeleton active paragraph={{ rows: 4 }} title={false} />
      ) : error ? (
        <Alert type="warning" showIcon message="晨报暂时不可用" description={error} />
      ) : briefing ? (
        <>
          <div className="daily-briefing-card__meta">
            <Tag icon={<GlobalOutlined />} color="blue">目标日期 {briefing.targetDate}</Tag>
            <Tag icon={<SafetyCertificateOutlined />} color={risk?.color}>{risk?.text}</Tag>
            <Tag icon={<ThunderboltOutlined />} color={briefing.status === "agent_generated" ? "purple" : "default"}>
              {briefing.status === "agent_generated" ? "Agent 已生成" : "降级摘要"}
            </Tag>
          </div>

          <Paragraph className="daily-briefing-card__summary">{briefing.executiveSummary}</Paragraph>

          <div className="daily-briefing-card__grid">
            <div>
              <Text className="daily-briefing-card__section-title">关键脉冲</Text>
              <ul className="daily-briefing-card__list">
                {briefing.marketPulse.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <Text className="daily-briefing-card__section-title">开盘观察</Text>
              <ul className="daily-briefing-card__list">
                {briefing.watchItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="daily-briefing-card__agents">
            {briefing.agents.map((agent) => (
              <span key={agent.id} className="daily-briefing-card__agent">
                {agent.name}
                <em>{agent.status === "completed" ? "已完成" : "降级"}</em>
              </span>
            ))}
          </div>
        </>
      ) : (
        <Alert type="info" showIcon message="Agent 正在准备晨报" description="登录后系统会自动接收全球前一交易日市场与财经新闻。" />
      )}
    </Card>
  );
}
