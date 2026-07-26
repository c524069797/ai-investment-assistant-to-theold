"use client";

import { useMemo, useState } from "react";
import { Button, Empty, Pagination, Tag } from "antd";
import {
  CalendarOutlined,
  FireOutlined,
  LinkOutlined,
  MessageOutlined,
  RightOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import ChatHandoffLink from "@/components/chat/ChatHandoffLink";
import { stripMarkdown, truncateText } from "@/lib/markdown";

/**
 * 移动端的大V观点列表。
 *
 * 桌面端用 AntD Table（多列 + 虚拟滚动）在窄屏会把页面撑到 1000px 以上，
 * 横向滚动对适老化场景基本不可用，所以 <768px 换成纯卡片流：
 * 一屏一条、信息分层、操作按钮满足 44px 触控标准。
 */

export interface ExpertArticleItem {
  id: string;
  title: string;
  content: string;
  summary: string;
  sourceUrl?: string;
  primaryCategory: string;
  tags: string[];
  sentiment: string;
  score: number;
  publishedAt: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
    category: string;
  };
}

/**
 * 用泛型收窄到调用端的具体文章类型，这样页面传入的 buildPrompt
 * 可以直接吃完整的文章对象，不用为了适配组件而放宽签名。
 */
interface Props<T extends ExpertArticleItem> {
  articles: T[];
  /** 复用页面里的 AI 解读提示词构造逻辑，保持两端行为一致 */
  buildPrompt: (article: T) => string;
  sentimentLabel: (sentiment: string) => { text: string; color: string };
  pageSize?: number;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExpertArticleList<T extends ExpertArticleItem>({
  articles,
  buildPrompt,
  sentimentLabel,
  pageSize = 8,
}: Props<T>) {
  const [page, setPage] = useState(1);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return articles.slice(start, start + pageSize);
  }, [articles, page, pageSize]);

  if (!articles.length) {
    return <Empty description="暂无文章" />;
  }

  return (
    <div className="expert-list">
      {pageItems.map((article) => {
        const sentiment = sentimentLabel(article.sentiment);
        // summary 里也可能残留 ###、** 等 markdown 记号，统一清洗后再截断。
        const rawPreview = article.summary?.trim() || article.content;
        const preview = truncateText(stripMarkdown(rawPreview), 90);

        return (
          <article key={article.id} className="expert-list-card">
            <Link href={`/experts/${article.id}`} className="expert-list-card__headline">
              <h3 className="expert-list-card__title">{article.title}</h3>
              <RightOutlined className="expert-list-card__chevron" aria-hidden />
            </Link>

            <div className="expert-list-card__author">
              <span className="expert-list-card__avatar" aria-hidden>
                {article.author.avatar ?? "🧠"}
              </span>
              <span className="expert-list-card__author-name">{article.author.name}</span>
              <Tag color="purple" className="expert-list-card__author-tag">
                {article.author.category}
              </Tag>
            </div>

            {preview ? <p className="expert-list-card__summary">{preview}</p> : null}

            <div className="expert-list-card__meta">
              <Tag color="blue">{article.primaryCategory}</Tag>
              <Tag color={sentiment.color}>{sentiment.text}</Tag>
              <Tag icon={<FireOutlined />} color="volcano">
                {article.score}
              </Tag>
              <span className="expert-list-card__date">
                <CalendarOutlined aria-hidden /> {formatDate(article.publishedAt)}
              </span>
            </div>

            {article.tags.length ? (
              <div className="expert-list-card__tags">
                {article.tags.slice(0, 3).map((tag) => (
                  <Tag key={tag} className="expert-list-card__tag">
                    {tag}
                  </Tag>
                ))}
              </div>
            ) : null}

            <div className="expert-list-card__actions">
              <ChatHandoffLink
                title={`${article.author.name}观点解读`}
                prompt={buildPrompt(article)}
              >
                <Button type="primary" block icon={<MessageOutlined />}>
                  AI 解读
                </Button>
              </ChatHandoffLink>
              {article.sourceUrl ? (
                <a href={article.sourceUrl} target="_blank" rel="noreferrer">
                  <Button block icon={<LinkOutlined />}>
                    原文
                  </Button>
                </a>
              ) : null}
            </div>
          </article>
        );
      })}

      <div className="expert-list__pager">
        <Pagination
          simple
          current={page}
          pageSize={pageSize}
          total={articles.length}
          onChange={(next) => {
            setPage(next);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        <span className="expert-list__total">共 {articles.length} 篇</span>
      </div>
    </div>
  );
}
