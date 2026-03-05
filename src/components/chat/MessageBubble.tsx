"use client";

import { Typography } from "antd";
import { RobotOutlined, UserOutlined } from "@ant-design/icons";
import type { UIMessage } from "ai";

const { Text } = Typography;

interface MessageBubbleProps {
  message: UIMessage;
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 16,
        gap: 8,
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#1677ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <RobotOutlined style={{ color: "#fff", fontSize: 20 }} />
        </div>
      )}

      <div
        style={{
          maxWidth: "75%",
          padding: "12px 16px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: isUser ? "#1677ff" : "#fff",
          color: isUser ? "#fff" : "#333",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          fontSize: 16,
          lineHeight: 1.8,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <Text style={{ color: isUser ? "#fff" : "#333", fontSize: 16 }}>
          {getMessageText(message)}
        </Text>
      </div>

      {isUser && (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#52c41a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <UserOutlined style={{ color: "#fff", fontSize: 20 }} />
        </div>
      )}
    </div>
  );
}
