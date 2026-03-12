"use client";

import { Suspense } from "react";
import { Spin } from "antd";
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 80 }}><Spin /></div>}>
      <ChatWindow />
    </Suspense>
  );
}
