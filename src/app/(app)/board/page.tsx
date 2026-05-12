"use client";

import dynamic from "next/dynamic";
import { Typography } from "antd";
import MarketingVisual from "@/components/marketing/MarketingVisual";

const CommentBoard = dynamic(() => import("@/components/comments/CommentBoard"), { ssr: false });

export default function BoardPage() {
  return (
    <main className="page-container board-page">
      <div className="board-hero">
        <div className="board-hero__content">
          <span className="board-hero__eyebrow">Product Feedback</span>
          <Typography.Title level={2} className="board-hero__title">留言板</Typography.Title>
          <Typography.Paragraph className="board-hero__desc">
            用于提交功能建议、课程更新、大V观点补充和体验问题。留言会沉淀为后续产品优化线索。
          </Typography.Paragraph>
          <div className="board-hero__chips">
            <span>功能建议</span>
            <span>课程补充</span>
            <span>观点更新</span>
            <span>体验问题</span>
          </div>
        </div>
        <MarketingVisual
          alt="用户反馈与产品建议界面展示"
          className="board-hero__media"
          src="/marketing/hero-community.png"
          tone="compact"
        />
      </div>
      <CommentBoard />
    </main>
  );
}
