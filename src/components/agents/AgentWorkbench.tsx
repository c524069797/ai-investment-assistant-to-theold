"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Skeleton, Space, Tag, Typography, message } from "antd";
import { LoginOutlined, PlayCircleOutlined, ReloadOutlined, RobotOutlined, ThunderboltOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";
import type { AgentCatalogItem, AgentCategory, AgentRunResult } from "@/lib/agents/types";
import MarketingVisual from "@/components/marketing/MarketingVisual";
import ChatHandoffLink from "@/components/chat/ChatHandoffLink";

const { Paragraph, Text } = Typography;

const CATEGORY_LABELS: Record<AgentCategory, string> = {
  market: "市场",
  portfolio: "自选",
  research: "研究",
  education: "学习",
  support: "支持",
};

const RISK_LABELS = {
  low: { color: "green", text: "风险偏低" },
  medium: { color: "gold", text: "中性观察" },
  high: { color: "red", text: "高风险观察" },
} as const;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const json = await response.json();

  if (!json.success) {
    throw new Error(json.error || "请求失败");
  }

  return json.data as T;
}

function AgentResultCard({ result }: { result: AgentRunResult }) {
  const risk = result.riskLevel ? RISK_LABELS[result.riskLevel] : null;

  return (
    <Card className="agent-result-card">
      <div className="agent-result-card__head">
        <div>
          <Text className="agent-result-card__eyebrow">{CATEGORY_LABELS[result.category]} · {result.name}</Text>
          <h3 className="agent-result-card__title">{result.summary}</h3>
        </div>
        <div className="agent-result-card__tags">
          <Tag color={result.status === "completed" ? "blue" : "default"}>
            {result.status === "fallback" ? "降级结果" : "已完成"}
          </Tag>
          {risk ? <Tag color={risk.color}>{risk.text}</Tag> : null}
        </div>
      </div>

      <div className="agent-result-card__sections">
        {result.sections.map((section) => (
          <div key={section.title} className="agent-result-card__section">
            <Text className="agent-result-card__section-title">{section.title}</Text>
            <ul>
              {section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="agent-result-card__footer">
        <Text className="agent-result-card__disclosure">{result.disclosure}</Text>
        <Space wrap>
          {result.actions.map((action) => (
            <ChatHandoffLink href={action.href} key={`${result.id}-${action.href}`}>
              <Button type={action.variant === "primary" ? "primary" : "default"}>{action.label}</Button>
            </ChatHandoffLink>
          ))}
        </Space>
      </div>
    </Card>
  );
}

export default function AgentWorkbench() {
  const { currentUser, isLoading: userLoading } = useUser();
  const [catalog, setCatalog] = useState<AgentCatalogItem[]>([]);
  const [results, setResults] = useState<Record<string, AgentRunResult>>({});
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [runningIds, setRunningIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson<AgentCatalogItem[]>("/api/agents")
      .then(setCatalog)
      .catch((err) => setError(err instanceof Error ? err.message : "Agent 目录加载失败"))
      .finally(() => setLoadingCatalog(false));
  }, []);

  const runningSet = useMemo(() => new Set(runningIds), [runningIds]);
  const agentIds = useMemo(() => catalog.map((agent) => agent.id), [catalog]);

  const runAgents = useCallback(async (ids: string[], force = true) => {
    if (!currentUser || !ids.length) return;

    setRunningIds((current) => Array.from(new Set([...current, ...ids])));
    setError("");

    try {
      const data = await fetchJson<AgentRunResult | AgentRunResult[]>("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIds: ids, force }),
      });
      const nextResults = Array.isArray(data) ? data : [data];

      setResults((current) => {
        const next = { ...current };
        for (const result of nextResults) {
          next[result.id] = result;
        }
        return next;
      });
      message.success(ids.length > 1 ? "Agent 编队运行完成" : "Agent 运行完成");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Agent 执行失败";
      setError(msg);
      message.error(msg);
    } finally {
      setRunningIds((current) => current.filter((id) => !ids.includes(id)));
    }
  }, [currentUser]);

  if (!currentUser && !userLoading) {
    return (
      <Card className="agent-workbench-guest">
        <RobotOutlined className="agent-workbench-guest__icon" />
        <h2>登录后启用 Agent 工作台</h2>
        <Paragraph>
          Agent 工作台会读取你的自选、对话、观点和记忆进度，生成个性化巡检结果。游客模式可以先浏览行情和课程。
        </Paragraph>
        <Link href="/login">
          <Button type="primary" size="large" icon={<LoginOutlined />}>选择身份登录</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="agent-workbench">
      <Card className="agent-workbench-hero">
        <div>
          <Text className="agent-workbench-hero__eyebrow">Agent Operations Center</Text>
          <h1>多 Agent 工作台</h1>
          <Paragraph>
            把盘前晨报、自选巡检、观点共识、学习路径和支持引导拆成独立 Agent。每个 Agent 有明确职责、触发条件、缓存策略和输出格式，避免把业务逻辑堆在页面组件里。
          </Paragraph>
        </div>
        <MarketingVisual
          alt="多 Agent 工作台运行界面展示"
          className="agent-workbench-hero__media"
          src="/marketing/hero-agents.png"
          tone="compact"
        />
        <Button
          type="primary"
          size="large"
          icon={<ThunderboltOutlined />}
          disabled={!catalog.length}
          loading={runningIds.length > 0 && runningIds.length === catalog.length}
          onClick={() => runAgents(agentIds, true)}
        >
          运行全部 Agent
        </Button>
      </Card>

      {error ? <Alert type="warning" showIcon message="Agent 工作台提示" description={error} /> : null}

      {loadingCatalog ? (
        <Card className="agent-workbench-loading">
          <Skeleton active paragraph={{ rows: 5 }} />
        </Card>
      ) : catalog.length ? (
        <div className="agent-catalog-grid">
          {catalog.map((agent) => (
            <Card key={agent.id} className="agent-catalog-card">
              <div className="agent-catalog-card__head">
                <Tag color="blue">{CATEGORY_LABELS[agent.category]}</Tag>
                <Text>{agent.cadence}</Text>
              </div>
              <h2>{agent.title}</h2>
              <Paragraph>{agent.description}</Paragraph>
              <div className="agent-catalog-card__meta">
                <span>职责：{agent.responsibility}</span>
                <span>触发：{agent.trigger}</span>
                <span>输出：{agent.outputLabel}</span>
              </div>
              <Button
                type="primary"
                icon={runningSet.has(agent.id) ? <ReloadOutlined spin /> : <PlayCircleOutlined />}
                loading={runningSet.has(agent.id)}
                onClick={() => runAgents([agent.id], true)}
                block
              >
                运行这个 Agent
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Empty description="暂无可用 Agent" />
      )}

      <div className="agent-result-stack">
        {Object.values(results).map((result) => (
          <AgentResultCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}
