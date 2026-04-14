"use client";

import dynamic from "next/dynamic";
import { Typography } from "antd";

const CommentBoard = dynamic(() => import("@/components/comments/CommentBoard"), { ssr: false });

export default function BoardPage() {
  return (
    <main className="page-container">
      <div className="summary-card" style={{ padding: 20, marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>留言板</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginTop: 6 }}>
          无需 GitHub 登录，支持游客评论。用于反馈建议、问题与想法。
        </Typography.Paragraph>
      </div>
      <CommentBoard />
    </main>
  );
}

