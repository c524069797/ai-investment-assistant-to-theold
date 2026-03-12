"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import {
  Button,
  Card,
  Empty,
  Input,
  List,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  PlusOutlined,
  RobotOutlined,
  SaveOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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

function buildStockPrompt(code: string, name?: string) {
  const target = name ? `${name}（${code}）` : code;
  return `请帮我系统分析一下${target}，重点看：1）技术面强弱；2）近7日相关新闻；3）支撑位、压力位、突破位；4）量能和主力行为；5）前一交易日是否上龙虎榜。`;
}

function buildStockSessionTitle(code: string, name?: string) {
  return name ? `${name}分析` : `${code}分析`;
}

function ConversationPanel({
  sessionId,
  initialMessages,
  initialPrompt,
  onConversationChange,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
  initialPrompt?: string;
  onConversationChange: () => void;
}) {
  const [input, setInput] = useState("");
  const autoPromptSentRef = useRef(false);
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

  useEffect(() => {
    if (initialPrompt && !autoPromptSentRef.current && initialMessages.length === 0) {
      autoPromptSentRef.current = true;
      sendMessage({ text: initialPrompt });
    }
  }, [initialPrompt, initialMessages.length, sendMessage]);

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
      className="chat-conversation-panel"
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
        className="chat-messages-area"
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
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [editingSessionId, setEditingSessionId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const handledStockRef = useRef("");

  const loadSessions = useCallback(async () => {
    if (!currentUser) return;
    setLoadingSessions(true);
    try {
      const data = await fetchJson<ChatSessionSummary[]>("/api/chat/sessions");
      setSessions(data);
      if (data.length > 0) {
        setSelectedSessionId((prev) => (prev && data.some((item) => item.id === prev) ? prev : data[0].id));
      } else {
        setSelectedSessionId("");
      }
    } finally {
      setLoadingSessions(false);
    }
  }, [currentUser]);

  const createSession = useCallback(async (title?: string) => {
    setCreatingSession(true);
    try {
      const session = await fetchJson<ChatSessionSummary>("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(title ? { title } : {}),
      });
      await loadSessions();
      setSelectedSessionId(session.id);
      setInitialMessages([]);
      return session;
    } finally {
      setCreatingSession(false);
    }
  }, [loadSessions]);

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    await fetchJson("/api/chat/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, title }),
    });
    setEditingSessionId("");
    setEditingTitle("");
    await loadSessions();
  }, [loadSessions]);

  const removeSession = useCallback(async (sessionId: string) => {
    await fetchJson(`/api/chat/sessions?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
    const remaining = sessions.filter((item) => item.id !== sessionId);
    setSessions(remaining);
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(remaining[0]?.id ?? "");
      setInitialMessages([]);
    }
    if (remaining.length === 0) {
      await createSession();
    } else {
      await loadSessions();
    }
  }, [sessions, selectedSessionId, createSession, loadSessions]);

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

  useEffect(() => {
    const stock = searchParams.get("stock") ?? "";
    const stockName = searchParams.get("name") ?? "";
    const stockKey = `${stock}-${stockName}`;
    if (!stock || !currentUser || loadingSessions || creatingSession || handledStockRef.current === stockKey) {
      return;
    }

    handledStockRef.current = stockKey;
    createSession(buildStockSessionTitle(stock, stockName))
      .then((session) => {
        if (session) {
          setSelectedSessionId(session.id);
          setPendingPrompt(buildStockPrompt(stock, stockName));
        }
      })
      .catch(() => {
        handledStockRef.current = "";
      });
  }, [searchParams, currentUser, loadingSessions, creatingSession, createSession]);

  const filteredSessions = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return sessions;
    return sessions.filter((item) =>
      item.title.toLowerCase().includes(keyword) || item.preview.toLowerCase().includes(keyword),
    );
  }, [sessions, searchKeyword]);

  if (userLoading) {
    return <div style={{ textAlign: "center", padding: 80 }}><Spin /></div>;
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div className="chat-layout" style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: 16, padding: "0 16px 16px" }}>
        <Card
          title="历史对话"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => createSession()} loading={creatingSession}>
              新建
            </Button>
          }
          className="chat-sidebar-card"
          style={{ borderRadius: 16 }}
          styles={{ body: { padding: 12 } }}
        >
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索历史对话"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          {loadingSessions ? (
            <div style={{ textAlign: "center", padding: 32 }}><Spin /></div>
          ) : filteredSessions.length === 0 ? (
            <Empty description={searchKeyword ? "没有匹配的对话" : "暂无历史对话"} />
          ) : (
            <List
              dataSource={filteredSessions}
              renderItem={(item) => (
                <List.Item
                  style={{
                    display: "block",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    border: item.id === selectedSessionId ? "1px solid #1677ff" : "1px solid #eef2f7",
                    background: item.id === selectedSessionId ? "#f0f7ff" : "#fff",
                  }}
                >
                  {editingSessionId === item.id ? (
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onPressEnter={() => renameSession(item.id, editingTitle.trim() || item.title)}
                      />
                      <Space>
                        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => renameSession(item.id, editingTitle.trim() || item.title)}>
                          保存
                        </Button>
                        <Button size="small" onClick={() => { setEditingSessionId(""); setEditingTitle(""); }}>
                          取消
                        </Button>
                      </Space>
                    </Space>
                  ) : (
                    <div>
                      <div
                        onClick={() => setSelectedSessionId(item.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                          <Text strong ellipsis style={{ maxWidth: 180 }}>{item.title}</Text>
                          <MessageOutlined style={{ color: "#8c8c8c" }} />
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.preview ? item.preview.slice(0, 32) : "继续你的投资问题"}
                        </Text>
                      </div>
                      <Space style={{ marginTop: 8 }}>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingSessionId(item.id);
                            setEditingTitle(item.title);
                          }}
                        >
                          重命名
                        </Button>
                        <Popconfirm
                          title="确定删除这条会话吗？"
                          description="删除后无法恢复"
                          onConfirm={() => removeSession(item.id)}
                          okText="删除"
                          cancelText="取消"
                        >
                          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                        </Popconfirm>
                      </Space>
                    </div>
                  )}
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
              key={`${selectedSessionId}-${initialMessages.length}-${pendingPrompt}`}
              sessionId={selectedSessionId}
              initialMessages={initialMessages}
              initialPrompt={pendingPrompt || undefined}
              onConversationChange={() => {
                setPendingPrompt("");
                loadSessions();
              }}
            />
          )
        ) : (
          <div style={{ textAlign: "center", padding: 80 }}><Spin /></div>
        )}
      </div>
    </div>
  );
}
