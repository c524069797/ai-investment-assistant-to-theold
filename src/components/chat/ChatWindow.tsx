"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { Button, Input, List, Space, Spin, Tag, Typography, Empty, Card } from "antd";
import { SendOutlined, RobotOutlined, PlusOutlined, MessageOutlined } from "@ant-design/icons";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useUser } from "@/lib/hooks/useUser";
import MessageBubble from "./MessageBubble";

const { Text, Title } = Typography;

const QUICK_QUESTIONS = [
  "今日大盘怎么样？",
  "帮我查查贵州茅台的行情",
  "什么是基金？",
  "投资股票风险大吗？",
  "推荐适合新手的基金类型",
  "帮我做个风险评估",
];

interface ChatSessionSummary {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
}

interface ChatMessageRecord {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

function toUiMessages(messages: ChatMessageRecord[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  })) as UIMessage[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "请求失败");
  }
  return json.data as T;
}

function ConversationPanel({
  sessionId,
  initialMessages,
  onConversationChange,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
  onConversationChange: () => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/chat",
        body: { sessionId },
      }),
    [sessionId],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
    onFinish: onConversationChange,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleQuickQuestion = (question: string) => {
    sendMessage({ text: question });
    setInput("");
  };

  const handleSubmit = (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px - 72px)",
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #eef2f7",
        overflow: "hidden",
      }}
    >
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px",
          background: "#f8fafc",
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <RobotOutlined style={{ fontSize: 64, color: "#1677ff", marginBottom: 16 }} />
            <Title level={3}>您好！我是小智 🤖</Title>
            <Text style={{ fontSize: 16, color: "#666" }}>
              我会把本次对话自动保存，方便您下次继续追问。
              <br />
              可以直接问个股、基金、指数，或者点下面的快捷问题开始。
            </Text>
            <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {QUICK_QUESTIONS.map((q) => (
                <Tag
                  key={q}
                  color="blue"
                  style={{ cursor: "pointer", padding: "8px 16px", fontSize: 16, borderRadius: 20 }}
                  onClick={() => handleQuickQuestion(q)}
                >
                  {q}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div style={{ textAlign: "center", padding: 16 }}>
            <Spin size="small" />
            <Text style={{ marginLeft: 8, color: "#999" }}>小智正在思考...</Text>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fff" }}>
        <form onSubmit={handleSubmit}>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              size="large"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入您的问题..."
              style={{ fontSize: 18 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={isLoading}
              style={{ height: 48 }}
            >
              发送
            </Button>
          </Space.Compact>
        </form>
      </div>
    </div>
  );
}

export default function ChatWindow() {
  const { currentUser, isLoading: userLoading } = useUser();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!currentUser) return;
    setLoadingSessions(true);
    try {
      const data = await fetchJson<ChatSessionSummary[]>("/api/chat/sessions");
      setSessions(data);
      if (data.length > 0) {
        setSelectedSessionId((prev) => prev || data[0].id);
      } else {
        setSelectedSessionId("");
      }
    } finally {
      setLoadingSessions(false);
    }
  }, [currentUser]);

  const createSession = useCallback(async () => {
    setCreatingSession(true);
    try {
      const session = await fetchJson<ChatSessionSummary>("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadSessions();
      setSelectedSessionId(session.id);
      setInitialMessages([]);
    } finally {
      setCreatingSession(false);
    }
  }, [loadSessions]);

  useEffect(() => {
    if (!userLoading && currentUser) {
      loadSessions().catch(() => {
        setLoadingSessions(false);
      });
    }
  }, [currentUser, userLoading, loadSessions]);

  useEffect(() => {
    if (!userLoading && currentUser && !loadingSessions && sessions.length === 0 && !creatingSession) {
      createSession().catch(() => {});
    }
  }, [currentUser, userLoading, loadingSessions, sessions.length, creatingSession, createSession]);

  useEffect(() => {
    if (!selectedSessionId) return;
    setLoadingMessages(true);
    fetchJson<ChatMessageRecord[]>(`/api/chat/messages?sessionId=${encodeURIComponent(selectedSessionId)}`)
      .then((data) => setInitialMessages(toUiMessages(data)))
      .catch(() => setInitialMessages([]))
      .finally(() => setLoadingMessages(false));
  }, [selectedSessionId]);

  if (userLoading) {
    return <div style={{ textAlign: "center", padding: 80 }}><Spin /></div>;
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 16, padding: "0 16px 16px" }}>
        <Card
          title="历史对话"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => createSession()} loading={creatingSession}>
              新建
            </Button>
          }
          style={{ borderRadius: 16 }}
          styles={{ body: { padding: 12 } }}
        >
          {loadingSessions ? (
            <div style={{ textAlign: "center", padding: 32 }}><Spin /></div>
          ) : sessions.length === 0 ? (
            <Empty description="暂无历史对话" />
          ) : (
            <List
              dataSource={sessions}
              renderItem={(item) => (
                <List.Item
                  onClick={() => setSelectedSessionId(item.id)}
                  style={{
                    cursor: "pointer",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    border: item.id === selectedSessionId ? "1px solid #1677ff" : "1px solid #eef2f7",
                    background: item.id === selectedSessionId ? "#f0f7ff" : "#fff",
                  }}
                >
                  <div style={{ width: "100%" }}>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                      <Text strong ellipsis>{item.title}</Text>
                      <MessageOutlined style={{ color: "#8c8c8c" }} />
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.preview ? item.preview.slice(0, 28) : "继续你的投资问题"}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>

        {selectedSessionId ? (
          loadingMessages ? (
            <div style={{ textAlign: "center", padding: 80 }}><Spin /></div>
          ) : (
            <ConversationPanel
              key={`${selectedSessionId}-${initialMessages.length}`}
              sessionId={selectedSessionId}
              initialMessages={initialMessages}
              onConversationChange={() => loadSessions()}
            />
          )
        ) : (
          <div style={{ textAlign: "center", padding: 80 }}><Spin /></div>
        )}
      </div>
    </div>
  );
}
