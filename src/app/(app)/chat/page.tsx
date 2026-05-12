"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";

const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  ssr: false,
  loading: () => <div style={{ textAlign: "center", padding: 80 }}><Spin /></div>,
});

export default function ChatPage() {
  return (
    // ChatWindow 内部使用了 useSearchParams，外层用 Suspense 包一层，
    // 是 Next.js App Router 下处理异步导航状态的常见写法。
    <Suspense fallback={<div style={{ textAlign: "center", padding: 80 }}><Spin /></div>}>
      <ChatWindow />
    </Suspense>
  );
}
