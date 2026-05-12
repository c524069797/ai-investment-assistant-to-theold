"use client";

// `"use client"` 是 App Router 的边界声明：
// 当前文件以及它直接导出的组件都会在浏览器执行，
// 因为这里用了 useState / useEffect / useSearchParams / 事件处理，所以必须是 Client Component。
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Grid,
  Input,
  List,
  Popconfirm,
  Spin,
  Typography,
} from "antd";
import {
  AudioOutlined,
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  PictureOutlined,
  PlusOutlined,
  RobotOutlined,
  SaveOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import { useFontSize } from "@/components/layout/AntdProvider";
import MarketingVisual from "@/components/marketing/MarketingVisual";
import { consumeChatHandoff, getChatStarter } from "@/lib/chat/handoff";
import MessageBubble from "./MessageBubble";

// 聊天页面的技术组合：
// - @ai-sdk/react/useChat：管理消息流、提交状态、错误态
// - TextStreamChatTransport：把前端输入接到 /api/chat Route Handler
// - Ant Design：承担桌面 / 移动端 UI 壳子
// - Next.js App Router：通过 searchParams 支持“从股票页一键带问题进入聊天”
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const QUICK_QUESTIONS = [
  "今天大盘情绪怎么样？我应该先看风险还是机会？",
  "科技、消费、红利，今天谁更强？",
  "结合我的自选股，帮我排一下优先观察顺序。",
  "今天大V整体偏多还是偏谨慎？",
  "帮我把今天策略说得再通俗一点。",
  "如果我是保守型投资者，今天该注意什么？",
];

interface ChatSessionSummary {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
}

interface ChatMessageRecord {
  id: string;
  // 字面量联合类型比单纯 string 更有约束力，能防止拼错角色名。
  role: "user" | "assistant" | "system";
  content: string;
}

function toUiMessages(messages: ChatMessageRecord[]): UIMessage[] {
  // 数据库存的是简化消息结构，这里把它转换成 AI SDK 需要的 UIMessage。
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  })) as UIMessage[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  // 这是一个常见 TS 泛型工具函数：
  // `fetchJson<ChatSessionSummary[]>`、`fetchJson<ChatMessageRecord[]>` 都能复用同一个实现。
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

function autoPromptStorageKey(sessionId: string, prompt: string) {
  let hash = 0;
  for (let index = 0; index < prompt.length; index += 1) {
    hash = Math.imul(31, hash) + prompt.charCodeAt(index) | 0;
  }
  return `ai-investment-auto-prompt:${sessionId}:${Math.abs(hash)}`;
}

function SessionList({
  filteredSessions,
  sessionMeta,
  selectedSessionId,
  searchKeyword,
  setSearchKeyword,
  sessionError,
  loadingSessions,
  editingSessionId,
  editingTitle,
  setEditingSessionId,
  setEditingTitle,
  renameSession,
  removeSession,
  setSelectedSessionId,
  onCreateSession,
  creatingSession,
  onSelectSession,
}: {
  filteredSessions: ChatSessionSummary[];
  sessionMeta: string;
  selectedSessionId: string;
  searchKeyword: string;
  setSearchKeyword: (value: string) => void;
  sessionError: string;
  loadingSessions: boolean;
  editingSessionId: string;
  editingTitle: string;
  setEditingSessionId: (value: string) => void;
  setEditingTitle: (value: string) => void;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  setSelectedSessionId: (value: string) => void;
  onCreateSession: () => void;
  creatingSession: boolean;
  onSelectSession?: () => void;
}) {
  return (
    <div className="chat-history-panel">
      <Button className="chat-history-panel__new" type="primary" icon={<PlusOutlined />} onClick={onCreateSession} loading={creatingSession}>
        新建对话
      </Button>
      <div className="chat-history-panel__title-wrap">
        <div className="chat-history-panel__title">对话记录</div>
        <div className="chat-history-panel__meta">{sessionMeta}</div>
      </div>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="搜索历史对话"
        value={searchKeyword}
        onChange={(event) => setSearchKeyword(event.target.value)}
        className="chat-history-panel__search"
      />
      {sessionError && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="会话加载异常"
          description={sessionError}
        />
      )}
      {loadingSessions ? (
        <div style={{ textAlign: "center", padding: 32 }}><Spin /></div>
      ) : filteredSessions.length ? (
        <List
          dataSource={filteredSessions}
          className="chat-history-list"
          renderItem={(item) => (
            <List.Item className="chat-session-item" data-active={item.id === selectedSessionId}>
              {editingSessionId === item.id ? (
                <div className="chat-session-item__edit">
                  <Input
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onPressEnter={() => renameSession(item.id, editingTitle.trim() || item.title)}
                  />
                  <div className="chat-session-item__actions">
                    <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => renameSession(item.id, editingTitle.trim() || item.title)}>
                      保存
                    </Button>
                    <Button size="small" onClick={() => { setEditingSessionId(""); setEditingTitle(""); }}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="chat-session-item__content">
                  <button
                    className="chat-session-item__main"
                    onClick={() => {
                      setSelectedSessionId(item.id);
                      onSelectSession?.();
                    }}
                  >
                    <span className="chat-session-item__name">{item.title}</span>
                    <span className="chat-session-item__preview">{item.preview ? item.preview.slice(0, 38) : "继续你的投资问题"}</span>
                  </button>
                  <div className="chat-session-item__actions">
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
                    <Popconfirm title="确定删除这条会话吗？" description="删除后无法恢复" onConfirm={() => removeSession(item.id)} okText="删除" cancelText="取消">
                      <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                  </div>
                </div>
              )}
            </List.Item>
          )}
        />
      ) : (
        <Empty description={searchKeyword ? "没有匹配的对话" : "暂无历史对话"} />
      )}
    </div>
  );
}

function ConversationPanel({
  sessionId,
  initialMessages,
  initialPrompt,
  onConversationChange,
  selectedTitle,
  onOpenHistory,
  isMobile,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
  initialPrompt?: string;
  onConversationChange: () => void;
  selectedTitle?: string;
  onOpenHistory?: () => void;
  isMobile: boolean;
}) {
  const [input, setInput] = useState("");
  const [chatError, setChatError] = useState("");
  const { fontSize, increase, decrease, reset } = useFontSize();
  const autoPromptSentRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    // transport 决定 useChat 如何把消息发送到后端；这里额外把 sessionId 带给服务端做会话持久化。
    () => new TextStreamChatTransport({ api: "/api/chat", body: { sessionId } }),
    [sessionId],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
    // useChat 会自动维护消息列表和流式状态；这里只补充业务侧的收尾动作。
    onFinish: () => {
      setChatError("");
      onConversationChange();
    },
    onError: (error) => {
      setChatError(error instanceof Error ? error.message : "AI 助手暂时无法响应，请稍后再试。");
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    // 支持“从别的页面带着 prompt 进入聊天”，例如股票卡片上的一键 AI 分析。
    if (initialPrompt && !autoPromptSentRef.current && !initialMessages.length) {
      const storageKey = autoPromptStorageKey(sessionId, initialPrompt);
      if (sessionStorage.getItem(storageKey)) {
        autoPromptSentRef.current = true;
        return;
      }
      autoPromptSentRef.current = true;
      sessionStorage.setItem(storageKey, "sent");
      sendMessage({ text: initialPrompt });
    }
  }, [sessionId, initialPrompt, initialMessages.length, sendMessage]);

  const handleQuickQuestion = (question: string) => {
    setChatError("");
    sendMessage({ text: question });
    setInput("");
  };

  const handleSubmit = (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    if (!input.trim()) return;
    setChatError("");
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div
      className="chat-conversation-panel tech-chat-shell chat-reference-shell"
      // `--chat-font-scale` 是自定义 CSS 变量；TS 默认不认识这种属性名，
      // 所以这里把 style 显式断言成 CSSProperties。
      style={{ "--chat-font-scale": String(fontSize / 16) } as CSSProperties}
    >
      <div className="chat-reference-shell__topbar">
        <div className="chat-reference-shell__brand">
          {isMobile ? (
            <Button className="chat-history-trigger" icon={<MessageOutlined />} onClick={onOpenHistory}>
              历史
            </Button>
          ) : null}
          <div className="chat-reference-shell__title-group">
            <Text className="chat-reference-shell__eyebrow">AI 问答陪伴</Text>
            <Title level={2} className="chat-reference-shell__title">AI 投资助手</Title>
            <Text className="chat-reference-shell__subtitle">围绕大盘、板块、自选股和大V观点，给你更通俗的分析结论。</Text>
          </div>
        </div>
        <div className="chat-reference-shell__font-tools">
          <Button className="chat-font-btn" onClick={decrease}>A-</Button>
          <Button className="chat-font-btn chat-font-btn--active" onClick={reset}>Tt</Button>
          <Button className="chat-font-btn" onClick={increase}>A+</Button>
        </div>
      </div>

      <div ref={scrollRef} className="chat-messages-area tech-chat-shell__body chat-reference-shell__body">
        <div className="chat-messages-stack">
          {selectedTitle ? <div className="chat-session-caption">当前会话：{selectedTitle}</div> : null}

          {!messages.length && (
            <div className="chat-empty-state chat-empty-state--redesign">
              <div className="chat-empty-state__icon">
                <RobotOutlined />
              </div>
              <Title level={3}>今晚先看什么？我来帮你理顺</Title>
              <Text className="chat-empty-state__desc">
                你可以直接问大盘情绪、板块强弱、个股位置、自选股优先级和大V观点，我会把每次分析自动整理进历史对话。
              </Text>
              <MarketingVisual
                alt="AI 投资助手对话界面展示"
                className="chat-empty-state__media"
                src="/marketing/hero-agents.png"
                tone="compact"
              />
              <div className="chat-quick-grid chat-quick-grid--stack">
                {QUICK_QUESTIONS.map((question) => (
                  <button key={question} className="chat-quick-chip chat-quick-chip--red" onClick={() => handleQuickQuestion(question)}>
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} fontSize={fontSize} />
          ))}

          {chatError && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="AI 助手本次响应异常"
              description={chatError}
            />
          )}

          {isLoading && (
            <div className="tech-chat-loading chat-reference-shell__loading">
              <Spin size="small" />
              <Text style={{ color: "var(--text-secondary)" }}>正在整理盘面、新闻和历史观点，请稍候...</Text>
            </div>
          )}
        </div>
      </div>

      <div className="tech-chat-shell__composer chat-reference-shell__composer">
        <button type="button" className="chat-composer-side-btn" title="语音整理能力稍后接入" aria-label="语音功能暂未开放">
          <AudioOutlined />
        </button>
        <button type="button" className="chat-composer-side-btn" title="图片识别能力稍后接入" aria-label="图片功能暂未开放">
          <PictureOutlined />
        </button>
        <form className="chat-composer-form" onSubmit={handleSubmit}>
          <Input
            size="large"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="输入问题、股票代码，或者想看的老师观点..."
            className="chat-composer-input"
            style={{ fontSize }}
            onPressEnter={(event) => {
              if (!event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button type="primary" size="large" htmlType="submit" icon={<SendOutlined />} loading={isLoading} className="chat-send-btn">
            发送
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ChatWindow() {
  const { currentUser, isLoading: userLoading } = useUser();
  const { fontSize } = useFontSize();
  // `useSearchParams` 是 App Router 的客户端导航 hook，所以当前页面必须是 Client Component。
  const router = useRouter();
  const searchParams = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [sessionError, setSessionError] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [editingSessionId, setEditingSessionId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const handledStockRef = useRef("");
  const handledPromptRef = useRef("");
  const handledHandoffRef = useRef("");
  const handledStarterRef = useRef("");

  const loadMessages = useCallback(async (sessionId: string) => {
    setLoadingMessages(true);
    try {
      const data = await fetchJson<ChatMessageRecord[]>(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`);
      setSessionError("");
      setInitialMessages(toUiMessages(data));
    } catch (error) {
      setInitialMessages([]);
      setSessionError(error instanceof Error ? error.message : "会话消息加载失败");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    if (!currentUser) return;
    setLoadingSessions(true);

    // 会话列表与消息列表分开加载，能让左侧历史面板更快出现。
    try {
      const data = await fetchJson<ChatSessionSummary[]>("/api/chat/sessions");
      setSessionError("");
      setSessions(data);
      if (data.length) {
        setSelectedSessionId((prev) => (prev && data.some((item) => item.id === prev) ? prev : data[0].id));
      } else {
        setSelectedSessionId("");
      }
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "历史会话加载失败");
      throw error;
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
      setSessions((current) => {
        const exists = current.some((item) => item.id === session.id);
        return exists ? current : [session, ...current];
      });
      setSelectedSessionId(session.id);
      setInitialMessages([]);
      return session;
    } finally {
      setCreatingSession(false);
    }
  }, []);

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
    if (!remaining.length) {
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
    if (!userLoading && currentUser && !loadingSessions && !sessions.length && !creatingSession) {
      createSession().catch(() => {});
    }
  }, [currentUser, userLoading, loadingSessions, sessions.length, creatingSession, createSession]);

  useEffect(() => {
    if (!selectedSessionId) return;
    loadMessages(selectedSessionId);
  }, [selectedSessionId, loadMessages]);

  useEffect(() => {
    const handoffId = searchParams.get("handoff") ?? "";
    if (!handoffId || !currentUser || loadingSessions || creatingSession || handledHandoffRef.current === handoffId) {
      return;
    }

    const handoff = consumeChatHandoff(handoffId);
    handledHandoffRef.current = handoffId;
    router.replace("/chat", { scroll: false });

    if (!handoff?.prompt) {
      return;
    }

    setInitialMessages([]);
    createSession(handoff.title)
      .then((session) => {
        if (session) {
          setSelectedSessionId(session.id);
          setPendingPrompt(handoff.prompt);
        }
      })
      .catch(() => {
        handledHandoffRef.current = "";
      });
  }, [searchParams, currentUser, loadingSessions, creatingSession, createSession, router]);

  useEffect(() => {
    const starter = searchParams.get("starter") ?? "";
    if (!starter || !currentUser || loadingSessions || creatingSession || handledStarterRef.current === starter) {
      return;
    }

    const handoff = getChatStarter(starter);
    handledStarterRef.current = starter;
    router.replace("/chat", { scroll: false });

    if (!handoff?.prompt) {
      return;
    }

    setInitialMessages([]);
    createSession(handoff.title)
      .then((session) => {
        if (session) {
          setSelectedSessionId(session.id);
          setPendingPrompt(handoff.prompt);
        }
      })
      .catch(() => {
        handledStarterRef.current = "";
      });
  }, [searchParams, currentUser, loadingSessions, creatingSession, createSession, router]);

  useEffect(() => {
    const stock = searchParams.get("stock") ?? "";
    const stockName = searchParams.get("name") ?? "";
    const stockKey = `${stock}-${stockName}`;
    if (!stock || !currentUser || loadingSessions || creatingSession || handledStockRef.current === stockKey) {
      return;
    }

    handledStockRef.current = stockKey;
    setInitialMessages([]);
    createSession(buildStockSessionTitle(stock, stockName))
      .then((session) => {
        if (session) {
          setSelectedSessionId(session.id);
          setPendingPrompt(buildStockPrompt(stock, stockName));
          router.replace("/chat", { scroll: false });
        }
      })
      .catch(() => {
        handledStockRef.current = "";
      });
  }, [searchParams, currentUser, loadingSessions, creatingSession, createSession, router]);

  useEffect(() => {
    const prompt = searchParams.get("prompt")?.trim() ?? "";
    const title = searchParams.get("title")?.trim() ?? "快捷分析";
    const promptKey = `${title}-${prompt}`;
    if (!prompt || !currentUser || loadingSessions || creatingSession || handledPromptRef.current === promptKey) {
      return;
    }

    handledPromptRef.current = promptKey;
    setInitialMessages([]);
    createSession(title)
      .then((session) => {
        if (session) {
          setSelectedSessionId(session.id);
          setPendingPrompt(prompt);
          router.replace("/chat", { scroll: false });
        }
      })
      .catch(() => {
        handledPromptRef.current = "";
      });
  }, [searchParams, currentUser, loadingSessions, creatingSession, createSession, router]);

  useEffect(() => {
    if (!isMobile) {
      setHistoryOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    document.documentElement.classList.add("chat-page-root-active");
    document.body.classList.add("chat-page-active");
    if (isMobile) {
      document.documentElement.classList.add("chat-page-root-mobile");
      document.body.classList.add("chat-page-mobile");
    } else {
      document.documentElement.classList.remove("chat-page-root-mobile");
      document.body.classList.remove("chat-page-mobile");
    }

    return () => {
      document.documentElement.classList.remove("chat-page-root-active");
      document.documentElement.classList.remove("chat-page-root-mobile");
      document.body.classList.remove("chat-page-active");
      document.body.classList.remove("chat-page-mobile");
    };
  }, [isMobile]);

  const filteredSessions = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return sessions;
    return sessions.filter((item) => item.title.toLowerCase().includes(keyword) || item.preview.toLowerCase().includes(keyword));
  }, [sessions, searchKeyword]);

  const sessionMeta = useMemo(() => {
    if (!sessions.length) {
      return "你的新对话会自动保存在这里";
    }
    if (searchKeyword.trim()) {
      return `共 ${sessions.length} 条，当前匹配 ${filteredSessions.length} 条`;
    }
    return `最近共 ${sessions.length} 条会话`;
  }, [sessions.length, filteredSessions.length, searchKeyword]);

  const selectedSession = sessions.find((item) => item.id === selectedSessionId);

  if (userLoading) {
    return <div style={{ textAlign: "center", padding: 80 }}><Spin /></div>;
  }

  if (!currentUser) {
    return (
      <div className="page-container">
        <Card className="guest-gate-card">
          <div className="guest-gate-card__icon">🤖</div>
          <Title level={3} style={{ marginBottom: 8 }}>游客模式可浏览，登录后开启 AI 对话</Title>
          <Typography.Paragraph className="guest-gate-card__desc">
            为了保存历史会话、自选股上下文和长期记忆，AI 问答需要先选择一个身份。你仍然可以继续浏览行情、股票、基金、大V观点和投资学堂。
          </Typography.Paragraph>
          <div className="guest-gate-card__actions">
            <Button type="primary" href="/login" size="large">选择身份登录</Button>
            <Button href="/stocks" size="large">先看股票行情</Button>
          </div>
        </Card>
      </div>
    );
  }

  const historyContent = (
    <SessionList
      filteredSessions={filteredSessions}
      sessionMeta={sessionMeta}
      selectedSessionId={selectedSessionId}
      searchKeyword={searchKeyword}
      setSearchKeyword={setSearchKeyword}
      sessionError={sessionError}
      loadingSessions={loadingSessions}
      editingSessionId={editingSessionId}
      editingTitle={editingTitle}
      setEditingSessionId={setEditingSessionId}
      setEditingTitle={setEditingTitle}
      renameSession={renameSession}
      removeSession={removeSession}
      setSelectedSessionId={setSelectedSessionId}
      onCreateSession={() => createSession().then(() => setHistoryOpen(false))}
      creatingSession={creatingSession}
      onSelectSession={() => setHistoryOpen(false)}
    />
  );

  return (
    <div
      className={`chat-page-shell chat-page-shell--reference ${isMobile ? "chat-page-shell--mobile" : ""}`}
      style={{ "--chat-font-scale": String(fontSize / 16) } as CSSProperties}
    >
      <div className={`chat-layout ${isMobile ? "chat-layout--mobile" : "chat-layout--desktop"}`}>
        {!isMobile && (
          <Card className="chat-sidebar-card chat-sidebar-card--reference" styles={{ body: { padding: 12, height: "100%" } }}>
            {historyContent}
          </Card>
        )}

        {selectedSessionId ? (
          loadingMessages ? (
            <div className="chat-loading-panel"><Spin size="large" /></div>
          ) : (
            <ConversationPanel
              key={selectedSessionId}
              sessionId={selectedSessionId}
              initialMessages={initialMessages}
              initialPrompt={pendingPrompt || undefined}
              selectedTitle={selectedSession?.title}
              isMobile={isMobile}
              onOpenHistory={() => setHistoryOpen(true)}
              onConversationChange={() => {
                setPendingPrompt("");
                loadSessions();
              }}
            />
          )
        ) : (
          <div className="chat-loading-panel"><Spin size="large" /></div>
        )}
      </div>

      {isMobile && (
        <Drawer
          title="历史对话"
          placement="left"
          width="82vw"
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          styles={{ body: { padding: 12 } }}
        >
          {historyContent}
        </Drawer>
      )}
    </div>
  );
}
