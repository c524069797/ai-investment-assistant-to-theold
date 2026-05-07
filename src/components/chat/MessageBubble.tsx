"use client";

import { Typography } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";
import { sanitizeAssistantText } from "@/lib/chat/sanitize";

// 这里把 AI SDK 的 UIMessage 渲染成聊天气泡：
// - 用户消息直接当纯文本展示
// - 助手消息走 react-markdown + remark-gfm，支持列表、表格、加粗等 Markdown 能力

const { Text } = Typography;

interface MessageBubbleProps {
  message: UIMessage;
  fontSize?: number;
}

function getMessageText(message: UIMessage): string {
  // AI SDK 的消息是 parts 数组，未来可扩展图片、工具调用结果等富内容。
  return message.parts
    // 这里是 TS 的“类型谓词”写法：
    // `part is Extract<...>` 告诉编译器，filter 之后的 part 一定是文本片段，
    // 所以后面的 `part.text` 才能获得安全的类型推断，而不是 unknown / never。
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export default function MessageBubble({ message, fontSize = 16 }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const text = getMessageText(message);
  const displayText = isUser ? text : sanitizeAssistantText(text);

  if (!isUser && !displayText) {
    return null;
  }

  return (
    <div className="tech-message-row" data-role={isUser ? "user" : "assistant"}>
      <div className="tech-message-bubble" data-role={isUser ? "user" : "assistant"}>
        {isUser ? (
          <Text style={{ color: "inherit", fontSize, whiteSpace: "pre-wrap", lineHeight: 1.75 }}>{displayText}</Text>
        ) : (
          <div className="markdown-body" style={{ color: "inherit", fontSize }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
