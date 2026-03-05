"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { Button, Input, Space, Tag, Spin, Typography } from "antd";
import { SendOutlined, RobotOutlined } from "@ant-design/icons";
import { useRef, useEffect, useState, useMemo } from "react";
import MessageBubble from "./MessageBubble";

const { Text } = Typography;

const QUICK_QUESTIONS = [
  "今日大盘怎么样？",
  "帮我查查贵州茅台的行情",
  "什么是基金？",
  "投资股票风险大吗？",
  "推荐适合新手的基金类型",
  "帮我做个风险评估",
];

export default function ChatWindow() {
  const [threadId] = useState(() => `thread-${Date.now()}`);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/chat",
        body: { threadId },
      }),
    [threadId],
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleQuickQuestion = (question: string) => {
    sendMessage({ text: question });
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
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      {/* Messages Area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px",
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <RobotOutlined style={{ fontSize: 64, color: "#1677ff", marginBottom: 16 }} />
            <Typography.Title level={3}>您好！我是小智 🤖</Typography.Title>
            <Text style={{ fontSize: 16, color: "#666" }}>
              我是您的 AI 投资助手，可以帮您查行情、看基金、解答投资疑问。
              <br />
              请随时提问，或点击下面的快捷问题开始对话：
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

      {/* Input Area */}
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
