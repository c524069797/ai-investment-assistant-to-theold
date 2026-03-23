"use client";

import { Typography } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";
import { sanitizeAssistantText } from "@/lib/chat/sanitize";

const { Text } = Typography;

interface MessageBubbleProps {
  message: UIMessage;
  fontSize?: number;
}

function getMessageText(message: UIMessage): string {
  return message.parts
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
